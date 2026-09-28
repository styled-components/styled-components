import { render } from '@testing-library/react';
import React from 'react';
import rscPlugin from '../../plugins/rsc';
import Keyframes from '../../models/Keyframes';
import { mainCompiler, StyleSheetManager } from '../../models/StyleSheetManager';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import { resetWarnOnce } from '../../utils/warnOnce';
import css from '../css';
import keyframes from '../keyframes';

// Disable isStaticRules optimization since we're not
// testing for WebStyle specifics here
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
    render(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      .c {
        animation: a 2s linear infinite;
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

    render(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      .c {
        animation: a 2s linear infinite;
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
        '&:hover': {
          animation: css`
            ${animation} 10s linear infinite
          `,
        },
      },
    });

    render(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      @media (max-width:700px) {
        .c {
          animation: a 2s linear infinite;
        }
        .c:hover {
          animation: a 10s linear infinite;
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

    const Comp = styled.div<{ $animation: any }>`
      animation: ${props => props.$animation} 2s linear infinite;
    `;
    render(<Comp $animation={animation} />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
      .c {
        animation: a 2s linear infinite;
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

    render(<App />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes b {
        from {
          transform: translateX(-10px);
        }
        to {
          transform: none;
        }
      }
      .d {
        animation: none;
      }
      .e {
        animation: b 1s linear,
          a 1s linear;
      }
      .f {
        animation: a 1s linear;
      }
      .g {
        animation: b 1s linear;
      }"
    `);
  });

  it('writes a function interpolation as its source text, with a dev warning naming the keyframes', () => {
    resetWarnOnce();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const opacity = () => 0;
    const fade = keyframes`from { opacity: ${opacity}; }`;
    expect(fade.rules).toBe(`from { opacity: ${String(opacity)}; }`);
    expect(warn.mock.calls.map(call => String(call[0]))).toEqual([
      expect.stringContaining('`keyframes` `' + fade.name + '`'),
    ]);
    warn.mockRestore();
  });

  it('writes a styled component interpolated into keyframes as its class selector, without a warning', () => {
    resetWarnOnce();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Box = styled.div``;
    const fade = keyframes`from { opacity: 0; } /* ${Box} */`;
    expect(fade.rules).toBe(`from { opacity: 0; } /* ${String(Box)} */`);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('should throw an error when interpolated in a vanilla string', () => {
    const animation = keyframes``;

    expect(() => `animation-name: ${animation};`).toThrow();
  });

  it('should apply StyleSheetManager plugins to injected keyframes', () => {
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
    render(
      <StyleSheetManager plugins={[rscPlugin]}>
        <Comp />
      </StyleSheetManager>
    );

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes aAxDRB {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }
      .c {
        animation: aAxDRB 2s linear infinite;
      }"
    `);
  });

  it('should reinject if used in different StyleSheetManager plugin contexts', () => {
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
    render(
      <>
        <Comp />
        <StyleSheetManager plugins={[rscPlugin]}>
          <Comp />
        </StyleSheetManager>
      </>
    );

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }
      @keyframes aAxDRB {
        0% {
          left: 0%;
        }
        100% {
          left: 100%;
        }
      }
      .c {
        animation: a 2s linear infinite;
      }
      .d {
        animation: aAxDRB 2s linear infinite;
      }"
    `);
  });
  it('compiles a referenced keyframes value once across renders', () => {
    const fade = keyframes`
      from { opacity: 0; }
      to { opacity: 1; }
    `;
    const Comp = styled.div<{ $ms: number }>`
      animation: ${fade} ${p => p.$ms}ms linear;
    `;
    const compileSpy = jest.spyOn(mainCompiler, 'compile');

    const { rerender } = render(<Comp $ms={100} />);
    rerender(<Comp $ms={200} />);
    rerender(<Comp $ms={300} />);

    const keyframesCompiles = compileSpy.mock.calls.filter(call => call[2] === '@keyframes');
    expect(keyframesCompiles).toHaveLength(1);
    expect(getRenderedCSS()).toContain('@keyframes ' + fade.getName());
    compileSpy.mockRestore();
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

    render(
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
      </style>
    `);
  });
});
