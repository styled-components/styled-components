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

    // Each instance should emit its own <style> tag
    const styleMatches = html.match(/<style/g);
    expect(styleMatches).toHaveLength(2);
    expect(html).toContain('body{margin:0;}');
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

    // Each instance should emit its own <style> tag with its own CSS
    expect(html).toContain('background:red;');
    expect(html).toContain('background:blue;');
    const styleMatches = html.match(/<style/g);
    expect(styleMatches).toHaveLength(2);
  });

  it('emits correct CSS across independent RSC render passes (no hydration)', () => {
    const GlobalStyle = createGlobalStyle<{ $size: string }>`
      html { font-size: ${props => props.$size}; }
    `;

    // Simulate three separate RSC requests — none will hydrate
    const html1 = ReactDOMServer.renderToString(<GlobalStyle $size="14px" />);
    const html2 = ReactDOMServer.renderToString(<GlobalStyle $size="16px" />);
    const html3 = ReactDOMServer.renderToString(<GlobalStyle $size="18px" />);

    // Each should produce correct, independent output
    expect(html1).toContain('font-size:14px;');
    expect(html2).toContain('font-size:16px;');
    expect(html3).toContain('font-size:18px;');

    // No cross-contamination — each render's output should only contain its own CSS
    expect(html1).not.toContain('16px');
    expect(html1).not.toContain('18px');
    expect(html2).not.toContain('14px');
    expect(html3).not.toContain('14px');
  });

  it('renders themed global style gracefully in RSC (theme is undefined)', () => {
    const GlobalStyle = createGlobalStyle`
      body { color: ${props => (props.theme && props.theme.color) || 'black'}; }
    `;

    // No ThemeProvider in RSC — theme is undefined, should not crash
    const html = ReactDOMServer.renderToString(<GlobalStyle />);
    expect(html).toContain('color:black;');
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

    // Both should emit their styles — global as data-styled-global, component via precedence
    expect(html).toContain('margin:0;');
    expect(html).toContain('color:red;');
    expect(html).toContain('data-styled-global');
  });
});
