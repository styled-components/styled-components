/**
 * @jest-environment node
 */
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ServerStyleSheet from '../../models/ServerStyleSheet';
import { stripComments, stripWhitespace } from '../../test/utils';
import createGlobalStyle from '../createGlobalStyle';

describe(`createGlobalStyle`, () => {
  let context: ReturnType<typeof setup>;

  function setup() {
    return {
      renderToString(comp: React.JSX.Element) {
        return ReactDOMServer.renderToString(comp);
      },
    };
  }

  beforeEach(() => {
    context = setup();
  });

  it(`injects global <style> when rendered to string`, () => {
    const sheet = new ServerStyleSheet();
    const Component = createGlobalStyle`[data-test-inject]{color:red;} `;
    const html = context.renderToString(sheet.collectStyles(<Component />));
    const styles = stripOuterHTML(sheet.getStyleTags());

    expect(html).toBe('');
    expect(stripWhitespace(stripComments(styles))).toMatchInlineSnapshot(
      `"[data-test-inject]{ color:red; } data-styled.g1[id="sc-global-a1"]{ content:"sc-global-a1,"} "`
    );
  });
});

function stripOuterHTML(html: string) {
  return html.replace(/<[^>]*>([^<]*)<[^>]*>/g, '$1');
}
