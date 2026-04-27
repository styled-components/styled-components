import { render } from '@testing-library/react';
import React from 'react';
import { SC_ATTR, SC_ATTR_VERSION } from '../constants';
import { getRenderedCSS, rehydrateTestStyles, resetStyled, seedNextClassnames } from './utils';

declare const __VERSION__: string;

/* NOTE:
   Sometimes we add an empty function interpolation into some
   styled-components to skip the static optimisation in
   ComponentStyle. This will look like this:
   ${() => ''}
   */
let styled: ReturnType<typeof resetStyled>;
let createGlobalStyle: Awaited<typeof import('../constructors/createGlobalStyle')>['default'];
let keyframes: Awaited<typeof import('../constructors/keyframes')>['default'];

describe('rehydration', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    createGlobalStyle = require('../constructors/createGlobalStyle');
    keyframes = require('../constructors/keyframes');
    styled = resetStyled();
  });

  describe('with existing styled components', () => {
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${__VERSION__}">
          .b { color: red; }/*!sc*/
          ${SC_ATTR}.g1[id="TWO"]{content: "b,"}/*!sc*/
        </style>
      `;

      rehydrateTestStyles();
    });

    it('should preserve the styles', () => {
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }"
      `);
    });

    it('should append a new component like normal', () => {
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
        ${() => ''}
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }
        .a {
          color: blue;
        }"
      `);
    });

    it('should reuse a componentId', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
        ${() => ''}
      `;
      render(<A />);
      const B = styled.div.withConfig({ componentId: 'TWO' })``;
      render(<B />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }
        .a {
          color: blue;
        }"
      `);
    });

    it('should reuse a componentId and generated class', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
        ${() => ''}
      `;
      render(<A />);
      const B = styled.div.withConfig({ componentId: 'TWO' })`
        color: red;
        ${() => ''}
      `;
      render(<B />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }
        .a {
          color: blue;
        }"
      `);
    });

    it('should reuse a componentId and inject new classes', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
        ${() => ''}
      `;
      render(<A />);
      const B = styled.div.withConfig({ componentId: 'TWO' })`
        color: ${() => 'red'};
      `;
      render(<B />);
      const C = styled.div.withConfig({ componentId: 'TWO' })`
        color: ${() => 'green'};
      `;
      render(<C />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }
        .c {
          color: green;
        }
        .a {
          color: blue;
        }"
      `);
    });
  });

  describe('with styled components with props', () => {
    beforeEach(() => {
      /* Hash 1323611362 is based on name TWO and contents color: red.
       * Change either and this will break. */
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${__VERSION__}">
          .a { color: blue; }/*!sc*/
          ${SC_ATTR}.g1[id="ONE"]{content: "a,"}/*!sc*/
          .b { color: red; }/*!sc*/
          ${SC_ATTR}.g2[id="TWO"]{content: "b,"}/*!sc*/
        </style>
      `;

      rehydrateTestStyles();
    });

    it('should preserve the styles', () => {
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: blue;
        }
        .b {
          color: red;
        }"
      `);
    });

    it('should not inject new styles for a component already rendered', () => {
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: ${props => props.color};
      `;
      render(<Comp color="blue" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: blue;
        }
        .b {
          color: red;
        }"
      `);
    });

    it('should inject new styles for a new computed style of a component', () => {
      seedNextClassnames(['x']);
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: ${props => props.color};
      `;
      render(<Comp color="green" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: blue;
        }
        .x {
          color: green;
        }
        .b {
          color: red;
        }"
      `);
    });
  });

  describe('with inline styles that werent rendered by us', () => {
    beforeEach(() => {
      /* Same css as before, but without the data attributes we ignore it */
      document.head.innerHTML = `
        <style>
          .b { color: red; }/*!sc*/
          ${SC_ATTR}.g2[id="TWO"]{content: "b,"}/*!sc*/
        </style>
      `;

      rehydrateTestStyles();
    });

    it('should leave the existing styles there', () => {
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          color: red;
        }
        data-styled.g2[id="TWO"] {
          content: "b,";
        }"
      `);
    });
  });

  describe('with global styles', () => {
    beforeEach(() => {
      /* Adding a non-local stylesheet with a hash 557410406 which is
       * derived from "body { background: papayawhip; }" so be careful
       * changing it. */
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${__VERSION__}">
          body { background: papayawhip; }/*!sc*/
          ${SC_ATTR}.g1[id="sc-global-557410406"]{content: "sc-global-557410406,"}/*!sc*/
        </style>
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${__VERSION__}">
          .a { color: red; }/*!sc*/
          ${SC_ATTR}.g2[id="TWO"]{content: "a,"}/*!sc*/
        </style>
      `;

      rehydrateTestStyles();
    });

    it('should leave the existing styles there', () => {
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "body {
          background: papayawhip;
        }
        .a {
          color: red;
        }"
      `);
    });

    it('should inject new global styles at the end', () => {
      const Component = createGlobalStyle`
        body { color: tomato; }
      `;
      render(<Component />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "body {
          background: papayawhip;
        }
        .a {
          color: red;
        }
        body {
          color: tomato;
        }"
      `);
    });

    it('should interleave global and local styles', () => {
      const Component = createGlobalStyle`
        body { color: tomato; }
      `;

      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
        ${() => ''}
      `;

      render(<Component />);
      render(<A />);

      // although `<Component />` is rendered before `<A />`, the global style isn't registered until render time
      // compared to typical component styles which are registered at creation time
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "body {
          background: papayawhip;
        }
        .a {
          color: red;
        }
        body {
          color: tomato;
        }
        .b {
          color: blue;
        }"
      `);
    });
  });

  describe('with all styles already rendered', () => {
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${__VERSION__}">
          html { font-size: 16px; }/*!sc*/
          ${SC_ATTR}.g1[id="sc-global-a"]{content: "sc-global-a,"}/*!sc*/
          body { background: papayawhip; }/*!sc*/
          ${SC_ATTR}.g2[id="sc-global-b"]{content: "sc-global-b,"}/*!sc*/
          .c { color: blue; }/*!sc*/
          ${SC_ATTR}.g3[id="ONE"]{content: "c,"}/*!sc*/
          .d { color: red; }/*!sc*/
          ${SC_ATTR}.g4[id="TWO"]{content: "d,"}/*!sc*/
        </style>
      `;

      rehydrateTestStyles();
    });

    it('should not touch existing styles', () => {
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 16px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);
    });

    it('should not change styles if rendered in the same order they were created with', () => {
      const Component1 = createGlobalStyle`
        html { font-size: 16px; }
      `;
      render(<Component1 />);
      const Component2 = createGlobalStyle`
        body { background: papayawhip; }
      `;
      render(<Component2 />);
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      render(<A />);
      const B = styled.div.withConfig({ componentId: 'TWO' })`
        color: red;
      `;
      render(<B />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 16px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);
    });

    it('should still not change styles if rendered in a different order', () => {
      seedNextClassnames(['d', 'a', 'b', 'c']);

      const B = styled.div.withConfig({ componentId: 'TWO' })`
        color: red;
      `;
      render(<B />);
      const Component1 = createGlobalStyle`
        html { font-size: 16px; }
      `;
      render(<Component1 />);
      const Component2 = createGlobalStyle`
        body { background: papayawhip; }
      `;
      render(<Component2 />);
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      render(<A />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 16px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);
    });

    it('should preserve rehydrated static global styles when one of multiple instances unmounts', () => {
      // Rehydrate two instances of the same static global style
      // (the beforeEach already set up sc-global-a with one instance)
      // Create the same global style on the client and mount two instances
      const GlobalStyle = createGlobalStyle`
        html { font-size: 16px; }
      `;

      function Wrapper({ showSecond }: { showSecond: boolean }) {
        return (
          <>
            <GlobalStyle />
            {showSecond && <GlobalStyle />}
          </>
        );
      }

      const { rerender } = render(<Wrapper showSecond={true} />);

      // Both instances should render their styles
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 16px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);

      // Unmount second instance — first instance's styles must survive
      rerender(<Wrapper showSecond={false} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 16px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);
    });

    it('should preserve rehydrated dynamic global styles when one of multiple instances unmounts', () => {
      // Create a dynamic global style (has interpolation, not static)
      const GlobalStyle = createGlobalStyle<{ size: string }>`
        html { font-size: ${props => props.size}; }
      `;

      function Wrapper({ showSecond }: { showSecond: boolean }) {
        return (
          <>
            <GlobalStyle size="16px" />
            {showSecond && <GlobalStyle size="16px" />}
          </>
        );
      }

      const { rerender } = render(<Wrapper showSecond={true} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 16px;
        }
        html {
          font-size: 16px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);

      // Unmount second instance — first instance's styles must survive
      rerender(<Wrapper showSecond={false} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 16px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);
    });

    it('should handle prop change on surviving instance after rehydration + unmount', () => {
      const GlobalStyle = createGlobalStyle<{ size: string }>`
        html { font-size: ${props => props.size}; }
      `;

      function Wrapper({ showSecond, size }: { showSecond: boolean; size: string }) {
        return (
          <>
            <GlobalStyle size={size} />
            {showSecond && <GlobalStyle size={size} />}
          </>
        );
      }

      const { rerender } = render(<Wrapper showSecond={true} size="16px" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 16px;
        }
        html {
          font-size: 16px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);

      // Unmount second, then change prop on survivor
      rerender(<Wrapper showSecond={false} size="16px" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 16px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);

      rerender(<Wrapper showSecond={false} size="20px" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "html {
          font-size: 20px;
        }
        body {
          background: papayawhip;
        }
        .c {
          color: blue;
        }
        .d {
          color: red;
        }"
      `);
      expect(getRenderedCSS()).not.toContain('font-size: 16px');
    });
  });

  describe('with keyframes', () => {
    // v7 dropped the runtime vendor prefixer, so SSR markup contains the
    // unprefixed `@keyframes` form only. The seed below mirrors real v7
    // SSR output. (Pre-v7 seeds also included `@-webkit-keyframes` and exercised
    // jsdom's CSSOM dedup quirks, which weren't actually testing sc behavior.)
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_ATTR_VERSION}="${__VERSION__}">
          @keyframes keyframe_880 {from {opacity: 0;}}/*!sc*/
          ${SC_ATTR}.g1[id="sc-keyframes-keyframe_880"]{content: "keyframe_880,"}/*!sc*/
        </style>
      `;

      rehydrateTestStyles();
    });

    it('should not touch existing styles', () => {
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@keyframes keyframe_880 {
          from {
            opacity: 0;
          }
        }"
      `);
    });

    it('should not regenerate keyframes', () => {
      seedNextClassnames(['keyframe_880']);

      const fadeIn = keyframes`
        from { opacity: 0; }
      `;

      const A = styled.div`
        animation: ${fadeIn} 1s both;
        ${() => ''}
      `;

      render(<A />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@keyframes keyframe_880 {
          from {
            opacity: 0;
          }
        }
        .b {
          animation: keyframe_880 1s both;
        }"
      `);
    });

    it('should still inject new keyframes', () => {
      seedNextClassnames(['keyframe_144']);

      const fadeOut = keyframes`
        from { opacity: 1; }
      `;

      const A = styled.div`
        animation: ${fadeOut} 1s both;
        ${() => ''}
      `;

      render(<A />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@keyframes keyframe_880 {
          from {
            opacity: 0;
          }
        }
        @keyframes keyframe_144 {
          from {
            opacity: 1;
          }
        }
        .b {
          animation: keyframe_144 1s both;
        }"
      `);
    });

    it('should pass the keyframes name along as well', () => {
      seedNextClassnames(['keyframe_880', 'keyframe_144']);

      const fadeIn = keyframes`
        from { opacity: 0; }
      `;
      const fadeOut = keyframes`
        from { opacity: 1; }
      `;
      const A = styled.div`
        animation: ${fadeIn} 1s both;
        ${() => ''}
      `;
      const B = styled.div`
        animation: ${fadeOut} 1s both;
        ${() => ''}
      `;

      /* Purposely rendering out of order to make sure the output looks right */
      render(<B />);
      render(<A />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@keyframes keyframe_880 {
          from {
            opacity: 0;
          }
        }
        @keyframes keyframe_144 {
          from {
            opacity: 1;
          }
        }
        .d {
          animation: keyframe_880 1s both;
        }
        .c {
          animation: keyframe_144 1s both;
        }"
      `);
    });

    it('should pass the keyframes name through props along as well', () => {
      seedNextClassnames(['keyframe_880', 'keyframe_144']);

      const fadeIn = keyframes`
        from { opacity: 0; }
      `;
      const fadeOut = keyframes`
        from { opacity: 1; }
      `;
      const A = styled.div<{ $animation: any }>`
        animation: ${props => props.$animation} 1s both;
      `;
      const B = styled.div<{ $animation: any }>`
        animation: ${props => props.$animation} 1s both;
      `;

      /* Purposely rendering out of order to make sure the output looks right */
      render(<B $animation={fadeOut} />);
      render(<A $animation={fadeIn} />);

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@keyframes keyframe_880 {
          from {
            opacity: 0;
          }
        }
        @keyframes keyframe_144 {
          from {
            opacity: 1;
          }
        }
        .d {
          animation: keyframe_880 1s both;
        }
        .c {
          animation: keyframe_144 1s both;
        }"
      `);
    });
  });
});
