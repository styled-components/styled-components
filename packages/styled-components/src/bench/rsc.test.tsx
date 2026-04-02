/**
 * RSC rendering benchmarks for styled-components.
 *
 * Run: pnpm --filter styled-components bench:rsc
 *
 * Measures server-side renderToString performance with IS_RSC=true,
 * including inline style tag emission, dedup, :where() wrapping,
 * and keyframe handling.
 */

// Mock React.cache — scoped per render via manual clear
const mockCacheStore = new Map<Function, any>();

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    cache: (fn: Function) => () => {
      if (!mockCacheStore.has(fn)) mockCacheStore.set(fn, fn());
      return mockCacheStore.get(fn);
    },
  };
});

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  IS_RSC: true,
}));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import styled, { keyframes, createGlobalStyle } from '../index';

const { performance } = require('perf_hooks');
const gc = typeof globalThis.gc === 'function' ? globalThis.gc : null;

function bench(name: string, iterations: number, fn: (i: number) => void): number {
  if (gc) gc();

  const warmup = Math.min(Math.max(iterations / 10, 10), 200);
  for (let i = 0; i < warmup; i++) fn(i);

  const samples: number[] = [];
  const RUNS = 5;
  for (let run = 0; run < RUNS; run++) {
    if (gc) gc();
    // Reset per-render caches between iterations
    mockCacheStore.clear();
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      mockCacheStore.clear();
      fn(i);
    }
    samples.push(performance.now() - t0);
  }

  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(RUNS / 2)];
  const ops = (iterations / median) * 1000;
  const opsStr =
    ops >= 1e6
      ? (ops / 1e6).toFixed(1) + 'M/s'
      : ops >= 1e3
        ? (ops / 1e3).toFixed(1) + 'K/s'
        : ops.toFixed(0) + '/s';
  const spread = (((samples[RUNS - 1] - samples[0]) / median) * 100).toFixed(0);
  console.log(
    `  ${name.padEnd(55)} ${median.toFixed(1).padStart(8)}ms  ${opsStr.padStart(10)}  ±${spread}%`
  );
  return median;
}

describe('RSC benchmarks', () => {
  it('React baseline (renderToString without SC)', () => {
    console.log('\n--- React renderToString baseline (1K iterations, median of 5) ---');

    bench('plain div', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement('div', null, 'hello'));
    });

    bench('div with className + style', 1_000, () => {
      ReactDOMServer.renderToString(
        React.createElement('div', { className: 'sc-a b', style: undefined }, 'hello')
      );
    });

    // forwardRef wrapper (same component shape as SC without style logic)
    const Wrapper = React.forwardRef<HTMLDivElement, { children?: React.ReactNode }>((props, ref) =>
      React.createElement('div', { ref, className: 'sc-a b', ...props })
    );

    bench('forwardRef wrapper', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Wrapper, null, 'hello'));
    });

    bench('10 plain divs', 1_000, () => {
      const children = [];
      for (let j = 0; j < 10; j++) {
        children.push(React.createElement('div', { key: j }, 'item'));
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });

    bench('50 plain divs', 1_000, () => {
      const children = [];
      for (let j = 0; j < 50; j++) {
        children.push(React.createElement('div', { key: j }, 'item'));
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });
  });

  it('single component renderToString', () => {
    console.log('\n--- Single component renderToString (1K iterations, median of 5) ---');

    const Static = styled.div`
      color: red;
      padding: 16px;
      border: 1px solid blue;
    `;

    bench('static component', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Static, null, 'hello'));
    });

    const Dynamic = styled.div<{ $color: string }>`
      color: ${p => p.$color};
      padding: 16px;
      border: 1px solid blue;
    `;

    const colors = ['red', 'blue', 'green', 'orange', 'purple'];
    bench('dynamic component (5 color variants)', 1_000, i => {
      ReactDOMServer.renderToString(
        React.createElement(Dynamic, { $color: colors[i % colors.length] }, 'hello')
      );
    });

    const WithAttrs = styled.div.attrs({ role: 'button', tabIndex: 0 })`
      color: red;
      cursor: pointer;
    `;

    bench('component with attrs', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(WithAttrs, null, 'click'));
    });
  });

  it('inheritance chains', () => {
    console.log('\n--- Inheritance chains (1K iterations, median of 5) ---');

    const Base = styled.div`
      padding: 16px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
    `;

    const Extended = styled(Base)`
      background: blue;
      color: white;
    `;

    bench('1-level extension', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Extended, null, 'hello'));
    });

    const Deep = styled(Extended)`
      font-size: 20px;
      font-weight: bold;
    `;

    bench('2-level extension', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Deep, null, 'hello'));
    });

    bench('3 sibling extensions of same base', 1_000, () => {
      const A = styled(Base)`
        color: red;
      `;
      const B = styled(Base)`
        color: blue;
      `;
      const C = styled(Base)`
        color: green;
      `;
      ReactDOMServer.renderToString(
        React.createElement(
          'div',
          null,
          React.createElement(A, null, '1'),
          React.createElement(B, null, '2'),
          React.createElement(C, null, '3')
        )
      );
    });
  });

  it('dedup efficiency', () => {
    console.log('\n--- Dedup (1K iterations, median of 5) ---');

    const Item = styled.div`
      color: red;
      padding: 8px;
    `;

    bench('10 identical static components', 1_000, () => {
      const children = [];
      for (let j = 0; j < 10; j++) {
        children.push(React.createElement(Item, { key: j }, 'item'));
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });

    bench('50 identical static components', 1_000, () => {
      const children = [];
      for (let j = 0; j < 50; j++) {
        children.push(React.createElement(Item, { key: j }, 'item'));
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });

    const DynItem = styled.div<{ $color: string }>`
      color: ${p => p.$color};
      padding: 8px;
    `;

    const dynColors = [
      'red',
      'blue',
      'green',
      'orange',
      'purple',
      'cyan',
      'magenta',
      'yellow',
      'pink',
      'teal',
    ];

    bench('50 dynamic components cycling 10 colors', 1_000, () => {
      const children = [];
      for (let j = 0; j < 50; j++) {
        children.push(
          React.createElement(DynItem, { key: j, $color: dynColors[j % dynColors.length] }, 'item')
        );
      }
      ReactDOMServer.renderToString(React.createElement('div', null, ...children));
    });
  });

  it('keyframes', () => {
    console.log('\n--- Keyframes (1K iterations, median of 5) ---');

    const spin = keyframes`
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    `;

    const Spinner = styled.div`
      animation: ${spin} 1s linear infinite;
      width: 24px;
      height: 24px;
    `;

    bench('component with keyframes', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(Spinner));
    });

    const fade = keyframes`
      0% { opacity: 1; }
      100% { opacity: 0; }
    `;

    const FadeA = styled.div`
      animation: ${fade} 1s;
    `;
    const FadeB = styled.span`
      animation: ${fade} 2s;
    `;

    bench('2 components sharing 1 keyframe', 1_000, () => {
      ReactDOMServer.renderToString(
        React.createElement(
          'div',
          null,
          React.createElement(FadeA, null, 'a'),
          React.createElement(FadeB, null, 'b')
        )
      );
    });
  });

  it('global styles', () => {
    console.log('\n--- GlobalStyle (1K iterations, median of 5) ---');

    const GlobalStatic = createGlobalStyle`
      body { margin: 0; font-family: system-ui; }
      *, *::before, *::after { box-sizing: border-box; }
    `;

    bench('static global style', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(GlobalStatic));
    });

    bench('3 instances of same static global (dedup)', 1_000, () => {
      ReactDOMServer.renderToString(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(GlobalStatic),
          React.createElement(GlobalStatic),
          React.createElement(GlobalStatic)
        )
      );
    });

    const GlobalDynamic = createGlobalStyle<{ $bg: string }>`
      body { background: ${p => p.$bg}; }
    `;

    bench('dynamic global style', 1_000, () => {
      ReactDOMServer.renderToString(React.createElement(GlobalDynamic, { $bg: 'red' }));
    });
  });

  it('realistic page', () => {
    console.log('\n--- Realistic page (500 iterations, median of 5) ---');

    const Container = styled.div`
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px;
    `;
    const Title = styled.h1`
      font-size: 32px;
      color: #111;
      margin-bottom: 16px;
    `;
    const Card = styled.div`
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
    `;
    const CardTitle = styled.h3`
      font-size: 16px;
      margin-bottom: 8px;
    `;
    const CardText = styled.p`
      font-size: 14px;
      color: #6b7280;
    `;
    const Badge = styled.span<{ $variant: 'ok' | 'warn' | 'error' }>`
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 13px;
      background: ${p =>
        p.$variant === 'ok' ? '#dcfce7' : p.$variant === 'warn' ? '#fef3c7' : '#fee2e2'};
      color: ${p =>
        p.$variant === 'ok' ? '#166534' : p.$variant === 'warn' ? '#92400e' : '#991b1b'};
    `;
    const pulse = keyframes`
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    `;
    const Dot = styled.div`
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #16a34a;
      animation: ${pulse} 2s infinite;
    `;
    const Global = createGlobalStyle`
      body { margin: 0; font-family: system-ui; }
    `;

    const variants: Array<'ok' | 'warn' | 'error'> = ['ok', 'warn', 'error'];

    bench('20 cards + badges + keyframes + global', 500, () => {
      const cards = [];
      for (let j = 0; j < 20; j++) {
        cards.push(
          React.createElement(
            Card,
            { key: j },
            React.createElement(CardTitle, null, 'Card ' + j),
            React.createElement(CardText, null, 'Description text'),
            React.createElement(Badge, { $variant: variants[j % 3] }, variants[j % 3]),
            j === 0 ? React.createElement(Dot) : null
          )
        );
      }
      ReactDOMServer.renderToString(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Global),
          React.createElement(
            Container,
            null,
            React.createElement(Title, null, 'Dashboard'),
            ...cards
          )
        )
      );
    });
  });

  it('output size', () => {
    console.log('\n--- Output size ---');

    const Card = styled.div`
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
    `;
    const Badge = styled.span<{ $variant: string }>`
      color: ${p => p.$variant};
      padding: 4px 8px;
    `;

    const colors = ['red', 'blue', 'green', 'orange', 'purple'];

    mockCacheStore.clear();
    const children = [];
    for (let j = 0; j < 50; j++) {
      children.push(
        React.createElement(
          Card,
          { key: j },
          React.createElement(Badge, { $variant: colors[j % colors.length] }, 'tag')
        )
      );
    }
    const html = ReactDOMServer.renderToString(React.createElement('div', null, ...children));

    const styleTags = (html.match(/<style[^>]*>/g) || []).length;
    const styleBytes = (html.match(/<style[^>]*>.*?<\/style>/gs) || []).reduce(
      (sum, tag) => sum + tag.length,
      0
    );
    const totalBytes = html.length;

    console.log(`  50 cards with 5 badge variants:`);
    console.log(`    Style tags: ${styleTags}`);
    console.log(`    Style bytes: ${styleBytes}`);
    console.log(`    Total HTML: ${totalBytes}`);
    console.log(`    Style overhead: ${((styleBytes / totalBytes) * 100).toFixed(1)}%`);
  });
});
