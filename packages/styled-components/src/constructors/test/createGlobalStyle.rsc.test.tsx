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
});
