/**
 * @jest-environment node
 */

// Mock React.cache (not available in React 18 test env, but needed for RSC dedup)
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

  it('renders multiple instances of the same static global style in one tree', () => {
    const GlobalStyle = createGlobalStyle`
      body { margin: 0; }
    `;

    // Two instances in one render — simulates a non-hydrating RSC page
    // where the same global style appears in multiple server components
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
    `);
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

    // Simulate three separate RSC requests — none will hydrate
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

    // No ThemeProvider in RSC — theme is undefined, should not crash
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
