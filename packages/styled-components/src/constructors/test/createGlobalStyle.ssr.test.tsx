/**
 * @jest-environment node
 */
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import GlobalStyle from '../../models/GlobalStyle';
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
    // after clearTag destroyed the tag — otherwise CSS is lost.

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
    expect(gs.instanceRules.size).toBe(1);
    expect(sheet.toString()).toContain('color');

    // Simulate Next.js registry: collect styles, then clearTag
    sheet.clearTag();

    // Second render with SAME instance 1, SAME CSS — the exact regression path.
    // Bug: instanceRules still has instance 1's entry from render 1.
    // computeRules produces identical rules. rulesEqual returns true.
    // rebuildGroup is skipped. Tag is empty. CSS is lost.
    gs.renderStyles(1, executionContext, sheet, mainStylis);
    expect(sheet.toString()).toContain('color');
  });
});

function stripOuterHTML(html: string) {
  return html.replace(/<[^>]*>([^<]*)<[^>]*>/g, '$1');
}
