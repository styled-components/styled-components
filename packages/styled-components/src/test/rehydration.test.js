// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { resetStyled, expectCSSMatches, seedNextClassnames } from './utils';
import createGlobalStyle from '../constructors/createGlobalStyle';
import keyframes from '../constructors/keyframes';
import StyleSheet from '../models/StyleSheet';
import { SC_ATTR, SC_VERSION_ATTR } from '../constants';

const getStyleTags = () =>
  Array.from(document.querySelectorAll('style')).map(el => ({
    css: el.innerHTML.trim().replace(/\s+/gm, ' '),
  }));

let styled;

describe('rehydration', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled();
  });

  describe('with existing styled components', () => {
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR}="b" ${SC_VERSION_ATTR}="${__VERSION__}">
          /* sc-component-id: TWO */
          .b { color: red; }
        </style>
      `;
      StyleSheet.reset();
    });

    it('should preserve the styles', () => {
      expectCSSMatches('.b { color: red; }');
    });

    it('should append a new component like normal', () => {
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      TestRenderer.create(<Comp />);
      expectCSSMatches('.b { color: red; } .a { color:blue; }');
    });

    it('should reuse a componentId', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      TestRenderer.create(<A />);
      const B = styled.div.withConfig({ componentId: 'TWO' })``;
      TestRenderer.create(<B />);
      expectCSSMatches('.b { color: red; } .a { color:blue; }');
    });

    it('should reuse a componentId and generated class', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      TestRenderer.create(<A />);
      const B = styled.div.withConfig({ componentId: 'TWO' })`
        color: red;
      `;
      TestRenderer.create(<B />);
      expectCSSMatches('.b { color: red; } .a { color:blue; }');
    });

    it('should reuse a componentId and inject new classes', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      TestRenderer.create(<A />);
      const B = styled.div.withConfig({ componentId: 'TWO' })`
        color: red;
      `;
      TestRenderer.create(<B />);
      const C = styled.div.withConfig({ componentId: 'TWO' })`
        color: green;
      `;
      TestRenderer.create(<C />);
      expectCSSMatches('.b{ color: red; } .c{ color:green; } .a{ color:blue; }');
    });
  });

  describe('with styled components with props', () => {
    beforeEach(() => {
      /* Hash 1323611362 is based on name TWO and contents color: red.
       * Change either and this will break. */
      document.head.innerHTML = `
        <style ${SC_ATTR}='a b' ${SC_VERSION_ATTR}="${__VERSION__}">
          /* sc-component-id: ONE */
          .a { color: blue; }
          /* sc-component-id: TWO */
          .b { color: red; }
        </style>
      `;
      StyleSheet.reset();
    });

    it('should preserve the styles', () => {
      expectCSSMatches(`
        .a { color: blue; }
        .b { color: red; }
      `);
    });

    it('should not inject new styles for a component already rendered', () => {
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: ${props => props.color};
      `;
      TestRenderer.create(<Comp color="blue" />);
      expectCSSMatches(`
        .a { color: blue; }
        .b { color: red; }
      `);
    });

    it('should inject new styles for a new computed style of a component', () => {
      seedNextClassnames(['x']);
      const Comp = styled.div.withConfig({ componentId: 'ONE' })`
        color: ${props => props.color};
      `;
      TestRenderer.create(<Comp color="green" />);
      expectCSSMatches(`
        .a { color: blue; } .x { color:green; }
        .b { color: red; }
      `);
    });
  });

  describe('with inline styles that werent rendered by us', () => {
    beforeEach(() => {
      /* Same css as before, but without the data attributes we ignore it */
      document.head.innerHTML = `
        <style>
          /* sc-component-id: TWO */
          .b { color: red; }
        </style>
      `;
      StyleSheet.reset();
    });

    it('should leave the existing styles there', () => {
      expectCSSMatches('.b { color: red; }');
    });

    it('should generate new classes, even if they have the same name', () => {
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      TestRenderer.create(<A />);
      const B = styled.div.withConfig({ componentId: 'TWO' })`
        color: red;
      `;
      TestRenderer.create(<B />);
      expectCSSMatches('.b { color: red; } .a { color:blue; } .b { color:red; } ');
    });
  });

  describe('with global styles', () => {
    beforeEach(() => {
      /* Adding a non-local stylesheet with a hash 557410406 which is
       * derived from "body { background: papayawhip; }" so be careful
       * changing it. */
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_VERSION_ATTR}="${__VERSION__}">
          /* sc-component-id: sc-global-557410406 */
          body { background: papayawhip; }
        </style>
        <style ${SC_ATTR}='b' ${SC_VERSION_ATTR}="${__VERSION__}">
          /* sc-component-id: TWO */
          .b { color: red; }
        </style>
      `;
      StyleSheet.reset();
    });

    it('should leave the existing styles there', () => {
      expectCSSMatches('body { background: papayawhip; } .b { color: red; }');
    });

    it('should inject new global styles at the end', () => {
      const Component = createGlobalStyle`
        body { color: tomato; }
      `;
      TestRenderer.create(<Component />);
      expectCSSMatches(
        'body { background: papayawhip; } .b { color: red; } body { color:tomato; }'
      );
    });

    it('should interleave global and local styles', () => {
      const Component = createGlobalStyle`
        body { color: tomato; }
      `;
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      TestRenderer.create(<Component />);
      TestRenderer.create(<A />);

      expectCSSMatches(
        'body { background: papayawhip; } .b { color: red; } body { color:tomato; } .a { color:blue; }'
      );
      expect(getStyleTags()).toEqual(
        [
          {
            css: '/* sc-component-id: sc-global-557410406 */ body{background:papayawhip;} ',
          },
          { css: '/* sc-component-id: TWO */ .b{color:red;} ' },
          {
            css: '/* sc-component-id: sc-global-2299393384 */ body{color:tomato;} ',
          },
          { css: '/* sc-component-id: ONE */ .a{color:blue;}' },
        ].reduce(
          (acc, { css }) => {
            acc[0].css += css;
            return acc;
          },
          [{ css: '' }]
        )
      );
    });
  });

  describe('with all styles already rendered', () => {
    let styleTags;
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR} ${SC_VERSION_ATTR}="${__VERSION__}">
           /* sc-component-id: sc-global-1455077013 */
          html { font-size: 16px; }
           /* sc-component-id: sc-global-557410406 */
          body { background: papayawhip; }
        </style>
        <style ${SC_ATTR}='a b' ${SC_VERSION_ATTR}="${__VERSION__}">
          /* sc-component-id: ONE */
          .a { color: blue; }
          /* sc-component-id: TWO */
          .b { color: red; }
        </style>
      `;
      styleTags = Array.from(document.querySelectorAll('style'));
      StyleSheet.reset();
    });

    it('should not touch existing styles', () => {
      expectCSSMatches(`
        html { font-size: 16px; }
        body { background: papayawhip; }
        .a { color: blue; }
        .b { color: red; }
      `);
    });

    it('should not change styles if rendered in the same order they were created with', () => {
      const Component1 = createGlobalStyle`
        html { font-size: 16px; }
      `;
      TestRenderer.create(<Component1 />);
      const Component2 = createGlobalStyle`
        body { background: papayawhip; }
      `;
      TestRenderer.create(<Component2 />);
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      TestRenderer.create(<A />);
      const B = styled.div.withConfig({ componentId: 'TWO' })`
        color: red;
      `;
      TestRenderer.create(<B />);

      expectCSSMatches(`
        html { font-size: 16px; }
        body { background: papayawhip; }
        .a { color: blue; }
        .b { color: red; }
      `);
    });

    it('should still not change styles if rendered in a different order', () => {
      const B = styled.div.withConfig({ componentId: 'TWO' })`
        color: red;
      `;
      TestRenderer.create(<B />);
      const Component1 = createGlobalStyle`
        body { background: papayawhip; }
      `;
      TestRenderer.create(<Component1 />);
      const A = styled.div.withConfig({ componentId: 'ONE' })`
        color: blue;
      `;
      TestRenderer.create(<A />);
      const Component2 = createGlobalStyle`
        html { font-size: 16px; }
      `;
      TestRenderer.create(<Component2 />);

      expectCSSMatches(`
        html { font-size: 16px; }
        body { background: papayawhip; }
        .a { color: blue; }
        .b { color: red; }
      `);
    });
  });

  describe('with keyframes', () => {
    beforeEach(() => {
      document.head.innerHTML = `
        <style ${SC_ATTR}='keyframe_880' ${SC_VERSION_ATTR}="${__VERSION__}">
          /* sc-component-id: sc-keyframes-keyframe_880 */
          @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
        </style>
      `;
      StyleSheet.reset();
    });

    it('should not touch existing styles', () => {
      expectCSSMatches(`
        @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
      `);
    });

    it('should not regenerate keyframes', () => {
      seedNextClassnames(['keyframe_880']);

      const fadeIn = keyframes`
        from { opacity: 0; }
      `;

      const A = styled.div`
        animation: ${fadeIn} 1s both;
      `;
      TestRenderer.create(<A />);

      expectCSSMatches(`
        @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
        .b{ -webkit-animation:keyframe_880 1s both; animation:keyframe_880 1s both; }
      `);
    });

    it('should still inject new keyframes', () => {
      seedNextClassnames(['keyframe_144']);

      const fadeOut = keyframes`
        from { opacity: 1; }
      `;

      const A = styled.div`
        animation: ${fadeOut} 1s both;
      `;
      TestRenderer.create(<A />);

      expectCSSMatches(`
        @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
        .b{ -webkit-animation:keyframe_144 1s both; animation:keyframe_144 1s both; }
        @-webkit-keyframes keyframe_144 {from {opacity:1;}}@keyframes keyframe_144 {from {opacity:1;}}
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
      `;
      const B = styled.div`
        animation: ${fadeOut} 1s both;
      `;
      /* Purposely rendering out of order to make sure the output looks right */
      TestRenderer.create(<B />);
      TestRenderer.create(<A />);

      expectCSSMatches(`
        @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
        .d { -webkit-animation:keyframe_880 1s both; animation:keyframe_880 1s both; }
        .c { -webkit-animation:keyframe_144 1s both; animation:keyframe_144 1s both; }
        @-webkit-keyframes keyframe_144 {from {opacity:1;}}@keyframes keyframe_144 {from {opacity:1;}}
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
      const A = styled.div`
        animation: ${props => props.animation} 1s both;
      `;
      const B = styled.div`
        animation: ${props => props.animation} 1s both;
      `;
      /* Purposely rendering out of order to make sure the output looks right */
      TestRenderer.create(<B animation={fadeOut} />);
      TestRenderer.create(<A animation={fadeIn} />);

      expectCSSMatches(`
        @-webkit-keyframes keyframe_880 {from {opacity: 0;}}@keyframes keyframe_880 {from {opacity: 0;}}
        .d { -webkit-animation:keyframe_880 1s both; animation:keyframe_880 1s both; }
        .c { -webkit-animation:keyframe_144 1s both; animation:keyframe_144 1s both; }
        @-webkit-keyframes keyframe_144 {from {opacity:1;}}@keyframes keyframe_144 {from {opacity:1;}}
      `);
    });
  });
});
