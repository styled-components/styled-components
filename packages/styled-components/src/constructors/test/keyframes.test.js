// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';
import stylisRTLPlugin from 'stylis-plugin-rtl';

import css from '../css';
import keyframes from '../keyframes';
import Keyframes from '../../models/Keyframes';
import StyleSheetManager from '../../models/StyleSheetManager';
import { getRenderedCSS, resetStyled } from '../../test/utils';

// Disable isStaticRules optimisation since we're not
// testing for ComponentStyle specifics here
jest.mock('../../utils/isStaticRules', () => () => false);

let styled;

describe('keyframes', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should return Keyframes instance', () => {
    expect(keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `).toBeInstanceOf(Keyframes);
  });

  it('should return its name via .getName()', () => {
    expect(
      keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `.getName()
    ).toMatchInlineSnapshot(`"jgzmJZ"`);
  });

  it('should insert the correct styles', () => {
    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div`
      animation: ${animation} 2s linear infinite;
    `;
    TestRenderer.create(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        -webkit-animation: jgzmJZ 2s linear infinite;
        animation: jgzmJZ 2s linear infinite;
      }
      @-webkit-keyframes jgzmJZ {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      @keyframes jgzmJZ {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }"
    `);
  });

  it('should insert the correct styles when keyframes in props', () => {
    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div`
      animation: ${props => props.animation} 2s linear infinite;
    `;
    TestRenderer.create(<Comp animation={animation} />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        -webkit-animation: jgzmJZ 2s linear infinite;
        animation: jgzmJZ 2s linear infinite;
      }
      @-webkit-keyframes jgzmJZ {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      @keyframes jgzmJZ {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }"
    `);
  });

  it('should handle interpolations', () => {
    const opacity = ['opacity: 0;', 'opacity: 1;'];

    const opacityAnimation = keyframes`
      from {
        ${opacity[0]}
      }
      to {
        ${opacity[1]}
      }
    `;

    const slideAnimation = keyframes`
      from {
        transform: translateX(-10px);
      }
      to {
        transform: none;
      }
    `;

    const getAnimation = animation => {
      if (Array.isArray(animation)) {
        return animation.reduce(
          (ret, a, index) => css`${ret}${index > 0 ? ',' : ''} ${getAnimation(a)}`,
          ''
        );
      } else {
        return css`
          ${animation === 'slide' ? slideAnimation : opacityAnimation} 1s linear;
        `;
      }
    };

    const Foo = styled.div`
      animation: ${props => (props.animation ? getAnimation(props.animation) : 'none')};
    `;

    const App = () => (
      <React.Fragment>
        <Foo>hi</Foo>
        <Foo animation={['slide', 'fade']}>hi, I slide and fade.</Foo>
        <Foo animation="fade">hi I fade</Foo>
        <Foo animation="slide">hi I slide</Foo>
      </React.Fragment>
    );

    TestRenderer.create(<App />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        -webkit-animation: none;
        animation: none;
      }
      .b {
        -webkit-animation: cMaiLV 1s linear;
        animation: cMaiLV 1s linear;
        , itcuFx 1s linear;
      }
      .c {
        -webkit-animation: itcuFx 1s linear;
        animation: itcuFx 1s linear;
      }
      .d {
        -webkit-animation: cMaiLV 1s linear;
        animation: cMaiLV 1s linear;
      }
      @-webkit-keyframes cMaiLV {
        from {
          -webkit-transform: translateX(-10px);
          -ms-transform: translateX(-10px);
          transform: translateX(-10px);
        }
        to {
          -webkit-transform: none;
          -ms-transform: none;
          transform: none;
        }
      }
      @keyframes cMaiLV {
        from {
          -webkit-transform: translateX(-10px);
          -ms-transform: translateX(-10px);
          transform: translateX(-10px);
        }
        to {
          -webkit-transform: none;
          -ms-transform: none;
          transform: none;
        }
      }
      @-webkit-keyframes itcuFx {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes itcuFx {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }"
    `);
  });

  it('should throw an error when interpolated in a vanilla string', () => {
    const animation = keyframes``;

    expect(() => `animation-name: ${animation};`).toThrow();
  });

  it('should use the local stylis instance', () => {
    const rules = `
      0% {
        left: 0%;
      }
      100% {
        left: 100%;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div`
      animation: ${animation} 2s linear infinite;
    `;
    TestRenderer.create(
      <StyleSheetManager stylisPlugins={[stylisRTLPlugin]}>
        <Comp />
      </StyleSheetManager>
    );

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        -webkit-animation: dpYZkx-1567285458 2s linear infinite;
        animation: dpYZkx-1567285458 2s linear infinite;
      }
      @-webkit-keyframes dpYZkx-1567285458 {
        0% {
          right: 0%;
        }
        100% {
          right: 100%;
        }
      }
      @keyframes dpYZkx-1567285458 {
        0% {
          right: 0%;
        }
        100% {
          right: 100%;
        }
      }"
    `);
  });

  it('should reinject if used in different stylis contexts', () => {
    const rules = `
      0% {
        left: 0%;
      }
      100% {
        left: 100%;
      }
    `;

    const animation = keyframes`${rules}`;

    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    const Comp = styled.div`
      animation: ${animation} 2s linear infinite;
    `;
    TestRenderer.create(
      <>
        <Comp />
        <StyleSheetManager stylisPlugins={[stylisRTLPlugin]}>
          <Comp />
        </StyleSheetManager>
      </>
    );

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        -webkit-animation: dpYZkx 2s linear infinite;
        animation: dpYZkx 2s linear infinite;
      }
      .b {
        -webkit-animation: dpYZkx-1567285458 2s linear infinite;
        animation: dpYZkx-1567285458 2s linear infinite;
      }
      @-webkit-keyframes dpYZkx {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }
      @keyframes dpYZkx {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }
      @-webkit-keyframes dpYZkx-1567285458 {
        0% {
          right: 0%;
        }
        100% {
          right: 100%;
        }
      }
      @keyframes dpYZkx-1567285458 {
        0% {
          right: 0%;
        }
        100% {
          right: 100%;
        }
      }"
    `);
  });
});
