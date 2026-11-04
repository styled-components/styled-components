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

  it('keeps a runtime value with a stray `}` inside the component when the template has a comment', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = styled.div<{ $v: string }>`
      color: ${p => p.$v}; /* note */
    `;
    render(<Comp $v="red; } body { background: red } x {" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: red;
      }"
    `);
  });

  it('keeps rendering when a runtime value nests rules past the parser depth cap', () => {
    const Comp = styled.div<{ $v: string }>`
      color: ${p => p.$v};
    `;
    render(<Comp $v={'red; ' + 'a{'.repeat(80_000) + 'color:blue;' + '}'.repeat(80_000)} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: red;
      }"
    `);
  });

  it('keeps a runtime value with a stray `}` inside the component when the template has no comment', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = styled.div<{ $v: string }>`
      color: ${p => p.$v};
    `;
    render(<Comp $v="red; } body { background: red } x {" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: red;
      }"
    `);
  });

  it('keeps a runtime value from closing a nested block in the template', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = styled.div<{ $v: string }>`
      a {
        color: ${p => p.$v};
      }
      b {
        top: 0;
      }
    `;
    render(<Comp $v="red; } c { top: 1" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a a {
        color: red;
      }
      .a b {
        top: 0;
      }"
    `);
  });

  it('drops a runtime value that leaves a block open, keeping the template around it', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = styled.div<{ $v: string }>`
      color: ${p => p.$v};
      margin: 0;
      b {
        top: 0;
      }
    `;
    render(<Comp $v="red; a { top: 1" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: red;
        margin: 0;
      }
      .a b {
        top: 0;
      }"
    `);
  });

  it('gives two values that differ only in text a dropped value would hold their own classes', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = styled.div<{ $a: string; $b: string }>`
      ${p => p.$a} ${p => p.$b}
    `;
    const { container, rerender } = render(<Comp $a={'"'} $b={'x { top: 1px } "}'} />);
    const first = container.firstElementChild?.className;
    rerender(<Comp $a={'"'} $b={'x { top: 2px } "}'} />);
    expect(container.firstElementChild?.className).not.toEqual(first);
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
    // biome-ignore format: the template's exact content is what this asserts on
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
    jest.spyOn(console, 'warn').mockImplementation(() => {});
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

  describe('a slot at the start of a statement', () => {
    let Child: ReturnType<typeof styled.span>;
    let Other: ReturnType<typeof styled.b>;
    let child: string;
    let other: string;

    beforeEach(() => {
      Child = styled.span``;
      Other = styled.b``;
      child = `.${Child.styledComponentId}`;
      other = `.${Other.styledComponentId}`;
    });

    it.each<[string, () => React.ComponentType, () => string]>([
      [
        'before a type selector',
        () => styled.div`${Child} h2 { color: red; }`,
        () => `${child} h2`,
      ],
      [
        'before two type selectors',
        () => styled.div`${Child} h2 a { color: red; }`,
        () => `${child} h2 a`,
      ],
      [
        'before a type selector on the next line',
        () => styled.div`
          ${Child}
          h2 {
            color: red;
          }
        `,
        () => `${child} h2`,
      ],
      [
        'in a selector list',
        () => styled.div`${Child}, ${Other} { color: red; }`,
        () => `${child}, .a ${other}`,
      ],
      [
        'before another component',
        () => styled.div`${Child} ${Other} { color: red; }`,
        () => `${child} ${other}`,
      ],
      ['before a comment', () => styled.div`${Child} /* note */ { color: red; }`, () => child],
      [
        'before a comment holding a stop',
        () => styled.div`${Child} /* a; b { */ h2 { color: red; }`,
        () => `${child} h2`,
      ],
      [
        'before a line comment holding a stop',
        () => styled.div`${Child} // a; b
        h2 { color: red; }`,
        () => `${child} h2`,
      ],
      [
        'returned by a function',
        () => styled.div`${() => Child} h2 { color: red; }`,
        () => `${child} h2`,
      ],
      [
        'returned by a function on the line before',
        () => styled.div`
          ${() => Child}
          h2 {
            color: red;
          }
        `,
        () => `${child} h2`,
      ],
      [
        'returned by functions in a list',
        () => styled.div`${() => Child}, ${() => Other} { color: red; }`,
        () => `${child}, .a ${other}`,
      ],
      [
        'with a quoted attribute holding a slot',
        () => styled.div`${Child} a[title="${'x'}"] { color: red; }`,
        () => `${child} a[title="x"]`,
      ],
    ])('keeps a component %s', (_title, build, selector) => {
      const Comp = build();
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(`.a ${selector()} {\n  color: red;\n}`);
    });

    it('keeps a component after a declaration', () => {
      const Comp = styled.div`
        color: green;
        ${Child} h2 {
          color: red;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(
        `.a {\n  color: green;\n}\n.a ${child} h2 {\n  color: red;\n}`
      );
    });

    it('keeps a component inside a nested rule', () => {
      const Comp = styled.div`
        .x {
          ${Child} h2 {
            color: red;
          }
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(`.a .x ${child} h2 {\n  color: red;\n}`);
    });

    it.each<[string, unknown]>([
      ['a string', 'h1, h2'],
      ['a function', () => 'h1, h2'],
      ['a css fragment', css`h1, h2`],
      ['an array', ['h1', ', h2']],
    ])('scopes every selector of a list held by %s', (_title, list) => {
      const Comp = styled.div`${list as string} { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a h1, .a h2 {\n  color: red;\n}');
    });

    it('keeps a comma inside a function selector within one selector', () => {
      const Comp = styled.div`${() => ':is(h1, h2)'} { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a :is(h1, h2) {\n  color: red;\n}');
    });

    it('reads an at-rule held by a slot with space before it', () => {
      const Comp = styled.div`${() => ' @media (min-width: 1px)'} { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('@media (min-width:1px) {\n  .a {\n    color: red;\n  }\n}');
    });

    const margin = css`
      margin: 0;
    `;

    it.each<[string, unknown]>([
      ['a css fragment', margin],
      ['a string', 'margin: 0;'],
      ['a function returning a string', () => 'margin: 0;'],
      ['a function returning a css fragment', () => margin],
      ['a style object', { margin: 0 }],
      ['a function returning a style object', () => ({ margin: 0 })],
    ])('reads %s with no semicolon before a rule as declarations', (_title, mixin) => {
      const expected = '.a {\n  margin: 0;\n}\n.a h2 {\n  color: red;\n}';
      const NextLine = styled.div`
        ${mixin as string}
        h2 {
          color: red;
        }
      `;
      // The babel plugin's minifier joins the lines, so a newline carries no meaning.
      const SameLine = styled.div`${mixin as string} h2{color:red;}`;

      const { unmount } = render(<NextLine />);
      expect(getRenderedCSS()).toEqual(expected);
      unmount();
      resetStyled();

      render(<SameLine />);
      expect(getRenderedCSS()).toEqual(expected);
    });

    it.each<[string, unknown]>([
      ['a string', 'margin: 0'],
      ['a function returning a string', () => 'margin: 0'],
      ['a css fragment', css`margin: 0`],
      ['a function returning a css fragment', () => css`margin: 0`],
    ])('reads %s with no semicolon of its own before a rule as declarations', (_title, mixin) => {
      const Comp = styled.div`${mixin as string} h2{color:red;}`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a {\n  margin: 0;\n}\n.a h2 {\n  color: red;\n}');
    });

    it('keeps a comma in a value with no semicolon of its own before a rule', () => {
      const Comp = styled.div`${() => 'transition: a 1s, b 1s'} h2{color:red;}`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(
        '.a {\n  transition: a 1s, b 1s;\n}\n.a h2 {\n  color: red;\n}'
      );
    });

    it('reads a value with no semicolon of its own before a component rule as declarations', () => {
      const Comp = styled.div`${() => 'margin: 0'} ${Child} { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(`.a {\n  margin: 0;\n}\n.a ${child} {\n  color: red;\n}`);
    });

    it('reads a value with no semicolon of its own before a slot property as a declaration', () => {
      const Comp = styled.div`${() => 'margin: 0'} ${'color'}: red;`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a {\n  margin: 0;\n  color: red;\n}');
    });

    it('reads a mixin separated from a class selector as declarations', () => {
      const Comp = styled.div`${() => 'margin: 0'} .x{color:red;}`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a {\n  margin: 0;\n}\n.a .x {\n  color: red;\n}');
    });

    it('joins a component to a class selector written against it', () => {
      const Comp = styled.div`${Child}.x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(`.a ${child}.x {\n  color: red;\n}`);
    });

    it('keeps a component before a separate class selector', () => {
      const Comp = styled.div`${Child} .x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(`.a ${child} .x {\n  color: red;\n}`);
    });

    it.each<[string, unknown, string]>([
      ['a type selector', 'h2', 'h2'],
      ['an id selector', '#y', '#y'],
      ['an attribute selector', '[data-x]', '[data-x]'],
      ['the universal selector', '*', '*'],
      ['a class with a pseudo-class', '.y:hover', '.y:hover'],
      ['a function returning a type selector', () => 'h2', 'h2'],
      ['a css fragment holding a type selector', css`h2`, 'h2'],
      ['a function returning a css fragment holding a type selector', () => css`h2`, 'h2'],
    ])('keeps %s before a separate selector', (_title, slot, selector) => {
      const Comp = styled.div`${slot as string} .x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(`.a ${selector} .x {\n  color: red;\n}`);
    });

    it('reads a pseudo-class selector value before a separate selector as a selector', () => {
      const Comp = styled.div`${'a:hover'} .x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a a:hover .x {\n  color: red;\n}');
    });

    it('keeps a pseudo-class selector value written with `&`', () => {
      const Comp = styled.div`${'& a:hover'} .x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a a:hover .x {\n  color: red;\n}');
    });

    it('keeps a selector value before a type selector', () => {
      const Comp = styled.div`${'h2'} h3 { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a h2 h3 {\n  color: red;\n}');
    });

    it('keeps a selector value inside a nested rule', () => {
      const Comp = styled.div`.p { ${'h2'} .x { color: red; } }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a .p h2 .x {\n  color: red;\n}');
    });

    it('keeps a selector value after a declaration', () => {
      const Comp = styled.div`margin: 0; ${'h2'} .x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a {\n  margin: 0;\n}\n.a h2 .x {\n  color: red;\n}');
    });

    it.each<[string, unknown]>([
      ['a type selector', 'h2'],
      ['a class selector', '.y'],
      ['a css fragment holding a type selector', css`h2`],
    ])('adds nothing for %s before an at-rule', (_title, slot) => {
      const Comp = styled.div`${slot as string}
        @media (min-width: 1px) {
          color: red;
        }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('@media (min-width:1px) {\n  .a {\n    color: red;\n  }\n}');
    });

    it('adds nothing for a value in a statement of its own before a rule', () => {
      const Comp = styled.div`${'h2'}; .x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a .x {\n  color: red;\n}');
    });

    it('joins every value before a rule into its selector', () => {
      const Comp = styled.div`${'h2'} ${''} ${'.y'} .x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a h2 .y .x {\n  color: red;\n}');
    });

    it('stops joining values at one holding declarations', () => {
      const Comp = styled.div`${'h2'} ${'margin: 0;'} .x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a {\n  margin: 0;\n}\n.a .x {\n  color: red;\n}');
    });

    it('keeps a whole rule a value writes before a block with no selector of its own', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const Comp = styled.div`${'h2 { top: 0; }'} { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a h2 {\n  top: 0;\n}');
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it.each<[string, string]>([
      ['a block comment', 'h2 /* note'],
      ['a line comment', 'h2 // note'],
      ['a stray `}`', 'h2 } evil { top: 0'],
    ])('keeps the rule after a value that opens %s', (_title, value) => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      const Comp = styled.div`${value} .x { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a .x {\n  color: red;\n}');
    });

    it.each<[string, unknown]>([
      ['false', false],
      ['a function returning false', () => false],
    ])('drops the first selector of a list when it is %s', (_title, slot) => {
      const Comp = styled.div`${slot as string}, h2 { color: red; }`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a h2 {\n  color: red;\n}');
    });

    it.each<[string, unknown]>([
      ['a css fragment holding a line comment', css`// note`],
      ['a css fragment holding a block comment', css`/* note */`],
      ['a function returning a line comment', () => '// note'],
    ])('adds nothing for %s before a rule', (_title, mixin) => {
      const Comp = styled.div`${mixin as string} h2{color:red;}`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a h2 {\n  color: red;\n}');
    });

    it('keeps a rule on the same line as a value ending in a line comment', () => {
      const Comp = styled.div`${() => 'margin: 0; // note'} h2{color:red;}`;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a {\n  margin: 0;\n}\n.a h2 {\n  color: red;\n}');
    });

    it('reads the slots after an escaped character at the slot', () => {
      const Comp = styled.div`
        ${false}
        .x\\${'y'} {
          top: 0;
        }
        ${() => '.z { left: 0; }'}
        ${() => 'margin: 0'}
        color: red;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(
        '.a {\n  margin: 0;\n  color: red;\n}\n.a .x\\y {\n  top: 0;\n}\n.a .z {\n  left: 0;\n}'
      );
    });

    it.each<[string, unknown]>([
      ['false', false],
      ['undefined', undefined],
      ['an empty string', ''],
      ['a function returning false', () => false],
    ])('adds nothing for %s before a rule', (_title, mixin) => {
      const Comp = styled.div`
        ${mixin as string}
        h2 {
          color: red;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a h2 {\n  color: red;\n}');
    });

    it.each<[string, unknown, string]>([
      ['false', false, '@media print {\n  .a {\n    color: red;\n  }\n}'],
      [
        'a string',
        'margin: 0;',
        '.a {\n  margin: 0;\n}\n@media print {\n  .a {\n    color: red;\n  }\n}',
      ],
    ])('keeps an at-rule after two mixins holding %s', (_title, mixin, expected) => {
      const Comp = styled.div`
        ${mixin as string}
        ${mixin as string}
        @media print {
          color: red;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(expected);
    });

    it('reads a mixin before a declaration, and two mixins, as declarations', () => {
      const BeforeDeclaration = styled.div`${() => 'margin: 0;'} color: red;`;
      const TwoMixins = styled.div`${() => 'margin: 0;'} ${() => 'color: red;'}`;
      const expected = '.a {\n  margin: 0;\n  color: red;\n}';

      const { unmount } = render(<BeforeDeclaration />);
      expect(getRenderedCSS()).toEqual(expected);
      unmount();
      resetStyled();

      render(<TwoMixins />);
      expect(getRenderedCSS()).toEqual(expected);
    });

    it.each<[string, () => React.ComponentType]>([
      [
        'a block comment',
        () => styled.div`
          color: red;
          /* note */
          ${margin}
        `,
      ],
      [
        'a block comment on the same line',
        () => styled.div`
          color: red;
          /* note */ ${margin}
        `,
      ],
      [
        'a line comment',
        () => styled.div`
          color: red;
          // note
          ${margin}
        `,
      ],
      [
        'a comment holding a quote',
        () => styled.div`
          color: red; /* don't */
          ${margin}
        `,
      ],
    ])('applies a mixin that follows %s', (_title, build) => {
      const Comp = build();
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a {\n  color: red;\n  margin: 0;\n}');
    });

    it.each<[string, () => React.ComponentType, string]>([
      [
        'a static string',
        () => styled.div`
          ${'@media (min-width: 900px)'} {
            color: red;
          }
        `,
        '',
      ],
      [
        'a function',
        () => styled.div`
          ${() => '@media (min-width: 900px)'} {
            color: red;
          }
        `,
        '',
      ],
      [
        'a function, after a declaration',
        () => styled.div`
          color: blue;
          ${() => '@media (min-width: 900px)'} {
            color: red;
          }
        `,
        '.a {\n  color: blue;\n}\n',
      ],
    ])('reads an at-rule held by %s before a block', (_title, build, before) => {
      const Comp = build();
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(
        `${before}@media (min-width:900px) {\n  .a {\n    color: red;\n  }\n}`
      );
    });

    it.each<[string, () => React.ComponentType, string]>([
      ['a string after `;`', () => styled.div`content: "a;${'x'}";`, 'content: "a;x";'],
      // The test formatter leaves a declaration alone when its string holds a brace.
      ['a string after `{`', () => styled.div`content: "a{${'x'}";`, 'content:"a{x";'],
      ['a string after `}`', () => styled.div`content: "a}${'x'}";`, 'content: "a}x";'],
      ['a string across slots', () => styled.div`content: "${'a'};${'b'}";`, 'content: "a;b";'],
      [
        'a string past an escaped quote',
        () => styled.div`content: "a\\";${'b'}";`,
        'content: "a\\";b";',
      ],
      [
        'url() after `;`',
        () => styled.div`background: url(data:image/png;${'base64,x'});`,
        'background: url(data:image/png;base64,x);',
      ],
    ])('substitutes a slot inside %s', (_title, build, declaration) => {
      const Comp = build();
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(`.a {\n  ${declaration}\n}`);
    });

    it('does not warn about a css fragment with no semicolon before a rule', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const Comp = styled.div`
        ${margin}
        &:hover {
          color: red;
        }
      `;
      render(<Comp />);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('array and boolean interpolations', () => {
    const margin = css`
      margin: 0;
    `;
    const expected = '.a {\n  margin: 0;\n  color: red;\n}';

    it.each<[string, unknown]>([
      ['strings', ['margin: 0;', 'color: red;']],
      ['nested arrays', [['margin: 0;'], ['color: red;']]],
      ['a css fragment', [margin, 'color: red;']],
      ['a function', [() => 'margin: 0;', 'color: red;']],
      ['a style object', [{ margin: 0 }, 'color: red;']],
      ['false and null', ['margin: 0;', false, null, 'color: red;']],
    ])('reads an array holding %s', (_title, value) => {
      const Direct = styled.div`
        ${value as string}
      `;
      const FromFunction = styled.div`
        ${() => value as string}
      `;

      const { unmount } = render(<Direct />);
      expect(getRenderedCSS()).toEqual(expected);
      unmount();
      resetStyled();

      render(<FromFunction />);
      expect(getRenderedCSS()).toEqual(expected);
    });

    it('joins an array in a declaration value', () => {
      const Comp = styled.div`
        margin: ${[1, 'px'] as unknown as string};
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual('.a {\n  margin: 1px;\n}');
    });

    it.each<[string, unknown]>([
      ['true', true],
      ['a function returning true', () => true],
    ])('adds nothing for %s and keeps the other styles', (_title, value) => {
      const Comp = styled.div`
        ${value as string}
        margin: 0;
        color: red;
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toEqual(expected);
    });
  });

  describe('function interpolation parameters', () => {
    it.each<[string, (p: { $c: string }, unused?: unknown) => string]>([
      ['one parameter', p => p.$c],
      ['two parameters', (p, _unused) => p.$c],
      ['a rest parameter', (...args) => args[0].$c],
    ])('calls a function with %s and keeps the other styles', (_title, fn) => {
      const Comp = styled.div<{ $c: string }>`
        color: ${fn};
        margin: 0;
      `;
      render(<Comp $c="red" />);
      expect(getRenderedCSS()).toEqual('.a {\n  color: red;\n  margin: 0;\n}');
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
