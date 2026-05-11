import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import ServerStyleSheet from '../../models/ServerStyleSheet';
import { resetStyled } from '../../test/utils';
import extractCSS from '../extractCSS';

describe('extractCSS', () => {
  let styled: ReturnType<typeof resetStyled>;

  beforeEach(() => {
    styled = resetStyled();
  });

  it('returns empty string when no styles are registered', () => {
    expect(extractCSS()).toBe('');
  });

  it('returns the rendered CSS for components mounted to the main sheet', () => {
    const Heading = styled.h1`
      color: red;
    `;
    const Body = styled.p`
      color: blue;
    `;

    render(
      <>
        <Heading>Hi</Heading>
        <Body>There</Body>
      </>
    );

    expect(extractCSS()).toMatchInlineSnapshot(`
      ".c {color: red;}/*!sc*/
      .d {color: blue;}/*!sc*/
      "
    `);
  });

  it('returns rules for components rendered into the main sheet', () => {
    const Comp = styled.div`
      padding: 8px;
    `;
    render(<Comp />);

    expect(extractCSS()).toMatchInlineSnapshot(`
      ".b {padding: 8px;}/*!sc*/
      "
    `);
  });

  it('escapes `</style>` substrings in interpolations so the result is safe to inject into a host `<style>` tag', () => {
    const Comp = styled.div<{ $bg: string }>`
      color: ${p => p.$bg};
    `;
    render(<Comp $bg={'</style>'} />);

    const css = extractCSS();
    expect(css.toLowerCase()).not.toContain('</style');
    expect(css).toContain('\\3C/style');
  });

  it('extracts CSS from a custom ServerStyleSheet without rehydration markers', () => {
    // Documented contract: output is plain CSS without the rehydration markers
    // that ServerStyleSheet#getStyleTags adds (SC_ATTR / SC_ATTR_VERSION /
    // data-styled.g group markers), so the result is safe to inject directly
    // into another document or stamp into a cloned DOM tree.
    const Heading = styled.h1`
      color: tomato;
    `;
    const sheet = new ServerStyleSheet();
    renderToStaticMarkup(sheet.collectStyles(<Heading>x</Heading>));

    expect(extractCSS(sheet.instance)).toMatchInlineSnapshot(`
      ".b {color: tomato;}/*!sc*/
      "
    `);
  });
});
