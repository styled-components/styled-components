// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import css from '../css';
import keyframes from '../keyframes';
import Keyframes from '../../models/Keyframes';
import { expectCSSMatches, getCSS, resetStyled } from '../../test/utils';

/**
 * Setup
 */
describe('keyframes', () => {
  let styled;

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
    ).toMatchInlineSnapshot('"bcCCNc"');
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
      .b {
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
      .b {
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

    expect(getCSS(document).trim()).toMatchInlineSnapshot(`
"/* sc-component-id:sc-a */
.b{-webkit-animation:none;animation:none;}.c{-webkit-animation:hNeMbn 1s linear;animation:hNeMbn 1s linear;, dHUfhi 1s linear;}.d{-webkit-animation:dHUfhi 1s linear;animation:dHUfhi 1s linear;}.e{-webkit-animation:hNeMbn 1s linear;animation:hNeMbn 1s linear;}
/* sc-component-id:sc-keyframes-hNeMbn */
@-webkit-keyframes hNeMbn{from{-webkit-transform:translateX(-10px);-ms-transform:translateX(-10px);transform:translateX(-10px);}to{-webkit-transform:none;-ms-transform:none;transform:none;}} @keyframes hNeMbn{from{-webkit-transform:translateX(-10px);-ms-transform:translateX(-10px);transform:translateX(-10px);}to{-webkit-transform:none;-ms-transform:none;transform:none;}}
/* sc-component-id:sc-keyframes-dHUfhi */
@-webkit-keyframes dHUfhi{from{opacity:0;}to{opacity:1;}} @keyframes dHUfhi{from{opacity:0;}to{opacity:1;}}"
`);
  });

  it('should throw an error when interpolated in a vanilla string', () => {
    const animation = keyframes``;

    expect(() => `animation-name: ${animation};`).toThrow();
  });

  it('should work inside an object-type style', () => {
    const fadeToBlack = keyframes`
      to {
        background-color: black;
      }
    `;

    const Box = styled.div(() => ({
      width: 200,
      height: 200,
      backgroundColor: 'blue',
      animation: css`
        ${fadeToBlack} 1500ms ease both infinite;
      `,
    }));

    expect(() => TestRenderer.create(<Box />)).not.toThrowError();
    expect(getCSS(document).trim()).toMatchInlineSnapshot(`
"/* sc-component-id:sc-a */
.b{width:200px;height:200px;background-color:blue;-webkit-animation:ekBxmi 1500ms ease both infinite;animation:ekBxmi 1500ms ease both infinite;}
/* sc-component-id:sc-keyframes-ekBxmi */
@-webkit-keyframes ekBxmi{to{background-color:black;}} @keyframes ekBxmi{to{background-color:black;}}"
`);
  });
});
