/**
 * Real React Flight rendering for server-component tests. A test file using this
 * helper declares the `react-server` export condition in its docblock so that
 * `react` resolves to its server build and `IS_RSC` is true without mocking:
 *
 *   @jest-environment node
 *   @jest-environment-options {"customExportConditions": ["react-server", "node", "node-addons"]}
 */
import { createElement, type ReactNode } from 'react';
import { Writable } from 'stream';
// Node's own: a jsdom test environment has no global `TextDecoder`.
import { TextDecoder } from 'util';

type FlightServer = {
  createClientModuleProxy: (moduleId: string) => Record<string, unknown>;
  createTemporaryReferenceSet: () => object;
  decodeReply: (
    body: string,
    manifest: object,
    options: { temporaryReferences: object }
  ) => PromiseLike<unknown>;
  registerClientReference: <T extends object>(proxy: T, id: string, name: string) => T;
  renderToPipeableStream: (
    model: ReactNode,
    manifest: object,
    options: { onError: (error: unknown) => string }
  ) => { pipe: (sink: Writable) => void };
};

/** Loaded on first use: the server entry throws unless `react` resolves to its server build, and the two-graph harness imports this file without that. */
const flightServer = (): FlightServer => require('react-server-dom-webpack/server.node');

/** The start of every client-reference module id the harness makes. */
export const CLIENT_MODULE_PREFIX = 'client/';

/** The `styled-components/server-styles` exports, which a host's bundler serves as client references. */
export const SERVER_STYLES_EXPORTS = ['ScGlobalStyle', 'ScStyle'] as const;

/** A component Flight serializes as a reference to client code (the body never runs on the server). */
export function clientComponent<Props extends object>(name: string): (props: Props) => ReactNode {
  const proxy = (): ReactNode => {
    throw new Error(`client component "${name}" was called on the server`);
  };

  return flightServer().registerClientReference(proxy, CLIENT_MODULE_PREFIX + name, 'default');
}

/** A `jest.mock('styled-components/server-styles', …)` factory: every export as a client reference. */
export function serverStylesAsClientReferences(): Record<string, unknown> {
  return Object.fromEntries(SERVER_STYLES_EXPORTS.map(name => [name, clientComponent(name)]));
}

/** What a bundler hands a server component for an import of a `'use client'` module: an object whose named properties are that module's client references. */
export function clientModule(moduleId: string): Record<string, unknown> {
  return flightServer().createClientModuleProxy(moduleId);
}

/** How many paragraphs {@link Filler} renders. */
export const FILLER_PARAGRAPHS = 150;

/**
 * Renders far more than the 3200 bytes after which Flight defers the remaining elements of a row,
 * so an element placed after it lands in a later row.
 */
export const Filler = (): ReactNode =>
  createElement(
    'div',
    null,
    Array.from({ length: FILLER_PARAGRAPHS }, (_, index) =>
      createElement(
        'p',
        { key: index },
        `Filler paragraph number ${index} of lorem ipsum dolor sit amet`
      )
    )
  );

/** A temporary reference as a server-action reply delivers one: a value from the client that the server can only pass back. */
export async function temporaryReference(): Promise<unknown> {
  const flight = flightServer();
  const decoded = await flight.decodeReply(
    '{"value":"$T"}',
    {},
    {
      temporaryReferences: flight.createTemporaryReferenceSet(),
    }
  );

  return typeof decoded === 'object' && decoded !== null ? Reflect.get(decoded, 'value') : decoded;
}

/** What a probe element carried. */
export type Probe = {
  /** The probe element's whole `className`. */
  className: string;
  /**
   * The rule text the `ScStyle` rendered right before the probe carries: referenced keyframes, then
   * each level of its chain, base first. Null when no `ScStyle` precedes the probe or it carries no rules.
   */
  css: string | null;
  /** Props of the probe element as serialized (what reached the host element). */
  props: Record<string, unknown>;
  /** Id of the payload row the probe element was serialized in ("0" is the root row). */
  row: string;
};

export type FlightResult = {
  /** Props of each client-reference element, with server output resolved inline; an element's nested client elements come before it. */
  clientProps: Record<string, unknown>[];
  /** Every error Flight reported while rendering. */
  errors: string[];
  /** The rule text each `ScGlobalStyle` carries (its rules, then its keyframes), in payload order. */
  globals: string[];
  /** The raw payload text. */
  payload: string;
  /** Probe elements by their `data-probe` value. */
  probes: Record<string, Probe>;
};

const textDecoder = new TextDecoder();

/** Splits a payload into rows by id; text rows (`id:T<hex length>,<bytes>`) hold raw bytes, every other row is one line. */
function parseRows(payload: Buffer): Map<string, unknown> {
  const rows = new Map<string, unknown>();
  const streams = new Set<string>();
  let at = 0;

  while (at < payload.length) {
    const colon = payload.indexOf(0x3a, at);
    const id = payload.toString('utf8', at, colon);
    const tag = String.fromCharCode(payload[colon + 1]);

    if (tag === 'T') {
      const comma = payload.indexOf(0x2c, colon + 2);
      const length = parseInt(payload.toString('utf8', colon + 2, comma), 16);
      rows.set(id, textDecoder.decode(payload.subarray(comma + 1, comma + 1 + length)));
      at = comma + 1 + length;
      continue;
    }

    let end = payload.indexOf(0x0a, colon);
    if (end === -1) end = payload.length;

    if (end === colon + 1) {
      // A row id Flight reserved for a component that suspended (a lazy type) and never wrote.
    } else if (tag === 'x') {
      // An async iterable starts a row that every later row with the same id adds one yielded value to.
      streams.add(id);
      rows.set(id, []);
    } else if (!/[A-Z]/.test(tag)) {
      // Uppercase tags are control rows (debug, import, hint, timing); JSON rows start with a JSON token.
      const value = JSON.parse(payload.toString('utf8', colon + 1, end));
      const streamed = streams.has(id) ? rows.get(id) : undefined;
      if (Array.isArray(streamed)) streamed.push(value);
      else rows.set(id, value);
    }
    at = end + 1;
  }

  return rows;
}

const REFERENCE = /^\$(?:L|@)?([0-9a-f]+)((?::[0-9a-z_]+)*)$/;

type ElementModel = [string, string | null, string | null, Record<string, unknown>, ...unknown[]];

function isElementModel(value: unknown): value is ElementModel {
  return Array.isArray(value) && value[0] === '$' && typeof value[3] === 'object';
}

/** Follows every reference in the payload from the root row, collecting probes, client elements and globals. */
function collect(
  rows: Map<string, unknown>
): Pick<FlightResult, 'clientProps' | 'globals' | 'probes'> {
  const clientProps: Record<string, unknown>[] = [];
  const globals: string[] = [];
  const probes: Record<string, Probe> = {};
  const seenRows = new Set<string>();
  const seenObjects = new WeakSet<object>();

  /** A reference is `$<row>`, optionally followed by `:key` steps into that row's value. */
  const deref = (value: unknown): { row: string; target: unknown } | undefined => {
    const match = typeof value === 'string' ? REFERENCE.exec(value) : null;
    if (!match || !rows.has(match[1])) return undefined;

    let target = rows.get(match[1]);
    for (const key of match[2].split(':').filter(Boolean)) {
      target = typeof target === 'object' && target !== null ? Reflect.get(target, key) : undefined;
    }

    return { row: match[1], target };
  };

  /** A value as sent, or the value a reference to an earlier part of the payload stands for. */
  const resolve = (value: unknown): unknown => {
    const found = deref(value);

    return found ? resolve(found.target) : value;
  };

  /** The joined text of a rules array. */
  const rulesText = (value: unknown): string => {
    const rules = resolve(value);

    return Array.isArray(rules) ? rules.map(resolve).join('') : '';
  };

  /** The joined rules of each `[id, name, rules, ...]` entry of a chain or keyframes list, in order. */
  const levelsText = (value: unknown): string => {
    const levels = resolve(value);

    return Array.isArray(levels)
      ? levels
          .map(level => {
            const fields = resolve(level);

            return Array.isArray(fields) ? rulesText(fields[2]) : '';
          })
          .join('')
      : '';
  };

  /** The props of an element carrying `prop`, where the element may be a reference to one sent earlier. */
  const propsWith = (value: unknown, prop: string): Record<string, unknown> | undefined => {
    const element = resolve(value);

    return isElementModel(element) && prop in element[3] ? element[3] : undefined;
  };

  const visit = (value: unknown, row: string): void => {
    if (typeof value === 'string') {
      const found = deref(value);
      if (!found) return;

      // Only a reference to a whole row marks it seen; a path into a row visits just that part.
      if (!value.includes(':')) {
        if (seenRows.has(found.row)) return;
        seenRows.add(found.row);
      }

      visit(found.target, found.row);
      return;
    }

    if (typeof value !== 'object' || value === null || seenObjects.has(value)) return;
    seenObjects.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const label = isElementModel(item) ? item[3]['data-probe'] : undefined;
        if (typeof label === 'string') {
          // A server styled instance renders its `ScStyle` right before its element.
          const style = index > 0 ? propsWith(value[index - 1], 'chain') : undefined;
          const css = style ? levelsText(style.keyframes) + levelsText(style.chain) : '';

          probes[label] = {
            className: String(item[3].className),
            css: css === '' ? null : css,
            props: item[3],
            row,
          };
        }
        visit(item, row);
      });
      if (isElementModel(value) && typeof value[1] === 'string' && value[1].startsWith('$L')) {
        clientProps.push(value[3]);

        // Of the style elements, only `ScGlobalStyle` carries `seq` at the top of its props.
        const props = value[3];
        if ('seq' in props) globals.push(rulesText(props.rules) + levelsText(props.keyframes));
      }
      return;
    }

    for (const item of Object.values(value)) visit(item, row);
  };

  visit(rows.get('0'), '0');

  return { clientProps, globals, probes };
}

/** Reads a whole payload: its probes, client elements and global styles. */
export function readFlightPayload(payload: Buffer, errors: string[]): FlightResult {
  return { errors, payload: payload.toString('utf8'), ...collect(parseRows(payload)) };
}

/** The props of one `ScStyle` element in a payload. */
export type StyleProps = {
  chain: Array<[string, string, string[], number]>;
  keyframes: unknown[];
  outers: string[];
};

/**
 * The props of every style component the payload sends, ordered so a test need not know Flight's
 * row order. A rules array Flight already sent is a reference to its row on the next level that
 * carries it; it is read back as the array.
 */
export function styleProps({ clientProps }: FlightResult): StyleProps[] {
  type Sent = { chain: Array<[string, string, string[] | string, number]> } & Omit<
    StyleProps,
    'chain'
  >;

  const all = clientProps.filter(
    (props): props is Sent & Record<string, unknown> => 'chain' in props
  );
  const sent = new Map<string, string[]>();

  for (const { chain } of all) {
    for (const [id, name, rules] of chain) {
      if (Array.isArray(rules)) sent.set(id + ' ' + name, rules);
    }
  }

  return all
    .map(({ chain, keyframes, outers }) => ({
      chain: chain.map(([id, name, rules, seq]): StyleProps['chain'][number] => [
        id,
        name,
        Array.isArray(rules) ? rules : (sent.get(id + ' ' + name) ?? []),
        seq,
      ]),
      keyframes,
      outers,
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

/** Renders `tree` with the real Flight server and returns the probes found in the payload. */
export function renderFlight(tree: ReactNode): Promise<FlightResult> {
  return new Promise(resolve => {
    const chunks: Buffer[] = [];
    const errors: string[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _encoding, done) {
        chunks.push(chunk);
        done();
      },
    });
    // Every client reference resolves to a fake bundler entry.
    const manifest = new Proxy(
      {},
      { get: (_target, key) => ({ chunks: [], id: String(key), name: 'default' }) }
    );

    sink.on('finish', () => {
      resolve(readFlightPayload(Buffer.concat(chunks), errors));
    });

    flightServer()
      .renderToPipeableStream(tree, manifest, {
        onError: error => {
          errors.push(error instanceof Error ? error.message : String(error));

          return '';
        },
      })
      .pipe(sink);
  });
}
