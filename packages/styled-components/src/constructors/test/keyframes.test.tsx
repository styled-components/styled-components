import React from 'react';
import TestRenderer from 'react-test-renderer';
import stylisRTLPlugin from 'stylis-plugin-rtl';
import Keyframes from '../../models/Keyframes';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import css from '../css';
import keyframes from '../keyframes';

// Disable isStaticRules optimisation since we're not
// testing for ComponentStyle specifics here
jest.mock('../../utils/isStaticRules', () => () => false);

let styled: ReturnType<typeof resetStyled>;

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
    ).toMatchInlineSnapshot(`"a"`);
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
      ".c {
        animation: a 2s linear infinite;
      }
      @keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }"
    `);
  });

  it('should insert the correct styles for objects', () => {
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

    const Comp = styled.div({
      animation: css`
        ${animation} 2s linear infinite
      `,
    });

    TestRenderer.create(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".c {
        animation: a 2s linear infinite;
      }
      @keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }"
    `);
  });

  it('should insert the correct styles for objects with nesting', () => {
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

    const Comp = styled.div({
      '@media(max-width: 700px)': {
        animation: css`
          ${animation} 2s linear infinite
        `,
        ':hover': {
          animation: css`
            ${animation} 10s linear infinite
          `,
        },
      },
    });

    TestRenderer.create(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@media(max-width:700px) {
        .c {
          animation: a 2s linear infinite;
        }
        .c :hover {
          animation: a 10s linear infinite;
        }
      }
      @keyframes a {
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

    const Comp = styled.div<{ animation: any }>`
      animation: ${props => props.animation} 2s linear infinite;
    `;
    TestRenderer.create(<Comp animation={animation} />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".c {
        animation: a 2s linear infinite;
      }
      @keyframes a {
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

    const getAnimation = (animation: any): any => {
      if (Array.isArray(animation)) {
        return animation.reduce(
          (ret, a, index) => css`
            ${ret}${index > 0 ? ',' : ''} ${getAnimation(a)}
          `,
          ''
        );
      } else {
        return css`
          ${animation === 'slide' ? slideAnimation : opacityAnimation} 1s linear
        `;
      }
    };

    const Foo = styled.div<{ animation?: any }>`
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
      ".d {
        animation: none;
      }
      .e {
        animation: b 1s linear, a 1s linear;
      }
      .f {
        animation: a 1s linear;
      }
      .g {
        animation: b 1s linear;
      }
      @keyframes b {
        from {
          transform: translateX(-10px);
        }
        to {
          transform: none;
        }
      }
      @keyframes a {
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
      ".c {
        animation: a-1567285458 2s linear infinite;
      }
      @keyframes a-1567285458 {
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
      ".c {
        animation: a 2s linear infinite;
      }
      .d {
        animation: a-1567285458 2s linear infinite;
      }
      @keyframes a {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }
      @keyframes a-1567285458 {
        0% {
          right: 0%;
        }
        100% {
          right: 100%;
        }
      }"
    `);
  });
  it('namespaced StyleSheetManager works with animations', () => {
    const rotate = keyframes`
    0% {
      transform: rotate(0deg)
    }
    100% {
      transform: rotate(360deg)
    }
  `;

    const TestAnim = styled.div`
      color: blue;
      animation: ${rotate} 0.75s infinite linear;
    `;

    TestRenderer.create(
      <StyleSheetManager namespace=".animparent">
        <div>
          <TestAnim>Foo</TestAnim>
        </div>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .animparent .c{color:blue;animation:a 0.75s infinite linear;}@keyframes a{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
      </style>
    `);
  });
});
