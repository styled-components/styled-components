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
  it('generates stable href without content hash for HMR deduplication', () => {
    const GlobalStyle = createGlobalStyle`
      body { background: red; }
    `;

    const html = ReactDOMServer.renderToString(<GlobalStyle />);

    // The href should be stable (componentId + instance only, no content hash)
    // This ensures React can deduplicate/replace styles during HMR
    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-khwQqP"
             precedence="styled-components"
             href="sc-global-khwQqP-1"
      >
        body{background:red;}/*!sc*/
      </style>
    `);
  });

  it('generates same href for same component regardless of dynamic content', () => {
    const GlobalStyle = createGlobalStyle<{ $color: string }>`
      body { background: ${props => props.$color}; }
    `;

    const html1 = ReactDOMServer.renderToString(<GlobalStyle $color="red" />);
    const html2 = ReactDOMServer.renderToString(<GlobalStyle $color="blue" />);

    // Same component should produce same href even with different prop values
    // Only the CSS content inside changes, not the href
    expect(html1).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD"
             precedence="styled-components"
             href="sc-global-kVtqfD-1"
      >
        body{background:red;}/*!sc*/
      </style>
    `);
    expect(html2).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD"
             precedence="styled-components"
             href="sc-global-kVtqfD-1"
      >
        body{background:blue;}/*!sc*/
      </style>
    `);
  });
});
