import { render } from '@testing-library/react';
import React from 'react';
import rscPlugin from '../../plugins/rsc';
import Keyframes from '../../models/Keyframes';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import ThemeProvider from '../../models/ThemeProvider';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import { resetWarnOnce } from '../../utils/warnOnce';
import createTheme from '../createTheme';
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

  it('drops the frame around a stray `}` and keeps the frame on the next line', () => {
    const animation = keyframes`
      0% { opacity: 0; } }
      100% { opacity: 1; }
    `;
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

  it('reads a nested css fragment as its text, values included', () => {
    const frames = keyframes`${css`from { opacity: ${0.5}; transform: scale(${2}); }`} to { opacity: 1; }`;

    expect(frames.rules).toBe('from { opacity: 0.5; transform: scale(2); } to { opacity: 1; }');
  });

  it('reads a css fragment inside a css fragment at any depth', () => {
    const inner = css`opacity: ${0.5};`;
    const middle = css`from { ${inner} transform: scale(${2}); }`;
    const frames = keyframes`${middle} to { ${css`${css`opacity: ${'1'};`}`} }`;

    expect(frames.rules).toBe('from { opacity: 0.5; transform: scale(2); } to { opacity: 1; }');
  });

  describe('a style object', () => {
    it('reads as the CSS a styled template gives, inside a stop', () => {
      const frames = keyframes`from { ${{ opacity: 0, marginTop: 4 }} } to { opacity: 1; }`;

      expect(frames.rules).toBe('from { opacity:0;margin-top:4px; } to { opacity: 1; }');
    });

    it('reads as the CSS a styled template gives, as stops', () => {
      const frames = keyframes`${{ from: { opacity: 0 }, to: { opacity: 1 } }}`;

      expect(frames.rules).toBe('from{opacity:0;}to{opacity:1;}');
    });

    it('reads inside a nested css fragment', () => {
      const frames = keyframes`${css`from { ${{ opacity: 0 }} }`} to { opacity: 1; }`;

      expect(frames.rules).toBe('from { opacity:0; } to { opacity: 1; }');
    });

    it('reads a css fragment held as a value', () => {
      const frames = keyframes`from { ${{ opacity: css`${0.5}` }} } to { opacity: 1; }`;

      expect(frames.rules).toBe('from { opacity:0.5; } to { opacity: 1; }');
    });

    it('keeps a text value inside its declaration, and warns', () => {
      resetWarnOnce();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const frames = keyframes`from { ${{ opacity: '0; } body { color: red' }} } to { opacity: 1; }`;
      const warnings = warn.mock.calls;
      warn.mockRestore();

      expect({ rules: frames.rules, warnings }).toEqual({
        rules: 'from { opacity:0;; } to { opacity: 1; }',
        warnings: [
          [
            '[sc] An interpolated value holds an unmatched brace or leaves a string, paren, or bracket open, so "} body { color: red" was dropped. Write a value as `property: value;` declarations or whole `selector { ... }` rules.',
          ],
        ],
      });
    });
  });

  it('leaves out a boolean, as a styled template does', () => {
    const frames = keyframes`from { opacity: 0; }${true} to { opacity: 1; }`;

    expect(frames.rules).toBe('from { opacity: 0; } to { opacity: 1; }');
  });

  describe('a createTheme value', () => {
    it('reads as its CSS variable reference with the default as fallback', () => {
      const theme = createTheme({ dim: 0.2 });
      const frames = keyframes`from { opacity: 1; } to { opacity: ${theme.dim}; }`;

      expect(frames.rules).toBe('from { opacity: 1; } to { opacity: var(--sc-dim, 0.2); }');
    });

    it('keeps one keyframes name and one @keyframes rule across themes', () => {
      const theme = createTheme({ dim: 0.2 });
      const frames = keyframes`from { opacity: 1; } to { opacity: ${theme.dim}; }`;
      const Box = styled.div`
        animation: ${frames} 1s forwards;
      `;

      render(
        <>
          <ThemeProvider theme={{ dim: 0.4 }}>
            <theme.GlobalStyle />
            <Box />
          </ThemeProvider>
          <ThemeProvider theme={{ dim: 0.8 }}>
            <Box />
          </ThemeProvider>
        </>
      );

      const name = frames.getName();
      const css = getRenderedCSS();
      const keyframeRules = css.split(`@keyframes ${name} `).length - 1;
      const animationRules = css.split(`animation: ${name} 1s forwards;`).length - 1;

      expect({ animationRules, keyframeRules }).toEqual({ animationRules: 1, keyframeRules: 1 });
    });
  });

  describe('a function interpolation', () => {
    const message =
      '[sc] A function was interpolated into keyframes and was left out: keyframes are built once where they are defined, so there are no props or theme to call it with. For a theme value, interpolate the createTheme value; otherwise interpolate the value itself, or build the keyframes inside the function that has it.';
    let warn: jest.SpyInstance;

    beforeEach(() => {
      resetWarnOnce();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('contributes no text, and warns once', () => {
      const frames = keyframes`from { opacity: ${() => 0}; } to { opacity: ${() => 1}; }`;

      expect({ rules: frames.rules, warnings: warn.mock.calls }).toEqual({
        rules: 'from { opacity: ; } to { opacity: ; }',
        warnings: [[message]],
      });
    });

    it('contributes no text inside a nested css fragment, and warns once', () => {
      const frames = keyframes`${css`from { opacity: ${css`${() => 0}`}; }`} to { opacity: 1; }`;

      expect({ rules: frames.rules, warnings: warn.mock.calls }).toEqual({
        rules: 'from { opacity: ; } to { opacity: 1; }',
        warnings: [[message]],
      });
    });

    it('contributes no text as a style object value, and warns once', () => {
      const frames = keyframes`from { ${{ opacity: () => 0, marginTop: 4 }} } to { opacity: 1; }`;

      expect({ rules: frames.rules, warnings: warn.mock.calls }).toEqual({
        rules: 'from { opacity:;margin-top:4px; } to { opacity: 1; }',
        warnings: [[message]],
      });
    });

    it('keeps the class a styled component interpolates as', () => {
      const Box = styled.div`
        color: red;
      `;
      const frames = keyframes`${Box} { opacity: 1; }`;

      expect({ rules: frames.rules, warnings: warn.mock.calls }).toEqual({
        rules: `.${Box.styledComponentId} { opacity: 1; }`,
        warnings: [],
      });
    });
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
        animation: b 1s linear, a 1s linear;
      }
      .f {
        animation: a 1s linear;
      }
      .g {
        animation: b 1s linear;
      }"
    `);
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
