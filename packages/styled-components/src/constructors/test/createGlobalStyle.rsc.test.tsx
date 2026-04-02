/**
 * @jest-environment node
 */

// Mock IS_RSC before importing the module
jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  IS_RSC: true,
}));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import createGlobalStyle from '../createGlobalStyle';

describe('createGlobalStyle RSC mode', () => {
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
        body{background:red;}/*!sc*/
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
        body{background:red;}/*!sc*/
      </style>
    `);
    expect(html2).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD">
        body{background:blue;}/*!sc*/
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
        body{margin:0;}/*!sc*/
      </style>
      <style data-styled-global="sc-global-yXuMc">
        body{margin:0;}/*!sc*/
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
        body{background:red;}/*!sc*/
      </style>
      <style data-styled-global="sc-global-kVtqfD">
        body{background:blue;}/*!sc*/
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
        html{font-size:14px;}/*!sc*/
      </style>
    `);
    expect(html2).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-fLdnMX">
        html{font-size:16px;}/*!sc*/
      </style>
    `);
    expect(html3).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-fLdnMX">
        html{font-size:18px;}/*!sc*/
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
        body{color:black;}/*!sc*/
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
        body{margin:0;}/*!sc*/
      </style>
      <style data-styled>
        .eBSjvc{color:red;}/*!sc*/
      </style>
      <h1 class="sc-kqxcKS eBSjvc">
        Hello
      </h1>
    `);
  });
});
