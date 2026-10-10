import type { ReactElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { Writable } from 'stream';

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
