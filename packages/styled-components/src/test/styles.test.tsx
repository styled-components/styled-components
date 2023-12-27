import React from 'react';
import TestRenderer from 'react-test-renderer';
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
    TestRenderer.create(<Comp />);
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
    TestRenderer.create(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: blue;
        background: red;
      }"
    `);
  });

  it('amperstand should refer to the static class when making a self-referential combo selector', () => {
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
    TestRenderer.create(
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
      .sc-gRlPMw + .sc-gRlPMw {
        margin-left: 4px;
      }
      .sc-gRlPMw + .sc-gRlPMw ~ .sc-gRlPMw {
        background: black;
      }
      .sc-gRlPMw ~ .sc-gRlPMw {
        margin-right: 4px;
      }
      .sc-gRlPMw > .sc-gRlPMw {
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
      .sc-gRlPMw + .sc-gRlPMw {
        margin-left: 4px;
      }
      .sc-gRlPMw + .sc-gRlPMw ~ .sc-gRlPMw {
        background: black;
      }
      .sc-gRlPMw ~ .sc-gRlPMw {
        margin-right: 4px;
      }
      .sc-gRlPMw > .sc-gRlPMw {
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
    TestRenderer.create(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        background-color: blue;
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
    TestRenderer.create(<Comp />);
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
    TestRenderer.create(<Comp />);
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
    TestRenderer.create(<Comp />);
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
    TestRenderer.create(<Comp />);
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

    TestRenderer.create(<FirstComp />);
    TestRenderer.create(<SecondComp />);

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
    TestRenderer.create(<SecondComp />);
    TestRenderer.create(<FirstComp />);

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
    TestRenderer.create(<Comp />);
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

    TestRenderer.create(
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
    TestRenderer.create(<Comp />);
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

    TestRenderer.create(<Comp variant="bar" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a {
        color: green;
      }"
    `);
  });

  it('conditional styles should only apply to the relevant component instance', () => {
    interface IconProps {
      color?: string;
      rounded?: boolean;
      spin?: boolean;
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
      line-height: ${({ theme }) => theme.lineHeights.sm};
      font-size: ${({ theme }) => theme.fontSizes.sm};

      & > svg {
        stroke: ${({ theme, color }): string =>
          color && color !== 'inherit' ? theme.colors[color] : 'currentColor'};
        ${({ spin }): any => (spin ? spinCss : '')};
      }
      ${({ rounded }): string => (rounded ? 'border-radius: 9999px;' : '')};
    `;

    TestRenderer.create(
      // spinCss should only be added if spin is true. Meanwhile, when any icon component in the application receives spin=true prop, all icons in the app start spinning (see video).

      <ThemeProvider
        theme={{
          colors: { red: 'darkred' },
          fontSizes: { sm: '14px' },
          lineHeights: { sm: '20px' },
        }}
      >
        <Wrapper />
        <Wrapper spin />
        <Wrapper color="red" />
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

    TestRenderer.create(<Comp />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".a.foo, .a p:not(:last-child) {
        color: red;
      }"
    `);
  });
});
