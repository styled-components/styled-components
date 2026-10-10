import React, { type ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'stream';
import { RSC_REDUNDANT_EMIT_WARN_THRESHOLD } from '../constants';

/** Every `<style>` tag's rule text in rendered HTML, joined. */
export const extractStyleContents = (html: string): string =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('');

/** The number of `<style>` tags in rendered HTML. */
export const countStyleTags = (html: string): number => (html.match(/<style[^>]*>/g) || []).length;

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

function reveal(streamed: string): string {
  /* A completed segment always closes right before its reveal script, so the
     lookahead keeps a nested `</div>` inside the content from ending it early. */
  const segmentPattern = /<div hidden id="S:(\d+)">([\s\S]*?)<\/div>(?=<script)/g;
  const segments = [...streamed.matchAll(segmentPattern)];
  let html = streamed.replace(segmentPattern, '').replace(/<script[\s\S]*?<\/script>/g, '');

  for (const [, id, content] of segments) {
    html = html.replace(
      new RegExp('<template id="B:' + id + '"></template>[\\s\\S]*?<!--/\\$-->'),
      () => content
    );
  }

  return html;
}
