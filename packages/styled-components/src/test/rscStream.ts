import React, { type ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'stream';
import { RSC_REDUNDANT_EMIT_WARN_THRESHOLD } from '../constants';

/** The text of every `<style>` tag in rendered HTML, in document order. */
export const styleTags = (html: string): string[] =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]);

/** Every `<style>` tag's rule text in rendered HTML, joined. */
export const extractStyleContents = (html: string): string => styleTags(html).join('');

/** The number of `<style>` tags in rendered HTML. */
export const countStyleTags = (html: string): number => styleTags(html).length;

/** The classes of the element with `id`, or of the first element that is not a `<style>` when `id` is omitted. */
export function classesOf(html: string, id?: string): string[] {
  const element =
    id === undefined
      ? /<(?!style)[a-z][^>]*? class="[^"]*"[^>]*>/.exec(html)
      : new RegExp(`<(?!style)[a-z]+(?=[^>]* id="${id}")[^>]*>`).exec(html);
  const classes = element === null ? null : /class="([^"]*)"/.exec(element[0]);
  if (classes === null) throw new Error(`no element ${id ?? 'with a class'} in ${html}`);

  return classes[1].split(' ');
}

/** Whether a class carries an element's styles, as opposed to a component id (`sc-xxxx`, or `Name-sc-xxxx` with a build plugin). */
export const isGeneratedClass = (name: string): boolean => !name.includes('sc-');

/** The class an element's styles hang on: the last one, after its component ids. */
export function generatedClass(html: string, id?: string): string {
  const classes = classesOf(html, id);

  return classes[classes.length - 1];
}

/** The class a style tag's first rule (`.name{...}`) targets: a wrapper's class, when the tag is the wrapper's own. */
export function firstRuleClass(tag: string): string {
  const match = /^\.(\w+)\{/.exec(tag);
  if (match === null) throw new Error(`no class at the start of ${tag}`);

  return match[1];
}

/** Marks `target` the way a bundler marks a reference to client code, so React treats it as one. */
export function fakeClientReference<Target extends object>(
  target: Target,
  fields: Record<string, unknown> = {}
): Target {
  return Object.assign(target, { $$typeof: Symbol.for('react.client.reference'), ...fields });
}

/** What a styled component's render function returns when it emits a tag: the tag, then the element. */
type RenderedWithTag = ReactElement<{ children: ReactElement[] }>;

/**
 * Run a memoized component's own render function inside a real render and
 * hand the `<style>` element it produced to `sink`. A render function that
 * returns an element, not a tree of host nodes, is what lets a test see the
 * element object itself.
 */
function probeRender<Props extends object, Rendered extends React.ReactNode>(
  Component: React.ExoticComponent<Props>,
  props: Props,
  takeStyle: (rendered: Rendered) => ReactElement,
  sink: ReactElement[]
): ReactElement {
  const { type: render } = Component as React.ExoticComponent<Props> & {
    type: (props: Props) => Rendered;
  };
  const Probe = () => {
    const rendered = render(props);
    sink.push(takeStyle(rendered));

    return rendered;
  };

  return React.createElement(Probe);
}

/** {@link probeRender} for a styled component, whose render returns a fragment holding the tag first. */
export const renderInProbe = <Props extends object>(
  Component: React.ExoticComponent<Props>,
  props: Props,
  sink: ReactElement[]
): ReactElement =>
  probeRender<Props, RenderedWithTag>(
    Component,
    props,
    rendered => rendered.props.children[0],
    sink
  );

/**
 * {@link probeRender} for a global style, whose render returns the tag
 * array-wrapped: React's server-component serializer references a whole
 * element inside an array but only the props of a bare one.
 */
export const renderGlobalInProbe = <Props extends object>(
  Component: React.ExoticComponent<Props>,
  props: Props,
  sink: ReactElement[]
): ReactElement =>
  probeRender<Props, ReactElement[]>(
    Component,
    props,
    rendered => {
      expect(Array.isArray(rendered)).toBe(true);
      expect(rendered).toHaveLength(1);

      return rendered[0];
    },
    sink
  );

/**
 * Registers the redundant-emit warning tests inside the caller's `describe`.
 * `renderMany(count)` renders `count` instances of one fresh style and returns
 * the warning text expected once the threshold is reached.
 */
export function itWarnsOnRedundantEmits(options: {
  marker: string;
  renderMany: (count: number) => string;
}): void {
  const { marker, renderMany } = options;
  const warnings = (warn: jest.SpyInstance) =>
    warn.mock.calls.filter(([msg]) => typeof msg === 'string' && msg.includes(marker));

  it('warns once when one style reaches the instance threshold in development', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const expected = renderMany(RSC_REDUNDANT_EMIT_WARN_THRESHOLD + 5);

      expect(warnings(warn)).toHaveLength(1);
      expect(warnings(warn)[0][0]).toBe('[sc] ' + expected);
    } finally {
      warn.mockRestore();
    }
  });

  it('stays quiet below the threshold', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      renderMany(RSC_REDUNDANT_EMIT_WARN_THRESHOLD - 1);

      expect(warnings(warn)).toHaveLength(0);
    } finally {
      warn.mockRestore();
    }
  });

  it('stays quiet in production', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (global as { __DEV__: boolean }).__DEV__ = false;

    try {
      renderMany(RSC_REDUNDANT_EMIT_WARN_THRESHOLD + 5);

      expect(warnings(warn)).toHaveLength(0);
    } finally {
      (global as { __DEV__: boolean }).__DEV__ = true;
      warn.mockRestore();
    }
  });
}

type StreamedRender = {
  /** Every byte React streamed: the shell with fallbacks, then the resolved content and reveal scripts. */
  streamed: string;
  /** The markup the browser holds after React's reveal scripts ran: each resolved boundary replaces its fallback. */
  revealed: string;
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
 * non-nested boundaries, which is all the suites need.
 */
export function renderStreamed(tree: ReactElement): Promise<StreamedRender> {
  return new Promise((resolve, reject) => {
    let streamed = '';
    const sink = new Writable({
      write(chunk, _encoding, done) {
        streamed += chunk;
        done();
      },
      final(done) {
        done();
        resolve({ streamed, revealed: reveal(streamed) });
      },
    });
    const stream = renderToPipeableStream(tree, {
      onError: reject,
      onShellError: reject,
      onShellReady() {
        stream.pipe(sink);
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
