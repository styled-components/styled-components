import { render } from '@testing-library/react';
import React from 'react';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import prefixPlugin from '../prefix';

let styled: ReturnType<typeof resetStyled>;

/**
 * Browser floor = React's documented JS env APIs (Map, Set, Symbol, Promise,
 * Object.assign, requestAnimationFrame): Chrome 45 / Firefox 36 / Safari 9 /
 * iOS 9 / Edge 12. Prefix only when CanIUse still shows prefixed support
 * (`y x` / `a x`) in at least one floor browser.
 */
describe('prefixPlugin', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  const renderWithPrefix = (Comp: React.ComponentType) => {
    render(
      <StyleSheetManager plugins={[prefixPlugin]}>
        <Comp />
      </StyleSheetManager>
    );
  };

  // caniuse: css-appearance. At floor Chrome/Firefox/Safari `a x`.
  // Unprefixed from Chrome 84 / Firefox 80 / Safari 15.4.
  it('prefixes appearance', () => {
    const Comp = styled.div`
      appearance: none;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-appearance: none;
        -moz-appearance: none;
        -ms-appearance: none;
        appearance: none;
      }"
    `);
  });

  // caniuse: user-select-none. At floor all major browsers `y x`.
  // Safari keeps the webkit form in caniuse's unprefixed-from map.
  it('prefixes user-select', () => {
    const Comp = styled.div`
      user-select: none;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }"
    `);
  });

  // caniuse: css-backdrop-filter. At floor Safari/iOS `y x`.
  // Unprefixed Safari only from 18.
  it('prefixes backdrop-filter', () => {
    const Comp = styled.div`
      backdrop-filter: blur(4px);
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-backdrop-filter: blur(4px);
        backdrop-filter: blur(4px);
      }"
    `);
  });

  // caniuse: css-sticky. At floor Safari/iOS `y x`. Unprefixed Safari 13+.
  it('prefixes position: sticky', () => {
    const Comp = styled.div`
      position: sticky;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        position: sticky;
      }"
    `);
  });

  // caniuse: css-filters. At floor Chrome/Safari `y x`.
  // Unprefixed Chrome 53 / Safari 9.1.
  it('prefixes filter', () => {
    const Comp = styled.div`
      filter: blur(2px);
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-filter: blur(2px);
        filter: blur(2px);
      }"
    `);
  });

  // caniuse: css-clip-path. At floor Chrome/Safari `a x`.
  it('prefixes clip-path', () => {
    const Comp = styled.div`
      clip-path: circle(50%);
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-clip-path: circle(50%);
        clip-path: circle(50%);
      }"
    `);
  });

  // caniuse: css-masks. At floor Chrome/Safari `a x`.
  // Unprefixed Chrome 120 / Safari 15.4.
  it('prefixes mask-image', () => {
    const Comp = styled.div`
      mask-image: url(mask.png);
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-mask-image: url(mask.png);
        mask-image: url(mask.png);
      }"
    `);
  });

  // caniuse: css3-tabsize. At floor Firefox `a x`. Unprefixed Firefox 91.
  it('prefixes tab-size', () => {
    const Comp = styled.div`
      tab-size: 4;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -moz-tab-size: 4;
        tab-size: 4;
      }"
    `);
  });

  // caniuse: css-placeholder. At floor Chrome/Safari `a x`, Firefox `y x`.
  it('expands ::placeholder selectors', () => {
    const Comp = styled.input`
      &::placeholder {
        color: gray;
      }
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b::-webkit-input-placeholder {
        color: gray;
      }
      .b::-moz-placeholder {
        color: gray;
      }
      .b:-ms-input-placeholder {
        color: gray;
      }
      .b::placeholder {
        color: gray;
      }"
    `);
  });

  // caniuse: css-placeholder notes also cover :read-only / :read-write moz forms.
  it('expands :read-only selectors', () => {
    const Comp = styled.input`
      &:read-only {
        opacity: 0.5;
      }
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b:-moz-read-only {
        opacity: 0.5;
      }
      .b:read-only {
        opacity: 0.5;
      }"
    `);
  });

  // caniuse: css-writing-mode. At floor Chrome/Safari `y x`.
  // Unprefixed Chrome 48 / Safari 11.
  it('prefixes writing-mode', () => {
    const Comp = styled.div`
      writing-mode: vertical-rl;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-writing-mode: vertical-rl;
        writing-mode: vertical-rl;
      }"
    `);
  });

  // caniuse: css-hyphens. At floor Firefox/Safari/Edge `y x`.
  // Unprefixed Safari 17 / Edge 105.
  it('prefixes hyphens', () => {
    const Comp = styled.div`
      hyphens: auto;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-hyphens: auto;
        -moz-hyphens: auto;
        -ms-hyphens: auto;
        hyphens: auto;
      }"
    `);
  });

  // caniuse: css-image-set. At floor Chrome/Safari `a x`.
  it('prefixes image-set() in values', () => {
    const Comp = styled.div`
      background-image: image-set(url(a.png) 1x, url(a-2x.png) 2x);
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        background-image: image-set(url(a.png) 1x, url(a-2x.png) 2x);
      }"
    `);
  });

  // caniuse: multicolumn. At floor Chrome/Firefox `a x`.
  it('prefixes column-count', () => {
    const Comp = styled.div`
      column-count: 3;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-column-count: 3;
        column-count: 3;
      }"
    `);
  });

  // caniuse: css-line-clamp. At floor Chrome/Safari `y x` (webkit-prefixed form).
  it('prefixes line-clamp', () => {
    const Comp = styled.div`
      line-clamp: 3;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-line-clamp: 3;
        line-clamp: 3;
      }"
    `);
  });

  // caniuse: font-feature. At floor Chrome `y x`. Unprefixed Chrome 48.
  it('prefixes font-feature-settings', () => {
    const Comp = styled.div`
      font-feature-settings: 'smcp';
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-font-feature-settings: 'smcp';
        font-feature-settings: 'smcp';
      }"
    `);
  });

  // caniuse: css-logical-props. At floor Chrome/Safari `a x` for -webkit-margin-start.
  it('prefixes margin-inline-start', () => {
    const Comp = styled.div`
      margin-inline-start: 8px;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-margin-start: 8px;
        margin-inline-start: 8px;
      }"
    `);
  });

  // caniuse: css-boxdecorationbreak. At floor Chrome/Safari `a x`.
  it('prefixes box-decoration-break', () => {
    const Comp = styled.div`
      box-decoration-break: clone;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }"
    `);
  });

  // caniuse: text-size-adjust. At floor iOS `y x`, Edge `y x`.
  it('prefixes text-size-adjust', () => {
    const Comp = styled.div`
      text-size-adjust: 100%;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }"
    `);
  });

  // caniuse: css-snappoints. At floor Safari/Edge `a x`.
  it('prefixes scroll-snap-type', () => {
    const Comp = styled.div`
      scroll-snap-type: x mandatory;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-scroll-snap-type: x mandatory;
        scroll-snap-type: x mandatory;
      }"
    `);
  });

  it('does not prefix properties already unprefixed at the React JS floor', () => {
    const Comp = styled.div`
      display: flex;
      transform: translateX(1px);
      transition: opacity 200ms;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        display: flex;
        transform: translateX(1px);
        transition: opacity 200ms;
      }"
    `);
  });

  it('leaves already-prefixed declarations alone', () => {
    const Comp = styled.div`
      -webkit-appearance: none;
    `;
    renderWithPrefix(Comp);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        -webkit-appearance: none;
      }"
    `);
  });

  describe('scoping', () => {
    it('is opt-in per StyleSheetManager subtree', () => {
      const A = styled.div`
        appearance: none;
      `;
      const B = styled.div`
        appearance: auto;
      `;
      render(
        <>
          <StyleSheetManager plugins={[prefixPlugin]}>
            <A />
          </StyleSheetManager>
          <B />
        </>
      );
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".c {
          -webkit-appearance: none;
          -moz-appearance: none;
          -ms-appearance: none;
          appearance: none;
        }
        .d {
          appearance: auto;
        }"
      `);
    });
  });
});
