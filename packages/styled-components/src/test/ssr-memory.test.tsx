/**
 * @jest-environment node
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import createGlobalStyle from '../constructors/createGlobalStyle';
import keyframes from '../constructors/keyframes';
import ServerStyleSheet from '../models/ServerStyleSheet';
import { stripComments, stripWhitespace } from './utils';
import { resetStyled } from './utils';

jest.mock('../utils/nonce', () => {
  return { __esModule: true, default: jest.fn(() => null), resetNonceCache: jest.fn() };
});

let styled: ReturnType<typeof resetStyled>;

describe('SSR memory growth', () => {
  beforeEach(() => {
    styled = resetStyled(true);
  });

  function simulateSSRRequest(tree: React.JSX.Element) {
    const sheet = new ServerStyleSheet();
    const html = renderToString(sheet.collectStyles(tree));
    const css = sheet.getStyleTags();
    sheet.seal();
    return { html, css, sheet };
  }

  it('GlobalStyle CSS output does not grow across SSR requests', () => {
    const GlobalStyle = createGlobalStyle<{ color: string }>`
      body { color: ${p => p.color}; }
    `;

    function App({ color }: { color: string }) {
      return (
        <>
          <GlobalStyle color={color} />
          <div>hello</div>
        </>
      );
    }

    const cssLengths: number[] = [];
    for (let i = 0; i < 50; i++) {
      const { css } = simulateSSRRequest(<App color={i % 2 === 0 ? 'red' : 'blue'} />);
      cssLengths.push(css.length);
    }

    // CSS length should be bounded — same input should produce same-length output
    const maxLen = Math.max(...cssLengths);
    const minLen = Math.min(...cssLengths);
    // Allow for "red" vs "blue" length difference but no unbounded growth
    expect(maxLen - minLen).toBeLessThan(50);

    // First and last request with the same color should produce identical CSS
    const { css: first } = simulateSSRRequest(<App color="red" />);
    const { css: last } = simulateSSRRequest(<App color="red" />);
    expect(first).toBe(last);
  });

  it('does not leak keyframeIds across SSR requests', () => {
    const fade = keyframes`
      from { opacity: 0; }
      to { opacity: 1; }
    `;

    const Box = styled.div`
      animation: ${fade} 1s;
    `;

    const { sheet: sheet1 } = simulateSSRRequest(<Box />);
    const ids1 = sheet1.instance.keyframeIds.size;

    const { sheet: sheet2 } = simulateSSRRequest(<Box />);
    const ids2 = sheet2.instance.keyframeIds.size;

    expect(ids1).toBe(ids2);
    expect(ids1).toBeLessThanOrEqual(1);
  });

  it('does not grow stylesheet names unboundedly across SSR requests', () => {
    const Comp = styled.div`
      color: red;
    `;

    const sizes: number[] = [];
    for (let i = 0; i < 20; i++) {
      const { sheet } = simulateSSRRequest(<Comp />);
      sizes.push(sheet.instance.names.size);
    }

    const unique = new Set(sizes);
    expect(unique.size).toBe(1);
  });

  it('produces consistent CSS output across many SSR requests', () => {
    const GlobalStyle = createGlobalStyle`body { background: palevioletred; }`;
    const Heading = styled.h1`
      color: navy;
    `;

    function App() {
      return (
        <>
          <GlobalStyle />
          <Heading>Hello</Heading>
        </>
      );
    }

    const outputs: string[] = [];
    for (let i = 0; i < 10; i++) {
      const { css } = simulateSSRRequest(<App />);
      outputs.push(css);
    }

    for (let i = 1; i < outputs.length; i++) {
      expect(outputs[i]).toBe(outputs[0]);
    }
  });

  it('does not duplicate keyframe CSS across SSR requests', () => {
    const spin = keyframes`
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    `;

    const Spinner = styled.div`
      animation: ${spin} 1s linear infinite;
    `;

    const { css: css1 } = simulateSSRRequest(<Spinner />);
    const { css: css2 } = simulateSSRRequest(<Spinner />);

    expect(css1).toBe(css2);

    const keyframeCount = (css1.match(/@keyframes/g) || []).length;
    expect(keyframeCount).toBe(1);
  });

  it('multiple GlobalStyle instances do not bloat CSS across requests', () => {
    const GlobalStyle = createGlobalStyle`body { margin: 0; }`;

    function App() {
      return (
        <>
          <GlobalStyle />
          <GlobalStyle />
          <GlobalStyle />
        </>
      );
    }

    const cssOutputs: string[] = [];
    for (let i = 0; i < 20; i++) {
      const { css } = simulateSSRRequest(<App />);
      cssOutputs.push(css);
    }

    // All 20 requests should produce identical CSS
    for (let i = 1; i < cssOutputs.length; i++) {
      expect(cssOutputs[i]).toBe(cssOutputs[0]);
    }

    // Static globals dedup across mounts — 3 instances emit 1 copy of the rule
    const ruleCount = (stripWhitespace(stripComments(cssOutputs[0])).match(/margin:0/g) || [])
      .length;
    expect(ruleCount).toBe(1);
  });
});
