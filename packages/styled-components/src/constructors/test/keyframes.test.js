// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import css from '../css';
import keyframes from '../keyframes';
import Keyframes from '../../models/Keyframes';
import { expectCSSMatches, getCSS, resetStyled } from '../../test/utils';

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
    ).toMatchInlineSnapshot('"bYhwJh"', `"bYhwJh"`);
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
    const name = animation.getName();

    expectCSSMatches('');

    const Comp = styled.div`
      animation: ${animation} 2s linear infinite;
    `;
    TestRenderer.create(<Comp />);

    expectCSSMatches(`
      .a {
        -webkit-animation: ${name} 2s linear infinite;
        animation: ${name} 2s linear infinite;
      }

      @-webkit-keyframes ${name} {
        0% {
          opacity:0;
        }
        100% {
          opacity:1;
        }
      }

      @keyframes ${name} {
        0% {
          opacity:0;
        }
        100% {
          opacity:1;
        }
      }
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
    const name = animation.getName();

    expectCSSMatches('');

    const Comp = styled.div`
      animation: ${props => props.animation} 2s linear infinite;
    `;
    TestRenderer.create(<Comp animation={animation} />);

    expectCSSMatches(`
      .a {
        -webkit-animation: ${name} 2s linear infinite;
        animation: ${name} 2s linear infinite;
      }

      @-webkit-keyframes ${name} {
        0% {
          opacity:0;
        }
        100% {
          opacity:1;
        }
      }

      @keyframes ${name} {
        0% {
          opacity:0;
        }
        100% {
          opacity:1;
        }
      }
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

    expect(getCSS(document).trim()).toMatchInlineSnapshot(
      `".a{-webkit-animation:none;animation:none;}.b{-webkit-animation:XnAcP 1s linear;animation:XnAcP 1s linear;, imRjSV 1s linear;}.c{-webkit-animation:imRjSV 1s linear;animation:imRjSV 1s linear;}.d{-webkit-animation:XnAcP 1s linear;animation:XnAcP 1s linear;}@-webkit-keyframes XnAcP{from{-webkit-transform:translateX(-10px);-ms-transform:translateX(-10px);transform:translateX(-10px);}to{-webkit-transform:none;-ms-transform:none;transform:none;}}@keyframes XnAcP{from{-webkit-transform:translateX(-10px);-ms-transform:translateX(-10px);transform:translateX(-10px);}to{-webkit-transform:none;-ms-transform:none;transform:none;}}@-webkit-keyframes imRjSV{from{opacity:0;}to{opacity:1;}}@keyframes imRjSV{from{opacity:0;}to{opacity:1;}}"`
    );
  });

  it('should throw an error when interpolated in a vanilla string', () => {
    const animation = keyframes``;

    expect(() => `animation-name: ${animation};`).toThrow();
  });
});
