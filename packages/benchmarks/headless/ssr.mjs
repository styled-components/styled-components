/**
 * SSR benches across scale tiers (1, 10, 100, 1000 components per page).
 *
 * Cross-library: styled-components 6.4.1, styled-components v7, and
 * @emotion/styled. Each iteration constructs a styled component and runs
 * `renderToString` on a tree of N elements. SC variants use
 * `ServerStyleSheet` so the test mirrors a real Node server; emotion's
 * `renderToString` autodetects + emits `<style>` tags inline so no extra
 * extraction wrapper is needed.
 *
 * Components are created INSIDE each iteration, so creation cost stays in
 * the measurement (the lifecycle the user actually pays).
 */

process.env.NODE_ENV = 'production';

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { bench, group, run, summary, do_not_optimize } from 'mitata';
import v6Mod, { ServerStyleSheet as SheetV6 } from 'styled-components-v6';
import v7Mod, { ServerStyleSheet as SheetV7 } from 'styled-components';
import emotionMod from '@emotion/styled';
import { printTable } from './lib/print-table.mjs';

const v6 = v6Mod.default ?? v6Mod;
const v7 = v7Mod.default ?? v7Mod;
const emotion = emotionMod.default ?? emotionMod;

const N = (n) => Array.from({ length: n });

const renderSC = (lib, Sheet, n, uid) => {
  const C = lib.div`color: ${uid % 2 ? 'red' : 'blue'}; padding: 8px; --uid: ${uid};`;
  const sheet = new Sheet();
  const html = renderToString(
    sheet.collectStyles(
      createElement(
        'div',
        null,
        ...N(n).map((_, k) => createElement(C, { key: k, children: 'x' }))
      )
    )
  );
  return html + sheet.getStyleTags();
};

const renderEmotion = (n, uid) => {
  const C = emotion.div`color: ${uid % 2 ? 'red' : 'blue'}; padding: 8px; --uid: ${uid};`;
  return renderToString(
    createElement(
      'div',
      null,
      ...N(n).map((_, k) => createElement(C, { key: k, children: 'x' }))
    )
  );
};

const SCALES = [1, 10, 100, 1000];

summary(() => {
  for (const n of SCALES) {
    group(`SSR renderToString — ${n} components`, () => {
      let i = 0;
      bench('styled-components 6.4.1', () => {
        do_not_optimize(renderSC(v6, SheetV6, n, ++i));
      });
      bench('styled-components v7', () => {
        do_not_optimize(renderSC(v7, SheetV7, n, ++i));
      });
      bench('@emotion/styled', () => {
        do_not_optimize(renderEmotion(n, ++i));
      });
    });
  }
});

// Force `ms` across every scale tier so the comparison across N=1 / 10 /
// 100 / 1000 is on the same axis (otherwise mitata picks µs for the small
// tiers and ms for the large ones, making side-by-side reading harder).
const result = await run({ format: 'quiet' });
printTable(result, { unit: 'ms' });
