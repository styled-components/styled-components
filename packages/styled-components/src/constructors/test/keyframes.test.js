// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { expectCSSMatches, getCSS, resetStyled } from '../../test/utils';

import { css } from "..";
import { keyframes } from '../keyframes';
import { Keyframes } from '../../models';

/**
 * Setup
 */
describe('keyframes', () => {
  beforeEach(() => {
    resetStyled();
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
    ).toEqual('a');
  });

  it('should insert the correct styles', () => {
    const styled = resetStyled();

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
      .c {
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
    const styled = resetStyled();

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
      .c {
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
    const styled = resetStyled();

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

    expect(getCSS(document).trim()).toMatchInlineSnapshot(`
"/* sc-component-id:sc-c */
.d{-webkit-animation:none;animation:none;}.e{-webkit-animation:b 1s linear;animation:b 1s linear;, a 1s linear;}.f{-webkit-animation:a 1s linear;animation:a 1s linear;}.g{-webkit-animation:b 1s linear;animation:b 1s linear;}
/* sc-component-id:sc-keyframes-b */
@-webkit-keyframes b{from{-webkit-transform:translateX(-10px);-ms-transform:translateX(-10px);transform:translateX(-10px);}to{-webkit-transform:none;-ms-transform:none;transform:none;}} @keyframes b{from{-webkit-transform:translateX(-10px);-ms-transform:translateX(-10px);transform:translateX(-10px);}to{-webkit-transform:none;-ms-transform:none;transform:none;}}
/* sc-component-id:sc-keyframes-a */
@-webkit-keyframes a{from{opacity:0;}to{opacity:1;}} @keyframes a{from{opacity:0;}to{opacity:1;}}"
`);
  });

  it('should throw an error when interpolated in a vanilla string', () => {
    const styled = resetStyled();

    const animation = keyframes``;

    expect(() => `animation-name: ${animation};`).toThrow();
  });
});
