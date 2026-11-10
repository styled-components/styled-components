import path from 'path';
import React, { type ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough, Writable } from 'stream';
import * as timers from 'timers';
import { TextDecoder, TextEncoder } from 'util';
import { SPLITTER } from '../constants';
import {
  CLIENT_MODULE_PREFIX,
  type FlightResult,
  readFlightPayload,
  SERVER_STYLES_EXPORTS,
} from './flight';

/** The text of every `<style>` tag in rendered HTML, in document order. */
export const styleTags = (html: string): string[] =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]);

/** The classes of the element with `id`, or of the first element with a class when `id` is omitted. */
export function classesOf(html: string, id?: string): string[] {
  const element =
    id === undefined
      ? /<(?!style)[a-z][^>]*? class="[^"]*"[^>]*>/.exec(html)
      : new RegExp(`<(?!style)[a-z]+(?=[^>]* id="${id}")[^>]*>`).exec(html);
  const classes = element === null ? null : /class="([^"]*)"/.exec(element[0]);
  if (classes === null) throw new Error(`no element ${id ?? 'with a class'} in ${html}`);

  return classes[1].split(' ');
}

/** The class an element's styles hang on: the last one, after its component ids. */
export function generatedClass(html: string, id?: string): string {
  const classes = classesOf(html, id);

  return classes[classes.length - 1];
}

export type StreamedRender = {
  /** Each piece React wrote, in order. */
  chunks: string[];
  /** The markup the browser holds after React's reveal scripts ran: each resolved boundary replaces its fallback. */
  revealed: string;
  /** What had been written when `afterShell` ran: the shell with its fallbacks. The whole stream when there is no `afterShell`. */
  shell: string;
  /** Every byte React streamed: the shell with fallbacks, then the resolved content and reveal scripts. */
  streamed: string;
};

type StreamOptions = {
  /** Runs once the shell is written; a late boundary waits on whatever this releases. */
  afterShell?: () => void | Promise<void>;
  /** Called after each piece React writes. */
  onWrite?: () => void;
  /** React's server renderer; the one from the test file's own module registry by default. */
  render?: typeof renderToPipeableStream;
  /** Puts a stage (a sheet's `interleaveWithNodeStream`) between React's stream and the output. */
  through?: (stream: ReturnType<typeof renderToPipeableStream>) => {
    pipe: (destination: Writable) => unknown;
  };
};

/**
 * Wait one macrotask, so an async component stays suspended while the shell
 * (with its Suspense fallbacks) streams out first.
 */
export const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 5));

/**
 * Stream a tree through Fizz and fold each completed boundary into the shell
 * the way React's reveal script does in the browser: the fallback between a
 * boundary's `<template id="B:n">` marker and its closing `<!--/$-->` is
 * replaced by the resolved `<div hidden id="S:n">` content. Handles
 * non-nested boundaries, which is all the suites need. `afterShell` is the
 * forced flush: it runs once the shell has been written, so whatever it
 * releases arrives in a later piece.
 */
export function renderStreamed(
  tree: ReactElement,
  options: StreamOptions = {}
): Promise<StreamedRender> {
  const { afterShell, onWrite, render = renderToPipeableStream, through } = options;

  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    let shell: string | undefined;
    const sink = new Writable({
      write(chunk, _encoding, done) {
        chunks.push(String(chunk));
        done();
        onWrite?.();
      },
      final(done) {
        const streamed = chunks.join('');

        done();
        resolve({ chunks, revealed: reveal(streamed), shell: shell ?? streamed, streamed });
        onWrite?.();
      },
    });
    const stream = render(tree, {
      onError: reject,
      onShellError: reject,
      onShellReady() {
        (through ? through(stream) : stream).pipe(sink);

        if (!afterShell) return;

        // Two macrotasks: the pipe and any stage after it write on the next one.
        setImmediate(() =>
          setImmediate(() => {
            shell = chunks.join('');
            Promise.resolve(afterShell()).catch(reject);
          })
        );
      },
    });
  });
}

const SEGMENT_OPEN = '<div hidden id="S:';
/* A completed segment always closes right before its reveal script, so this
   terminator keeps a nested `</div>` inside the content from ending it early. */
const SEGMENT_CLOSE = '</div><script';
const BOUNDARY_END = '<!--/$-->';

function reveal(streamed: string): string {
  const segments = new Map<string, string>();
  let shell = '';
  let from = 0;

  for (;;) {
    const start = streamed.indexOf(SEGMENT_OPEN, from);
    if (start === -1) {
      shell += streamed.slice(from);
      break;
    }

    const idEnd = streamed.indexOf('">', start);
    const close = streamed.indexOf(SEGMENT_CLOSE, idEnd);
    segments.set(
      streamed.slice(start + SEGMENT_OPEN.length, idEnd),
      streamed.slice(idEnd + 2, close)
    );
    shell += streamed.slice(from, start);
    from = close + '</div>'.length;
  }

  let html = removeScripts(shell);

  for (const [id, content] of segments) {
    const start = html.indexOf('<template id="B:' + id + '"></template>');
    const end = start === -1 ? -1 : html.indexOf(BOUNDARY_END, start);
    if (end === -1) continue;

    html = html.slice(0, start) + content + html.slice(end + BOUNDARY_END.length);
  }

  return html;
}

/** Drops every `<script>…</script>` span (React's reveal instructions), any casing. */
function removeScripts(html: string): string {
  const lower = html.toLowerCase();
  let out = '';
  let from = 0;

  for (;;) {
    const start = lower.indexOf('<script', from);
    if (start === -1) return out + html.slice(from);

    out += html.slice(from, start);
    const end = lower.indexOf('</script>', start);
    if (end === -1) return out;

    from = end + '</script>'.length;
  }
}

/*
 * The two-graph harness. A server component host evaluates the library in three
 * module graphs (the RSC graph, the SSR graph, the browser), each with its own
 * copy of React and of every module, and the graphs meet only through Flight
 * (the RSC graph's output, a stream) and HTML. `renderPage` runs all three in
 * one process, each in its own `jest.isolateModules` registry:
 *
 *   RSC graph  --Flight-->  SSR graph (Fizz, a request sheet)  --HTML-->  browser (JSDOM)
 *
 * A test file using it declares `@jest-environment node`: the browser is a JSDOM
 * window installed as globals only while browser code runs.
 */

/** The library as one module graph holds it. */
export type Library = typeof import('../index');

type ReactCopy = typeof React;
type Component = React.JSXElementConstructor<never>;

/** Client components by name: defined in the SSR and browser graphs, references in the RSC graph. */
type ClientModules = Record<string, Component>;

type FlightServer = {
  registerClientReference: <T extends object>(proxy: T, id: string, name: string) => T;
  renderToPipeableStream: (
    model: React.ReactNode,
    manifest: object,
    options: { onError: (error: unknown) => string }
  ) => { pipe: (sink: Writable) => void };
};

type FlightClient = {
  createFromNodeStream: (stream: PassThrough, manifest: object) => PromiseLike<React.ReactNode>;
};

type GraphKind = 'browser' | 'rsc' | 'ssr';

type GraphOptions = {
  /** Loads the library inside a graph's registry: the source entry by default; a test of built bundles passes its own per graph. */
  loadLibrary?: (graph: GraphKind) => Library;
};

type BrowserWindow = Window & typeof globalThis & { close: () => void };

/** What a graph's registry holds once its modules are loaded. */
export type RscGraph = {
  flight: FlightServer;
  library: Library;
  react: ReactCopy;
};

export type SsrGraph = {
  client: FlightClient;
  library: Library;
  react: ReactCopy;
  server: typeof import('react-dom/server');
};

export type BrowserGraph = {
  client: FlightClient;
  library: Library;
  react: ReactCopy;
  reactDom: typeof import('react-dom/client');
};

/** The module the host's bundler treats as a client boundary: it holds the style components the server build renders. */
export const SERVER_STYLES_MODULE = 'styled-components/server-styles';

const sourceLibrary = (): Library => require('../index');

/** Runs `load` in a fresh module registry and returns what it returns. */
function inFreshRegistry<Loaded>(load: () => Loaded): Loaded {
  const loaded: Loaded[] = [];

  jest.isolateModules(() => {
    loaded.push(load());
  });

  return loaded[0];
}

const reactServerBuild = (name: 'react' | 'react-dom'): object => {
  const base = name === 'react' ? 'react.react-server' : 'react-dom.react-server';
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  return require(
    path.join(path.dirname(require.resolve(`${name}/package.json`)), 'cjs', `${base}.${mode}.js`)
  );
};

/** Loads the library as a server component host's RSC graph holds it: React's server build, and the shim's exports as client references. */
export function loadRscGraph(options: GraphOptions = {}): RscGraph {
  const { loadLibrary = sourceLibrary } = options;
  const mocked = ['react', 'react-dom', SERVER_STYLES_MODULE];

  try {
    return inFreshRegistry(() => {
      jest.doMock('react', () => reactServerBuild('react'));
      jest.doMock('react-dom', () => reactServerBuild('react-dom'));

      const flight: FlightServer = require('react-server-dom-webpack/server.node');

      jest.doMock(SERVER_STYLES_MODULE, () =>
        Object.fromEntries(
          SERVER_STYLES_EXPORTS.map(name => [
            name,
            clientReference(flight, SERVER_STYLES_MODULE, name),
          ])
        )
      );

      return { flight, library: loadLibrary('rsc'), react: require('react') };
    });
  } finally {
    for (const name of mocked) jest.dontMock(name);
  }
}

/** Loads the library as the SSR graph holds it: React's regular build, Fizz, and the Flight client that decodes the RSC graph's stream. */
export function loadSsrGraph(options: GraphOptions = {}): SsrGraph {
  const { loadLibrary = sourceLibrary } = options;

  return inFreshRegistry(() => ({
    client: require('react-server-dom-webpack/client.node'),
    library: loadLibrary('ssr'),
    react: require('react'),
    server: require('react-dom/server'),
  }));
}

/** A component the RSC graph serializes as a reference to client code: its body never runs there. */
function clientReference(flight: FlightServer, moduleId: string, exportName: string): Component {
  const proxy = (): React.ReactNode => {
    throw new Error(`client component "${moduleId}#${exportName}" was called on the server`);
  };

  return flight.registerClientReference(proxy, moduleId, exportName);
}

/** What the RSC graph's page gets for `clients`: a reference per name, created on first read. */
function referencesTo<Clients extends ClientModules>(flight: FlightServer): Clients {
  const references = new Map<string, Component>();
  const proxy = new Proxy(
    {},
    {
      get(_target, name) {
        if (typeof name !== 'string') return undefined;

        const known =
          references.get(name) ?? clientReference(flight, CLIENT_MODULE_PREFIX + name, 'default');
        references.set(name, known);

        return known;
      },
    }
  );

  return proxy as Clients;
}

/** The server renderer's table of client modules: `$$id` is `<module>#<export>`. */
const producerManifest = new Proxy(
  {},
  {
    get(_target, key) {
      const id = String(key);
      const hash = id.lastIndexOf('#');

      return { chunks: [], id: id.slice(0, hash), name: id.slice(hash + 1) };
    },
  }
);

/** A Flight client's table of client modules, resolving each from `modules` through `__webpack_require__`. */
const consumerManifest = {
  moduleLoading: null,
  moduleMap: new Proxy(
    {},
    {
      get: (_target, moduleId) =>
        new Proxy({}, { get: (_names, name) => ({ chunks: [], id: moduleId, name }) }),
    }
  ),
  serverModuleMap: null,
};

/** The exports of the client module `moduleId` in a graph. */
function exportsOf(
  moduleId: string,
  graph: { library: Library },
  clients: ClientModules
): Record<string, unknown> {
  if (moduleId === SERVER_STYLES_MODULE) {
    return Object.fromEntries(
      SERVER_STYLES_EXPORTS.map(name => [name, Reflect.get(graph.library, name)])
    );
  }

  return { default: clients[moduleId.slice(CLIENT_MODULE_PREFIX.length)] };
}

/** Sets a global and returns the undo, which deletes the global again when it was absent. */
function setGlobal(name: string, value: unknown): () => void {
  const present = Object.getOwnPropertyDescriptor(globalThis, name) !== undefined;
  const previous = Reflect.get(globalThis, name);

  Reflect.set(globalThis, name, value);

  return () => {
    if (present) Reflect.set(globalThis, name, previous);
    else Reflect.deleteProperty(globalThis, name);
  };
}

/** Runs `step` with `__webpack_require__` resolving client modules, the way a host's bundler runtime would. */
async function withClientModules<Result>(
  resolve: (moduleId: string) => Record<string, unknown>,
  step: () => Promise<Result>
): Promise<Result> {
  const restore = setGlobal('__webpack_require__', resolve);

  try {
    return await step();
  } finally {
    restore();
  }
}

/** Late boundaries wait on a gate and the harness opens it after the shell is written (or the page does, by name). */
export type Gates = {
  /** Opens a gate and resolves once the render writes the next piece. */
  release: (name: string) => Promise<void>;
  /** Opens every gate. */
  releaseAll: () => void;
  /** Resolves once the gate is open; for an async server component to await. */
  wait: (name: string) => Promise<void>;
};

/** `startOpen` makes every gate open on creation, for a render that has no shell to flush first. */
function createGates(nextWrite: () => Promise<void>, startOpen = false): Gates {
  const gates = new Map<string, { open: () => void; opened: Promise<void> }>();
  const gate = (name: string) => {
    const known = gates.get(name);
    if (known) return known;

    let open = () => {};
    const opened = new Promise<void>(resolve => {
      open = resolve;
    });
    const created = { open, opened };

    if (startOpen) open();
    gates.set(name, created);

    return created;
  };

  return {
    release(name) {
      const written = nextWrite();

      gate(name).open();

      return written;
    },
    releaseAll() {
      for (const { open } of gates.values()) open();
    },
    wait: name => gate(name).opened,
  };
}

export type ServerGraph<Clients extends ClientModules> = {
  /** A reference to each client component, by the name the `clients` option gave it. */
  clients: Clients;
  gates: Gates;
  library: Library;
  react: ReactCopy;
};

export type ClientGraph = { library: Library; react: ReactCopy };

export type PageOptions<Clients extends ClientModules> = GraphOptions & {
  /** Runs once the shell has been written (the forced flush); opens every gate by default. */
  afterShell?: (gates: Gates) => void | Promise<void>;
  /** Defines the client components. Runs in the SSR graph and again in the browser graph, each time with that graph's library. */
  clients?: (graph: ClientGraph) => Clients;
  /** The page as the RSC graph renders it. */
  server: (graph: ServerGraph<Clients>) => React.ReactNode;
};

export type BrowserPage = {
  /** The page's document after hydration. */
  document: Document;
  graph: BrowserGraph;
  /** Errors React recovered from while hydrating: a hydration mismatch lands here. */
  recoverableErrors: string[];
  /** Releases the window. */
  close: () => void;
  /** The text of every rule in the document's style sheets, in order. */
  rules: () => string[];
  /** Runs `step` with the page's window installed as globals, for a render after hydration. */
  run: <Result>(step: (graph: BrowserGraph) => Result | Promise<Result>) => Promise<Result>;
  window: BrowserWindow;
};

export type Page = StreamedRender & {
  /** The streamed HTML as a document, with the registry's tags where the stream put them. */
  document: string;
  /** What the RSC graph sent: its payload text, errors and client element props. */
  flight: FlightResult;
  /** Loads the browser graph into a JSDOM window holding the HTML, runs React's reveal scripts, and hydrates. */
  hydrate: () => Promise<BrowserPage>;
};

const documentOf = (body: string): string =>
  `<!DOCTYPE html><html><head></head><body>${body}</body></html>`;

type JsdomConstructor = new (
  html: string,
  options: { pretendToBeVisual: boolean; runScripts?: 'dangerously'; url: string }
) => { window: BrowserWindow };

/** `jsdom` is the test environment's own dependency, so it resolves from there. */
function loadJsdom(): JsdomConstructor {
  const jsdomPath = require.resolve('jsdom', {
    paths: [require.resolve('jest-environment-jsdom')],
  });

  return require(jsdomPath).JSDOM;
}

/** Installs a window's properties as globals (without replacing Node's own) and the flags the browser build reads. Returns the undo. */
function installBrowser(window: BrowserWindow): () => void {
  const installed = Object.getOwnPropertyNames(window).filter(name => !(name in globalThis));
  const restores = [setGlobal('__SERVER__', false), setGlobal('IS_REACT_ACT_ENVIRONMENT', true)];

  for (const name of installed) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get: () => Reflect.get(window, name),
    });
  }

  return () => {
    for (const name of installed) Reflect.deleteProperty(globalThis, name);
    for (const restore of restores) restore();
  };
}

async function withBrowser<Result>(
  window: BrowserWindow,
  step: () => Promise<Result>
): Promise<Result> {
  const uninstall = installBrowser(window);

  try {
    return await step();
  } finally {
    uninstall();
  }
}

const wait = (milliseconds: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

/** Waits for React's reveal scripts to move every completed boundary out of its hidden segment. */
async function waitForReveal(window: BrowserWindow): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (window.document.querySelector('[id^="S:"]') === null) return;

    await wait(10);
  }

  throw new Error('React did not reveal the streamed boundaries in the window.');
}

function loadBrowserGraph(options: GraphOptions): BrowserGraph {
  const { loadLibrary = sourceLibrary } = options;

  return inFreshRegistry(() => ({
    client: require('react-server-dom-webpack/client.node'),
    library: loadLibrary('browser'),
    react: require('react'),
    reactDom: require('react-dom/client'),
  }));
}

/** The rule text of every `<style>` tag in rendered HTML, without the group markers a server tag carries. */
export const serverRules = (html: string): string[] =>
  styleTags(html).flatMap(tag =>
    tag.split(SPLITTER).filter(rule => rule !== '' && !rule.startsWith('data-styled.g'))
  );

/** The computed value of `property` on the first element matching `selector`, from the style sheets of the markup (scripts off) or of a document. */
export function computedValue(
  source: string | Document,
  selector: string,
  property: string
): string {
  const document =
    typeof source === 'string'
      ? new (loadJsdom())(documentOf(source), {
          pretendToBeVisual: false,
          url: 'http://localhost/',
        }).window.document
      : source;
  const element = document.querySelector(selector);
  if (element === null) throw new Error(`no element matches ${selector}`);

  return (document.defaultView as Window).getComputedStyle(element).getPropertyValue(property);
}

/**
 * Renders a page through the three graphs. The RSC graph renders `server` to a
 * Flight stream; the SSR graph decodes it and streams HTML through a request
 * sheet (`ServerStyleSheet`), so the registry's tags land in the HTML the way a
 * host's insertion hook puts them; `hydrate` then loads the browser graph into a
 * window holding that HTML and hydrates from the same payload.
 */
export async function renderPage<Clients extends ClientModules = ClientModules>(
  options: PageOptions<Clients>
): Promise<Page> {
  const rsc = loadRscGraph(options);
  const ssr = loadSsrGraph(options);
  const defineClients = options.clients ?? (() => ({}) as Clients);
  const ssrClients = defineClients(ssr);

  const writeWaiters: (() => void)[] = [];
  const nextWrite = () => new Promise<void>(resolve => writeWaiters.push(resolve));
  const gates = createGates(nextWrite);
  const tree = options.server({
    clients: referencesTo<Clients>(rsc.flight),
    gates,
    library: rsc.library,
    react: rsc.react,
  });

  const flight = startFlight(rsc, tree);
  const { createElement, use } = ssr.react;
  const sheet = new ssr.library.ServerStyleSheet();

  const streamed = await withClientModules(
    moduleId => exportsOf(moduleId, ssr, ssrClients),
    async () => {
      const model = ssr.client.createFromNodeStream(flight.stream, consumerManifest);
      const Root = () => use(model);

      flight.start();

      const rendered = await renderStreamed(
        sheet.collectStyles(createElement('div', { id: 'root' }, createElement(Root))),
        {
          afterShell: () => (options.afterShell ?? (({ releaseAll }) => releaseAll()))(gates),
          onWrite: () => writeWaiters.splice(0).forEach(resolve => resolve()),
          render: ssr.server.renderToPipeableStream,
          through: stream => sheet.interleaveWithNodeStream(stream),
        }
      );

      await flight.ended;

      return rendered;
    }
  );

  const payload = flight.payload();

  return {
    ...streamed,
    document: documentOf(streamed.streamed),
    flight: readFlightPayload(payload, flight.errors),
    hydrate: () => hydratePage(documentOf(streamed.streamed), payload, options),
  };
}

/** The RSC graph rendering `tree` to a Flight stream. A reader attaches to `stream` before `start`. */
function startFlight(rsc: RscGraph, tree: React.ReactNode) {
  const errors: string[] = [];
  const chunks: Buffer[] = [];
  const stream = new PassThrough();
  const ended = new Promise<void>(resolve => stream.on('end', resolve));

  stream.on('data', (chunk: Buffer) => chunks.push(chunk));

  return {
    ended,
    errors,
    payload: () => Buffer.concat(chunks),
    start: () =>
      rsc.flight
        .renderToPipeableStream(tree, producerManifest, {
          onError: error => {
            errors.push(error instanceof Error ? error.message : String(error));

            return '';
          },
        })
        .pipe(stream),
    stream,
  };
}

/** Decodes a Flight `payload` in a browser graph and hands the root component to `mount`, with client modules resolving from `clients`. */
async function decodeInBrowser(
  graph: BrowserGraph,
  clients: ClientModules,
  payload: Buffer,
  mount: (Root: () => React.ReactNode) => void | Promise<void>
): Promise<void> {
  const stream = new PassThrough();

  stream.end(payload);

  await withClientModules(
    moduleId => exportsOf(moduleId, graph, clients),
    async () => {
      const model = graph.client.createFromNodeStream(stream, consumerManifest);

      // Resolved first: `act` does not wait on a thenable it cannot see.
      await model;
      await graph.react.act(() => mount(() => graph.react.use(model)));
    }
  );
}

export type BrowserRender = {
  container: HTMLElement;
  /** What the RSC graph sent. */
  flight: FlightResult;
  graph: BrowserGraph;
};

/**
 * For a test file whose own environment is jsdom (the dist tests): the RSC graph
 * renders `server`, and a browser graph renders the decoded payload with
 * `createRoot` into the file's own document, with no SSR graph between. Late
 * boundaries are not staged: every gate starts open.
 */
export async function renderInBrowser<Clients extends ClientModules = ClientModules>(
  options: PageOptions<Clients>
): Promise<BrowserRender> {
  const restores = [provideNodeGlobals(), setGlobal('IS_REACT_ACT_ENVIRONMENT', true)];

  try {
    const rsc = loadRscGraph(options);
    const graph = loadBrowserGraph(options);
    const clients = options.clients ? options.clients(graph) : {};
    const gates = createGates(() => Promise.resolve(), true);
    const flight = startFlight(
      rsc,
      options.server({
        clients: referencesTo<Clients>(rsc.flight),
        gates,
        library: rsc.library,
        react: rsc.react,
      })
    );
    const container = document.createElement('div');

    document.body.appendChild(container);
    flight.start();
    await flight.ended;

    await decodeInBrowser(graph, clients, flight.payload(), Root => {
      graph.reactDom.createRoot(container).render(graph.react.createElement(Root));
    });

    return { container, flight: readFlightPayload(flight.payload(), flight.errors), graph };
  } finally {
    for (const restore of restores) restore();
  }
}

/** A jsdom test environment lacks the Node globals the Flight server and client read. */
function provideNodeGlobals(): () => void {
  const node = {
    clearImmediate: timers.clearImmediate,
    setImmediate: timers.setImmediate,
    TextDecoder,
    TextEncoder,
  };
  const restores = Object.entries(node)
    .filter(([name]) => !(name in globalThis))
    .map(([name, value]) => setGlobal(name, value));

  return () => {
    for (const restore of restores) restore();
  };
}

/** Hydrates `html` in a window with the browser graph, from the RSC graph's `payload`. */
async function hydratePage<Clients extends ClientModules>(
  html: string,
  payload: Buffer,
  options: PageOptions<Clients>
): Promise<BrowserPage> {
  const window = new (loadJsdom())(html, {
    pretendToBeVisual: true,
    runScripts: 'dangerously',
    url: 'http://localhost/',
  }).window;
  const recoverableErrors: string[] = [];

  await waitForReveal(window);

  // The library loads inside the window's globals: its sheet adopts the HTML's tags at load.
  const graph = await withBrowser(window, async () => {
    const browser = loadBrowserGraph(options);
    const clients = options.clients ? options.clients(browser) : {};
    const container = window.document.getElementById('root');
    if (container === null) throw new Error('the streamed HTML has no #root element');

    await decodeInBrowser(browser, clients, payload, Root => {
      browser.reactDom.hydrateRoot(container, browser.react.createElement(Root), {
        onRecoverableError: error => {
          recoverableErrors.push(error instanceof Error ? error.message : String(error));
        },
      });
    });

    return browser;
  });

  return {
    close: () => window.close(),
    document: window.document,
    graph,
    recoverableErrors,
    rules: () =>
      Array.from(window.document.styleSheets).flatMap(sheet =>
        Array.from(sheet.cssRules, rule => rule.cssText)
      ),
    run: step => withBrowser(window, async () => step(graph)),
    window,
  };
}
