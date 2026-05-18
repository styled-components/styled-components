/**
 * RSC-mode emit at scale, styled-components v7 only.
 *
 * RSC mode is unique to v7. The server CJS build resolves `IS_RSC` at
 * runtime as `typeof React.createContext === 'undefined'`, so this
 * script removes `React.createContext` BEFORE importing SC, then puts it
 * back - switching v7 into the inline-`<style>` emission path that real
 * Server Components hit. Emotion and SC v6 don't have an equivalent, so
 * the cross-library row sits in `ssr.mjs`.
 */

process.env.NODE_ENV = 'production';

import React, { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { bench, group, run, summary, do_not_optimize } from 'mitata';
import { printTable } from './lib/print-table.mjs';

// Flip the runtime detector before SC's module body evaluates.
const realCreateContext = React.createContext;
delete React.createContext;
const v7Mod = await import('styled-components');
React.createContext = realCreateContext;
// `await import()` of a CJS module wraps `module.exports` under `.default`;
// the SC bundle then re-exposes its own default at `.default.default`.
const v7 = v7Mod.default?.default ?? v7Mod.default ?? v7Mod;

const N = n => Array.from({ length: n });

const renderRsc = (n, uid) => {
  const C = v7.div`color: ${uid % 2 ? 'red' : 'blue'}; padding: 8px; --uid: ${uid};`;
  return renderToString(
    createElement('div', null, ...N(n).map((_, k) => createElement(C, { key: k, children: 'x' })))
  );
};

const SCALES = [1, 10, 100, 1000];

summary(() => {
  for (const n of SCALES) {
    group(`RSC renderToString - ${n} components`, () => {
      let i = 0;
      bench('styled-components v7 (RSC)', () => {
        do_not_optimize(renderRsc(n, ++i));
      });
    });
  }
});

// Same `ms`-everywhere treatment as `ssr.mjs` so the scale-tier rows are
// directly comparable; otherwise mitata picks µs for the small tiers.
const result = await run({ format: 'quiet' });
printTable(result, { unit: 'ms' });
