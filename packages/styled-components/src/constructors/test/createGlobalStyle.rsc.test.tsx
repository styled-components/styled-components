/**
 * @jest-environment node
 */

// Mock React.cache (not available in React 18 test env, but needed for
// StyleSheetManager's per-render reset; see docs/rsc-style-injection.md)
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

// Mock IS_RSC before importing the module
jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  IS_RSC: true,
}));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import createGlobalStyle from '../createGlobalStyle';

describe('createGlobalStyle RSC mode', () => {
  beforeEach(() => {
    mockCacheStore.clear();
  });
  it('renders style tag without precedence so it can be unmounted', () => {
    const GlobalStyle = createGlobalStyle`
      body { background: red; }
    `;

    const html = ReactDOMServer.renderToString(<GlobalStyle />);

    // Global styles must NOT use `precedence` because React 19 treats
    // precedence styles as permanent resources that persist after unmount.
    // This would break conditional global styles (e.g. body lock on modal).
    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-khwQqP">
        body{background:red;}
      </style>
    `);
  });

  it('renders dynamic global styles without precedence', () => {
    const GlobalStyle = createGlobalStyle<{ $color: string }>`
      body { background: ${props => props.$color}; }
    `;

    const html1 = ReactDOMServer.renderToString(<GlobalStyle $color="red" />);
    const html2 = ReactDOMServer.renderToString(<GlobalStyle $color="blue" />);

    // Same component should produce same key even with different prop values
    expect(html1).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD">
        body{background:red;}
      </style>
    `);
    expect(html2).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD">
        body{background:blue;}
      </style>
    `);
  });

  it('renders one tag per instance of the same static global style in one tree', () => {
    const GlobalStyle = createGlobalStyle`
      body { margin: 0; }
    `;

    // Two instances in one render - simulates a non-hydrating RSC page
    // where the same global style appears in multiple server components
    // (e.g. a Suspense fallback and the resolved content, or an async layout
    // and its page). Each instance carries its own tag: a request-scoped
    // dedup ledger would drop the wrong one when React discards a fallback's
    // DOM on reveal (#5808's failure mode for createGlobalStyle).
    const html = ReactDOMServer.renderToString(
      <>
        <GlobalStyle />
        <GlobalStyle />
      </>
    );

    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-yXuMc">
        body{margin:0;}
      </style>
      <style data-styled-global="sc-global-yXuMc">
        body{margin:0;}
      </style>
    `);
  });

  it('renders one tag per instance of a dynamic global style even with identical props', () => {
    const GlobalStyle = createGlobalStyle<{ $bg: string }>`
      body { background: ${props => props.$bg}; }
    `;

    // Per-instance emission: each instance emits its own tag, even when
    // props (and the resulting CSS) are identical to another instance's.
    const html = ReactDOMServer.renderToString(
      <>
        <GlobalStyle $bg="red" />
        <GlobalStyle $bg="red" />
      </>
    );

    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD">
        body{background:red;}
      </style>
      <style data-styled-global="sc-global-kVtqfD">
        body{background:red;}
      </style>
    `);
  });

  it('keeps a global style self-contained across a Suspense boundary (#5808)', () => {
    // The failure this guards against: a global style rendered in a Suspense
    // fallback recorded itself in a request-scoped ledger; the resolved
    // content then emitted nothing because the ledger already held the key,
    // and React discarded the fallback (tag and all) on reveal, leaving the
    // page with no global styles at all. renderToString can't model the
    // reveal itself, but the invariant that prevents the bug is that every
    // instance is self-contained: fallback and resolved content each carry
    // their own tag within the same request-scoped React.cache, so neither
    // depends on the other surviving.
    const GlobalStyle = createGlobalStyle`
      body { background: papayawhip; }
    `;

    // Both renders share the same mocked React.cache scope (mockCacheStore is
    // only cleared in beforeEach), simulating one request where a Suspense
    // fallback renders before the resolved content.
    const fallback = ReactDOMServer.renderToString(<GlobalStyle />);
    const resolved = ReactDOMServer.renderToString(<GlobalStyle />);

    expect(fallback).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-HzwfG">
        body{background:papayawhip;}
      </style>
    `);
    expect(resolved).toBe(fallback);
  });

  it('renders multiple instances with different dynamic props in one tree', () => {
    const GlobalStyle = createGlobalStyle<{ $bg: string }>`
      body { background: ${props => props.$bg}; }
    `;

    const html = ReactDOMServer.renderToString(
      <>
        <GlobalStyle $bg="red" />
        <GlobalStyle $bg="blue" />
      </>
    );

    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD">
        body{background:red;}
      </style>
      <style data-styled-global="sc-global-kVtqfD">
        body{background:blue;}
      </style>
    `);
  });

  it('emits correct CSS across independent RSC render passes (no hydration)', () => {
    const GlobalStyle = createGlobalStyle<{ $size: string }>`
      html { font-size: ${props => props.$size}; }
    `;

    // Simulate three separate RSC requests - none will hydrate
    const html1 = ReactDOMServer.renderToString(<GlobalStyle $size="14px" />);
    const html2 = ReactDOMServer.renderToString(<GlobalStyle $size="16px" />);
    const html3 = ReactDOMServer.renderToString(<GlobalStyle $size="18px" />);

    expect(html1).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-fLdnMX">
        html{font-size:14px;}
      </style>
    `);
    expect(html2).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-fLdnMX">
        html{font-size:16px;}
      </style>
    `);
    expect(html3).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-fLdnMX">
        html{font-size:18px;}
      </style>
    `);
  });

  it('renders themed global style gracefully in RSC (theme is undefined)', () => {
    const GlobalStyle = createGlobalStyle`
      body { color: ${props => (props.theme && props.theme.color) || 'black'}; }
    `;

    // No ThemeProvider in RSC - theme is undefined, should not crash
    const html = ReactDOMServer.renderToString(<GlobalStyle />);
    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-ekSA-DU">
        body{color:black;}
      </style>
    `);
  });

  it('renders global style and styled component in the same RSC tree', () => {
    const styled = require('../styled').default;

    const GlobalStyle = createGlobalStyle`
      body { margin: 0; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const html = ReactDOMServer.renderToString(
      <>
        <GlobalStyle />
        <Heading>Hello</Heading>
      </>
    );

    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-yXuMc">
        body{margin:0;}
      </style>
      <style data-styled>
        .eBSjvc{color:red;}
      </style>
      <h1 class="sc-kqxcKS eBSjvc">
        Hello
      </h1>
    `);
  });
});
