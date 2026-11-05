/**
 * @jest-environment node
 */
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import GlobalStyle, { liveInstanceCount } from '../../models/GlobalStyle';
import ServerStyleSheet from '../../models/ServerStyleSheet';
import { mainStylis } from '../../models/StyleSheetManager';
import StyleSheet from '../../sheet';
import { STATIC_EXECUTION_CONTEXT } from '../../constants';
import { stripComments, stripWhitespace } from '../../test/utils';
import createGlobalStyle from '../createGlobalStyle';
import css from '../css';

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
      `"[data-test-inject]{ color:red; } data-styled.g1[id="sc-global-a"]{ content:"sc-global-a1,"} "`
    );
  });

  it(`should not emit useLayoutEffect warning during SSR`, () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const sheet = new ServerStyleSheet();
    const Component = createGlobalStyle`body { background: red; }`;
    context.renderToString(sheet.collectStyles(<Component />));

    // Check that useLayoutEffect warning was not emitted
    const useLayoutEffectWarning = consoleErrorSpy.mock.calls.find(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('useLayoutEffect'))
    );
    expect(useLayoutEffectWarning).toBeUndefined();

    consoleErrorSpy.mockRestore();
  });
  it(`preserves dynamic global styles when same instance renders after clearTag`, () => {
    // Regression test: the Next.js registry calls clearTag() between page
    // prerenders. When the same instance number is reused (via WeakMap caching
    // per StyleSheet), the rulesEqual fast-path must not skip rebuildGroup
    // after clearTag destroyed the tag - otherwise CSS is lost.

    // A dynamic rule (contains a function so isStatic is false)
    const rules = css`
      body {
        color: ${() => 'red'};
      }
    `;
    const gs = new GlobalStyle(rules, 'sc-global-clearTag-test');
    const sheet = new StyleSheet({ isServer: true });
    const executionContext = { theme: {} } as any;

    // First render with a fixed instance number (simulates WeakMap caching)
    gs.renderStyles(1, executionContext, sheet, mainStylis);
    expect(liveInstanceCount(sheet, gs.componentId)).toBe(1);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "body{color:red;}/*!sc*/
      data-styled.g3[id="sc-global-clearTag-test"]{content:"sc-global-clearTag-test1,"}/*!sc*/
      "
    `);

    // Simulate Next.js registry: collect styles, then clearTag
    sheet.clearTag();

    // Second render with SAME instance 1, SAME CSS - the exact regression path.
    // Bug: the registry still has instance 1's entry from render 1.
    // computeRules produces identical rules. rulesEqual returns true.
    // rebuildGroup is skipped. Tag is empty. CSS is lost.
    gs.renderStyles(1, executionContext, sheet, mainStylis);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "body{color:red;}/*!sc*/
      data-styled.g3[id="sc-global-clearTag-test"]{content:"sc-global-clearTag-test1,"}/*!sc*/
      "
    `);
  });

  it(`emits both stylesheets of two global styles that differ only in their functions`, () => {
    const sheet = new ServerStyleSheet();
    const First = createGlobalStyle`${() => 'html { --a: 1; }'}`;
    const Second = createGlobalStyle`${() => 'html { --b: 1; }'}`;

    context.renderToString(
      sheet.collectStyles(
        <>
          <First />
          <Second />
        </>
      )
    );

    // One group id carrying both instance names proves the two calls share an id.
    expect(stripWhitespace(stripComments(stripOuterHTML(sheet.getStyleTags())))).toBe(
      'html{ --a:1; } html{ --b:1; } data-styled.g4[id="sc-global-c"]{ content:"sc-global-c1,sc-global-c2,"} '
    );
  });

  it(`collects the rules of two mounts of one dynamic global with different props`, () => {
    const sheet = new ServerStyleSheet();
    const Component = createGlobalStyle<{ color: string }>`body { color: ${p => p.color}; }`;

    context.renderToString(
      sheet.collectStyles(
        <>
          <Component color="red" />
          <Component color="blue" />
        </>
      )
    );

    expect(stripWhitespace(stripComments(stripOuterHTML(sheet.getStyleTags())))).toBe(
      'body{ color:red; } body{ color:blue; } data-styled.g5[id="sc-global-d"]{ content:"sc-global-d1,sc-global-d2,"} '
    );
  });
});

function stripOuterHTML(html: string) {
  return html.replace(/<[^>]*>([^<]*)<[^>]*>/g, '$1');
}
