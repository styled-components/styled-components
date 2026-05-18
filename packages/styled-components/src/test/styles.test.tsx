import { render } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../base';
import css from '../constructors/css';
import { mainSheet } from '../models/StyleSheetManager';
import * as nonce from '../utils/nonce';
import { getRenderedCSS, resetStyled } from './utils';

jest.mock('../utils/nonce');
jest.spyOn(nonce, 'default').mockImplementation(() => 'foo');

let styled: ReturnType<typeof resetStyled>;

describe('with styles', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    document.head.innerHTML = '';
    styled = resetStyled();
  });

  it('should append a style', () => {
    const rule = 'color: blue;';
    const Comp = styled.div`
      ${rule};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: blue;
      }"
    `);
  });

  it('should append multiple styles', () => {
    const rule1 = 'color: blue;';
    const rule2 = 'background: red;';
    const Comp = styled.div`
      ${rule1} ${rule2};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: blue;
        background: red;
      }"
    `);
  });

  it('ampersand should refer to the static class when making a self-referential combo selector', () => {
    const Comp = styled.div<{ color: string }>`
      background: red;
      color: ${p => p.color};

      & {
        display: flex;
      }

      &&& {
        border: 1px solid red;
      }

      &[disabled] {
        color: red;

        & + & {
          margin-bottom: 4px;
        }

        & > & {
          margin-top: 4px;
        }
      }

      & + & {
        margin-left: 4px;
      }

      & + & ~ & {
        background: black;
      }

      & ~ & {
        margin-right: 4px;
      }

      & > & {
        margin-top: 4px;
      }

      .foo & {
        color: silver;
      }

      .foo > & {
        color: green;
      }

      &:not(& ~ &) {
        color: cornflowerblue;
      }
    `;
    render(
      <React.Fragment>
        <Comp color="white" />
        <Comp color="red" />
      </React.Fragment>
    );
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        background: red;
        color: white;
      }
      .a {
        display: flex;
      }
      .a.a.a {
        border: 1px solid red;
      }
      .a[disabled] {
        color: red;
      }
      .a[disabled] + .a[disabled] {
        margin-bottom: 4px;
      }
      .a[disabled] > .a[disabled] {
        margin-top: 4px;
      }
      .sc-kqxcKS + .sc-kqxcKS {
        margin-left: 4px;
      }
      .sc-kqxcKS + .sc-kqxcKS ~ .sc-kqxcKS {
        background: black;
      }
      .sc-kqxcKS ~ .sc-kqxcKS {
        margin-right: 4px;
      }
      .sc-kqxcKS > .sc-kqxcKS {
        margin-top: 4px;
      }
      .foo .a {
        color: silver;
      }
      .foo > .a {
        color: green;
      }
      .a:not(.a ~ .a) {
        color: cornflowerblue;
      }
      .b {
        background: red;
        color: red;
      }
      .b {
        display: flex;
      }
      .b.b.b {
        border: 1px solid red;
      }
      .b[disabled] {
        color: red;
      }
      .b[disabled] + .b[disabled] {
        margin-bottom: 4px;
      }
      .b[disabled] > .b[disabled] {
        margin-top: 4px;
      }
      .sc-kqxcKS + .sc-kqxcKS {
        margin-left: 4px;
      }
      .sc-kqxcKS + .sc-kqxcKS ~ .sc-kqxcKS {
        background: black;
      }
      .sc-kqxcKS ~ .sc-kqxcKS {
        margin-right: 4px;
      }
      .sc-kqxcKS > .sc-kqxcKS {
        margin-top: 4px;
      }
      .foo .b {
        color: silver;
      }
      .foo > .b {
        color: green;
      }
      .b:not(.b ~ .b) {
        color: cornflowerblue;
      }"
    `);
  });

  it('should handle inline style objects', () => {
    const rule1 = {
      backgroundColor: 'blue',
    };
    const Comp = styled.div`
      ${rule1};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        background-color: blue;
      }"
    `);
  });

  it('honors a custom toString on a value inside an inline style object (#5740)', () => {
    // Design-token shape; `toString` returns the canonical value while
    // the alternates ride along for explicit lookups (`token.subtle`).
    const ink = {
      default: '#000',
      subtle: '#444',
      toString() {
        return this.default;
      },
    };
    const Comp = styled.div`
      ${{ color: ink, background: ink }};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: #000;
        background: #000;
      }"
    `);
  });

  it('honors a custom toString on a value-position interpolation in a template literal (#5740)', () => {
    // Same design-token shape, but interpolated directly into a value
    // slot (the reporter's original repro). Verifies the `resolveInterpolation`
    // path, separate from the inline-object path covered above.
    const ink = {
      default: '#000',
      subtle: '#444',
      toString() {
        return this.default;
      },
    };
    const Comp = styled.div`
      color: ${ink};
      background: ${ink};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: #000;
        background: #000;
      }"
    `);
  });

  it('should handle inline style objects with media queries', () => {
    const rule1 = {
      backgroundColor: 'blue',
      '@media screen and (min-width: 250px)': {
        backgroundColor: 'red',
      },
    };
    const Comp = styled.div`
      ${rule1};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        background-color: blue;
      }
      @media screen and (min-width:250px) {
        .a {
          background-color: red;
        }
      }"
    `);
  });

  it('should handle inline style objects with pseudo selectors', () => {
    const rule1 = {
      backgroundColor: 'blue',
      '&:hover': {
        color: 'green',
      },
    };
    const Comp = styled.div`
      ${rule1};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        background-color: blue;
      }
      .a:hover {
        color: green;
      }"
    `);
  });

  it('should handle inline style objects with nesting', () => {
    const rule1 = {
      backgroundColor: 'blue',
      '> h1': {
        color: 'white',
      },
    };
    const Comp = styled.div`
      ${rule1};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        background-color: blue;
      }
      .a > h1 {
        color: white;
      }"
    `);
  });

  it('should handle inline style objects with contextual selectors', () => {
    const rule1 = {
      backgroundColor: 'blue',
      'html.something &': {
        color: 'white',
      },
    };
    const Comp = styled.div`
      ${rule1};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        background-color: blue;
      }
      html.something .a {
        color: white;
      }"
    `);
  });

  it('should inject styles of multiple components', () => {
    const firstRule = 'background: blue;';
    const secondRule = 'background: red;';
    const FirstComp = styled.div`
      ${firstRule};
    `;
    const SecondComp = styled.div`
      ${secondRule};
    `;

    render(<FirstComp />);
    render(<SecondComp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        background: blue;
      }
      .b {
        background: red;
      }"
    `);
  });

  it('should inject styles of multiple components based on creation, not rendering order', () => {
    const firstRule = 'content: "first rule";';
    const secondRule = 'content: "second rule";';
    const FirstComp = styled.div`
      ${firstRule};
    `;
    const SecondComp = styled.div`
      ${secondRule};
    `;

    // Switch rendering order, shouldn't change injection order
    render(<SecondComp />);
    render(<FirstComp />);

    // Classes _do_ get generated in the order of rendering but that's ok
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        content: "first rule";
      }
      .a {
        content: "second rule";
      }"
    `);
  });

  it('should strip a JS-style (invalid) comment in the styles', () => {
    const comment = '// This is an invalid comment';
    const rule = 'color: blue;';
    // prettier-ignore
    const Comp = styled.div`
      ${comment}
      ${rule}
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: blue;
      }"
    `);
  });

  it('should respect removed rules', () => {
    const Heading = styled.h1`
      color: red;
    `;
    const Text = styled.span`
      color: green;
    `;

    render(
      <Heading>
        <Text />
      </Heading>
    );
    mainSheet.clearRules(Text.styledComponentId);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: red;
      }"
    `);
  });

  it('should add a webpack nonce to the style tags if one is available in the global scope', () => {
    const rule = 'color: blue;';
    const Comp = styled.div`
      ${rule};
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: blue;
      }"
    `);

    Array.from(document.querySelectorAll('style')).forEach(el => {
      expect(el.getAttribute('nonce')).toBe('foo');
    });
  });

  it('should handle functions inside TTL that return css constructor', () => {
    const Comp = styled.div<{ variant: 'foo' | 'bar' }>`
      color: ${p => (p.variant === 'bar' ? css`green` : 'red')};
    `;

    render(<Comp variant="bar" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: green;
      }"
    `);
  });

  it('block-position ternary between two css fragments emits per-branch classes', () => {
    const Comp = styled.div<{ $primary?: boolean }>`
      ${p =>
        p.$primary
          ? css`
              background: blue;
              color: white;
            `
          : css`
              background: white;
              color: blue;
            `}
    `;

    const { rerender } = render(<Comp $primary />);
    rerender(<Comp />);
    rerender(<Comp $primary />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        background: blue;
        color: white;
      }
      .b {
        background: white;
        color: blue;
      }"
    `);
  });

  it('conditional styles should only apply to the relevant component instance', () => {
    interface IconProps {
      $color?: string;
      $rounded?: boolean;
      $spin?: boolean;
    }

    const spinCss = css`
      @keyframes iconSpin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      animation-name: iconSpin;
      animation-duration: 1000ms;
      animation-iteration-count: infinite;
      animation-timing-function: linear;
    `;

    const Wrapper = styled.span<IconProps>`
      vertical-align: middle;
      display: inline-block;
      line-height: ${({ theme }) => theme.lineHeights!.sm};
      font-size: ${({ theme }) => theme.fontSizes!.sm};

      & > svg {
        stroke: ${({ theme, $color }): string =>
          $color && $color !== 'inherit' ? theme.colors![$color] : 'currentColor'};
        ${({ $spin }): any => ($spin ? spinCss : '')};
      }
      ${({ $rounded }): string => ($rounded ? 'border-radius: 9999px;' : '')};
    `;

    render(
      // spinCss should only be added if spin is true. Meanwhile, when any icon component in the application receives spin=true prop, all icons in the app start spinning (see video).

      <ThemeProvider
        theme={{
          colors: { red: 'darkred' },
          fontSizes: { sm: '14px' },
          lineHeights: { sm: '20px' },
        }}
      >
        <Wrapper />
        <Wrapper $spin />
        <Wrapper $color="red" />
      </ThemeProvider>
    );
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        vertical-align: middle;
        display: inline-block;
        line-height: 20px;
        font-size: 14px;
      }
      .a > svg {
        stroke: currentColor;
      }
      .b {
        vertical-align: middle;
        display: inline-block;
        line-height: 20px;
        font-size: 14px;
      }
      .b > svg {
        stroke: currentColor;
        animation-name: iconSpin;
        animation-duration: 1000ms;
        animation-iteration-count: infinite;
        animation-timing-function: linear;
      }
      @keyframes iconSpin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .c {
        vertical-align: middle;
        display: inline-block;
        line-height: 20px;
        font-size: 14px;
      }
      .c > svg {
        stroke: darkred;
      }"
    `);
  });

  it('comma-joined complex selector chains should be namespaced', () => {
    const Comp = styled.h1`
      &.foo,
      p:not(:last-child) {
        color: red;
      }
    `;

    render(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a.foo, .a p:not(:last-child) {
        color: red;
      }"
    `);
  });

  it('should preserve styles after a malformed declaration with unbalanced brace', () => {
    // Ensures unbalanced braces in interpolated values don't break subsequent styles
    // In v6, a syntax error like an extra `}` in a value would cause all subsequent styles to be ignored
    const Comp = styled.div`
      width: 100px;
      height: 100px;
      border-radius: 50%;
      line-height: ${'14px}"'}; /* Simulates: ${() => '14px}'} - syntax error with extra } */
      background-color: green;
    `;
    render(<Comp />);

    // The malformed line-height should be dropped, but background-color should still apply
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background-color: green;
      }"
    `);
  });

  describe('css helper', () => {
    it('should support css`` fragments with their own interpolations', () => {
      const dynamicMixin = css<{ $spacing: number }>`
        padding: ${p => p.$spacing}px;
        margin: ${p => p.$spacing / 2}px;
      `;
      const Comp = styled.div<{ $spacing: number }>`
        color: red;
        ${dynamicMixin}
      `;
      render(<Comp $spacing={16} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: red;
          padding: 16px;
          margin: 8px;
        }"
      `);
    });

    it('should support css`` with nested @media', () => {
      const responsive = css`
        font-size: 14px;
        @media (min-width: 768px) {
          font-size: 16px;
        }
      `;
      const Comp = styled.div`
        ${responsive}
        color: black;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          font-size: 14px;
          color: black;
        }
        @media (min-width:768px) {
          .a {
            font-size: 16px;
          }
        }"
      `);
    });

    it('should handle CSS custom properties set via css``', () => {
      const tokenMixin = css`
        --color-primary: blue;
        --spacing-sm: 4px;
        --spacing-md: 8px;
      `;
      const Comp = styled.div`
        ${tokenMixin}
        color: var(--color-primary);
        padding: var(--spacing-md);
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          --color-primary: blue;
          --spacing-sm: 4px;
          --spacing-md: 8px;
          color: var(--color-primary);
          padding: var(--spacing-md);
        }"
      `);
    });
  });

  describe('css feature pass-through', () => {
    it('should pass through transition property unchanged', () => {
      const Comp = styled.div`
        transition: opacity 0.3s;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          transition: opacity 0.3s;
        }"
      `);
    });

    it('should pass through flexbox properties unchanged', () => {
      const Comp = styled.div`
        display: flex;
        flex-direction: column;
        align-items: center;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          display: flex;
          flex-direction: column;
          align-items: center;
        }"
      `);
    });

    it('should generate styles for nested media queries', () => {
      const Comp = styled.div`
        @media (min-width: 10px) {
          @media (min-height: 20px) {
            color: red;
          }
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@media (min-width:10px) {
          @media (min-height:20px) {
            .a {
              color: red;
            }
          }
        }"
      `);
    });

    it('should pass through custom properties', () => {
      const Comp = styled.div`
        --custom-prop: some-val;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          --custom-prop: some-val;
        }"
      `);
    });
  });

  describe('real-world composition patterns', () => {
    it('multiple interpolations in a single declaration value', () => {
      const Comp = styled.div<{ $w: number; $s: string; $c: string }>`
        border: ${p => p.$w}px ${p => p.$s} ${p => p.$c};
      `;
      render(<Comp $w={2} $s="solid" $c="red" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          border: 2px solid red;
        }"
      `);
    });

    it('multiple interpolations in shorthand value with fallback', () => {
      const Comp = styled.div<{ $x: string; $y: string; $blur: string; $color: string }>`
        box-shadow: ${p => p.$x} ${p => p.$y} ${p => p.$blur} ${p => p.$color};
      `;
      render(<Comp $x="0px" $y="4px" $blur="6px" $color="rgba(0,0,0,0.1)" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
        }"
      `);
    });

    it('interpolation inside @media prelude', () => {
      const breakpoint = 768;
      const Comp = styled.div`
        color: blue;
        @media (min-width: ${breakpoint}px) {
          color: red;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: blue;
        }
        @media (min-width:768px) {
          .a {
            color: red;
          }
        }"
      `);
    });

    it('deeply nested @media with pseudo and theme interpolation', () => {
      const theme = { bp: '768px', hoverColor: 'crimson', focusOutline: '2px solid blue' };
      const Comp = styled.div`
        color: black;
        @media (min-width: ${theme.bp}) {
          &:hover {
            color: ${theme.hoverColor};
          }
          &:focus {
            outline: ${theme.focusOutline};
          }
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: black;
        }
        @media (min-width:768px) {
          .a:hover {
            color: crimson;
          }
          .a:focus {
            outline: 2px solid blue;
          }
        }"
      `);
    });

    it('theme-driven interpolations via ThemeProvider', () => {
      const Comp = styled.div`
        color: ${p => p.theme.fg};
        background: ${p => p.theme.bg};
        padding: ${p => p.theme.space}px;
      `;
      render(
        <ThemeProvider theme={{ fg: 'white', bg: '#333', space: 16 }}>
          <Comp />
        </ThemeProvider>
      );
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: white;
          background: #333;
          padding: 16px;
        }"
      `);
    });

    it('mixed static and dynamic declarations in the same block', () => {
      const Comp = styled.div<{ $highlight: string }>`
        display: flex;
        align-items: center;
        color: ${p => p.$highlight};
        font-size: 14px;
        background: ${p => (p.$highlight === 'red' ? '#fee' : '#eef')};
        border-radius: 4px;
      `;
      render(<Comp $highlight="red" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          display: flex;
          align-items: center;
          color: red;
          font-size: 14px;
          background: #fee;
          border-radius: 4px;
        }"
      `);
    });

    it('css`` helper composed inside an interpolation', () => {
      const truncate = css`
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      const Comp = styled.div`
        ${truncate}
        max-width: 200px;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }"
      `);
    });

    it('conditional css`` fragments inside interpolation', () => {
      const Comp = styled.div<{ $active: boolean }>`
        color: black;
        ${p =>
          p.$active
            ? css`
                background: blue;
                color: white;
              `
            : css`
                background: gray;
                opacity: 0.5;
              `}
      `;
      render(<Comp $active />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: white;
          background: blue;
        }"
      `);
    });

    it('nested css`` fragments (composition of compositions)', () => {
      const fontStack = css`
        font-family: 'Inter', sans-serif;
        font-weight: 400;
      `;
      const baseCard = css`
        ${fontStack}
        padding: 16px;
        border-radius: 8px;
      `;
      const Comp = styled.div`
        ${baseCard}
        background: white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          padding: 16px;
          border-radius: 8px;
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }"
      `);
    });

    it('CSS custom properties with interpolated fallbacks', () => {
      const fallbackColor = 'coral';
      const Comp = styled.div`
        color: var(--theme-color, ${fallbackColor});
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--theme-color, coral);
        }"
      `);
    });

    it('nested var() with interpolated inner fallback', () => {
      const Comp = styled.div<{ $fallback: string }>`
        color: var(--primary, var(--secondary, ${p => p.$fallback}));
      `;
      render(<Comp $fallback="hotpink" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--primary, var(--secondary, hotpink));
        }"
      `);
    });

    it('@media + @supports combined with interpolation', () => {
      const Comp = styled.div<{ $gap: string }>`
        display: flex;
        @supports (display: grid) {
          display: grid;
          @media (min-width: 600px) {
            grid-template-columns: repeat(3, 1fr);
            gap: ${p => p.$gap};
          }
        }
      `;
      render(<Comp $gap="1rem" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          display: flex;
        }
        @supports (display:grid) {
          .a {
            display: grid;
          }
          @media (min-width:600px) {
            .a {
              grid-template-columns: repeat(3, 1fr);
              gap: 1rem;
            }
          }
        }"
      `);
    });

    it('component selector with theme-driven child styles', () => {
      const Icon = styled.span`
        font-size: 20px;
      `;
      const Button = styled.button`
        color: ${p => p.theme.color};
        ${Icon} {
          margin-right: 8px;
          color: inherit;
        }
      `;
      render(
        <ThemeProvider theme={{ color: 'navy' }}>
          <Button>
            <Icon />
            Click me
          </Button>
        </ThemeProvider>
      );
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          font-size: 20px;
        }
        .a {
          color: navy;
        }
        .a .sc-kqxcKS {
          margin-right: 8px;
          color: inherit;
        }"
      `);
    });

    it('deeply nested pseudo-classes inside @media with theme interpolation', () => {
      const Comp = styled.a`
        color: ${p => p.theme.link};
        @media (min-width: 768px) {
          &:hover {
            color: ${p => p.theme.linkHover};
            &::after {
              content: ' →';
              color: ${p => p.theme.accent};
            }
          }
        }
      `;
      render(
        <ThemeProvider theme={{ link: 'blue', linkHover: 'darkblue', accent: 'orange' }}>
          <Comp href="#" />
        </ThemeProvider>
      );
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: blue;
        }
        @media (min-width:768px) {
          .a:hover {
            color: darkblue;
          }
          .a:hover::after {
            content: ' →';
            color: orange;
          }
        }"
      `);
    });

    it('inline @keyframes with static frames', () => {
      const Comp = styled.div`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        animation: spin 1s linear infinite;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }"
      `);
    });

    it('inline @keyframes with interpolation in frame values', () => {
      const Comp = styled.div<{ $deg: number }>`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(${p => p.$deg}deg);
          }
        }
        animation: spin 1s linear infinite;
      `;
      render(<Comp $deg={360} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }"
      `);
    });

    it('inline @keyframes with interpolation in animation shorthand', () => {
      const Comp = styled.div<{ $dur: string }>`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        animation: fadeIn ${p => p.$dur} ease-in;
      `;
      render(<Comp $dur="0.3s" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }"
      `);
    });
  });
});
