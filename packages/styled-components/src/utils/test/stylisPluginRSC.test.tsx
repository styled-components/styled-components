import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import React from 'react';
import { resetStyled } from '../../test/utils';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import stylisPluginRSC from '../stylisPluginRSC';
import { RULESET } from 'stylis';

let styled: ReturnType<typeof resetStyled>;

describe('stylisPluginRSC', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    styled = resetStyled(true);
  });

  function getInjectedCSS(): string {
    return Array.from(document.querySelectorAll('style[data-styled]'))
      .map(el => el.textContent || '')
      .join('');
  }

  it('should rewrite :first-child', () => {
    const Item = styled.li`
      &:first-child {
        color: red;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>First</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-child(1 of :not(style[data-styled])){color:red;}"`
    );
  });

  it('should rewrite :last-child', () => {
    const Item = styled.li`
      &:last-child {
        color: blue;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>Last</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-last-child(1 of :not(style[data-styled])){color:blue;}"`
    );
  });

  it('should rewrite :nth-child(N)', () => {
    const Item = styled.li`
      &:nth-child(2) {
        color: green;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>Second</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-child(2 of :not(style[data-styled])){color:green;}"`
    );
  });

  it('should rewrite :nth-last-child(N)', () => {
    const Item = styled.li`
      &:nth-last-child(2) {
        color: purple;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>Item</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-last-child(2 of :not(style[data-styled])){color:purple;}"`
    );
  });

  it('should rewrite An+B formulas', () => {
    const Item = styled.li`
      &:nth-child(2n + 1) {
        background: gray;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>Odd</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-child(2n + 1 of :not(style[data-styled])){background:gray;}"`
    );
  });

  it('should rewrite keyword arguments (odd, even)', () => {
    const Item = styled.li`
      &:nth-child(odd) {
        background: #eee;
      }
      &:nth-child(even) {
        background: #fff;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>Item</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-child(odd of :not(style[data-styled])){background:#eee;}.b:nth-child(even of :not(style[data-styled])){background:#fff;}"`
    );
  });

  it('should not double-rewrite selectors already using of syntax', () => {
    const Item = styled.li`
      &:nth-child(2 of .special) {
        color: gold;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>Item</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(`".b:nth-child(2 of .special){color:gold;}"`);
  });

  it('should handle multiple pseudo-classes on the same selector', () => {
    const Item = styled.li`
      &:first-child,
      &:last-child {
        font-weight: bold;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>Item</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-child(1 of :not(style[data-styled])),.b:nth-last-child(1 of :not(style[data-styled])){font-weight:bold;}"`
    );
  });

  it('should not touch selectors without child-index pseudo-classes', () => {
    const Button = styled.button`
      &:hover {
        color: red;
      }
      &:focus {
        outline: 2px solid blue;
      }
      &:first-of-type {
        margin-left: 0;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <Button>Click</Button>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:hover{color:red;}.b:focus{outline:2px solid blue;}.b:first-of-type{margin-left:0;}"`
    );
  });

  it('should not affect styles when plugin is not used', () => {
    const Item = styled.li`
      &:first-child {
        color: red;
      }
    `;

    render(
      <ul>
        <Item>First</Item>
      </ul>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(`".b:first-child{color:red;}"`);
  });

  it('should rewrite :first-child inside a media query', () => {
    const Item = styled.li`
      @media (min-width: 768px) {
        &:first-child {
          color: red;
        }
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>First</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `"@media (min-width: 768px){.b:nth-child(1 of :not(style[data-styled])){color:red;}}"`
    );
  });

  it('should rewrite :first-child in a nested parent selector', () => {
    const Item = styled.li`
      .parent &:first-child {
        color: red;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>First</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".parent .b:nth-child(1 of :not(style[data-styled])){color:red;}"`
    );
  });

  it('should rewrite :first-child in compound pseudo-class selectors', () => {
    const Item = styled.li`
      &:first-child:hover {
        color: red;
      }
      &:not(.foo):nth-child(2) {
        color: blue;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>First</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-child(1 of :not(style[data-styled])):hover{color:red;}.b:not(.foo):nth-child(2 of :not(style[data-styled])){color:blue;}"`
    );
  });

  it('should rewrite negative An+B formulas', () => {
    const Item = styled.li`
      &:nth-child(-n + 3) {
        color: red;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>First</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-child(-n + 3 of :not(style[data-styled])){color:red;}"`
    );
  });

  it('should rewrite bare numeric :nth-child(3)', () => {
    const Item = styled.li`
      &:nth-child(3) {
        color: red;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>First</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-child(3 of :not(style[data-styled])){color:red;}"`
    );
  });

  it('should rewrite :only-child', () => {
    const Item = styled.li`
      &:only-child {
        color: red;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <Item>Only</Item>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".b:nth-child(1 of :not(style[data-styled])):nth-last-child(1 of :not(style[data-styled])){color:red;}"`
    );
  });

  it('should handle multiple components with different selectors in the same StyleSheetManager', () => {
    const First = styled.li`
      &:first-child {
        color: red;
      }
    `;
    const Last = styled.li`
      &:last-child {
        color: blue;
      }
    `;
    const Hover = styled.li`
      &:hover {
        color: green;
      }
    `;

    render(
      <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
        <ul>
          <First>First</First>
          <Last>Last</Last>
          <Hover>Hover</Hover>
        </ul>
      </StyleSheetManager>
    );

    expect(getInjectedCSS()).toMatchInlineSnapshot(
      `".d:nth-child(1 of :not(style[data-styled])){color:red;}.e:nth-last-child(1 of :not(style[data-styled])){color:blue;}.f:hover{color:green;}"`
    );
  });

  it('should have a name property for stylis hash computation', () => {
    expect(stylisPluginRSC.name).toBe('stylisPluginRSC');
  });

  describe('adjacent sibling combinator (+)', () => {
    it('should expand & + & to handle interleaved style tags', () => {
      const Item = styled.div`
        & + & {
          margin-top: 8px;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".sc-a+.sc-a,.b+style[data-styled]+.b,.b+style[data-styled]+style[data-styled]+.b{margin-top:8px;}"`
      );
    });

    it('should expand .item + & with interleaved style tags', () => {
      const Item = styled.div`
        .item + & {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".item+.b,.item+style[data-styled]+.b,.item+style[data-styled]+style[data-styled]+.b{color:red;}"`
      );
    });

    it('should expand & + .sibling with interleaved style tags', () => {
      const Item = styled.div`
        & + .sibling {
          color: blue;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".b+.sibling,.b+style[data-styled]+.sibling,.b+style[data-styled]+style[data-styled]+.sibling{color:blue;}"`
      );
    });

    it('should not expand ~ (general sibling)', () => {
      const Item = styled.div`
        & ~ & {
          color: green;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
        </StyleSheetManager>
      );

      // ~ is immune — no expansion needed
      expect(getInjectedCSS()).toMatchInlineSnapshot(`".sc-a~.sc-a{color:green;}"`);
    });

    it('should not expand + inside :nth-child(2n+1)', () => {
      const Item = styled.li`
        &:nth-child(2n + 1) {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <ul>
            <Item>Item</Item>
          </ul>
        </StyleSheetManager>
      );

      // The + inside (2n+1) must not be treated as a combinator
      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".b:nth-child(2n + 1 of :not(style[data-styled])){color:red;}"`
      );
    });

    it('should apply both sibling expansion and child-index rewriting on the same selector', () => {
      const Item = styled.div`
        & + &:first-child {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".b+.b:nth-child(1 of :not(style[data-styled])),.b+style[data-styled]+.b:nth-child(1 of :not(style[data-styled])),.b+style[data-styled]+style[data-styled]+.b:nth-child(1 of :not(style[data-styled])){color:red;}"`
      );
    });

    it('should expand multiple + combinators independently', () => {
      const Item = styled.div`
        & + & + & {
          color: purple;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
          <Item>C</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".sc-a+.sc-a+.sc-a,.b+style[data-styled]+.b+.b,.b+style[data-styled]+style[data-styled]+.b+.b,.b+.b+style[data-styled]+.b,.b+.b+style[data-styled]+style[data-styled]+.b{color:purple;}"`
      );
    });

    it('should expand + inside a media query', () => {
      const Item = styled.div`
        @media (min-width: 768px) {
          & + & {
            gap: 16px;
          }
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `"@media (min-width: 768px){.sc-a+.sc-a,.b+style[data-styled]+.b,.b+style[data-styled]+style[data-styled]+.b{gap:16px;}}"`
      );
    });

    it('should not corrupt + inside quoted attribute selectors', () => {
      const Item = styled.div`
        &[data-icon='+'] + & {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".sc-a[data-icon='+']+.sc-a,.b[data-icon='+']+style[data-styled]+.b,.b[data-icon='+']+style[data-styled]+style[data-styled]+.b{color:red;}"`
      );
    });

    it('should not expand + inside :has()', () => {
      const Item = styled.div`
        &:has(+ .next) {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
        </StyleSheetManager>
      );

      // + inside :has() is a relative selector, should not be expanded
      expect(getInjectedCSS()).toMatchInlineSnapshot(`".b:has(+ .next){color:red;}"`);
    });

    it('should not expand + inside :is()', () => {
      const Item = styled.div`
        :is(& + &) {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
        </StyleSheetManager>
      );

      // + inside :is() should not be expanded at selector level
      expect(getInjectedCSS()).toMatchInlineSnapshot(`":is(.b + .b){color:red;}"`);
    });

    it('should not expand + inside :not()', () => {
      const Item = styled.div`
        &:not(.foo + .bar) {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(`".b:not(.foo + .bar){color:red;}"`);
    });

    it('should handle mixed combinators: > then + then ~', () => {
      const Item = styled.div`
        .parent > & + & ~ & {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
          <Item>C</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".parent>.b+.b~.b,.parent>.b+style[data-styled]+.b~.b,.parent>.b+style[data-styled]+style[data-styled]+.b~.b{color:red;}"`
      );
    });

    it('should handle + combined with :has() containing +', () => {
      const Item = styled.div`
        &:has(+ .next) + & {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".sc-a:has(+ .next)+.sc-a,.b:has(+ .next)+style[data-styled]+.b,.b:has(+ .next)+style[data-styled]+style[data-styled]+.b{color:red;}"`
      );
    });

    it('should not treat CSS-escaped + as a combinator', () => {
      // Test the plugin directly with a mock stylis RULESET element.
      // In CSS, .a\+b is a class containing a literal +. Stylis preserves
      // the escape as .a\+b in the props array. The selector .a\+b+.c has
      // \+ (escaped, part of class name) and + (real combinator).
      const element = {
        type: RULESET,
        // stylis would produce this from: .a\+b + .c { color: red }
        props: ['.a\\+b+.c'],
        value: '.a\\+b+.c',
        children: [],
      };

      stylisPluginRSC(element);

      // The escaped \+ must survive in all selectors; only the real combinator expanded
      expect(element.props).toMatchInlineSnapshot(`
        [
          ".a\\+b+.c",
          ".a\\+b+style[data-styled]+.c",
          ".a\\+b+style[data-styled]+style[data-styled]+.c",
        ]
      `);
    });

    it('should handle + between attribute selectors', () => {
      const Item = styled.div`
        &[data-a] + &[data-b] {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item data-a>A</Item>
          <Item data-b>B</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".b[data-a]+.b[data-b],.b[data-a]+style[data-styled]+.b[data-b],.b[data-a]+style[data-styled]+style[data-styled]+.b[data-b]{color:red;}"`
      );
    });

    it('should handle + with attribute selector containing + in value', () => {
      const Item = styled.div`
        &[href*='a+b'] + & {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".sc-a[href*='a+b']+.sc-a,.b[href*='a+b']+style[data-styled]+.b,.b[href*='a+b']+style[data-styled]+style[data-styled]+.b{color:red;}"`
      );
    });

    it('should handle :nth-child with + in An+B AND combinator +', () => {
      const Item = styled.li`
        &:nth-child(2n + 1) + &:nth-child(3n + 2) {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <ul>
            <Item>A</Item>
            <Item>B</Item>
          </ul>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".b:nth-child(2n + 1 of :not(style[data-styled]))+.b:nth-child(3n + 2 of :not(style[data-styled])),.b:nth-child(2n + 1 of :not(style[data-styled]))+style[data-styled]+.b:nth-child(3n + 2 of :not(style[data-styled])),.b:nth-child(2n + 1 of :not(style[data-styled]))+style[data-styled]+style[data-styled]+.b:nth-child(3n + 2 of :not(style[data-styled])){color:red;}"`
      );
    });

    it('should handle deeply chained + (5 combinators)', () => {
      const Item = styled.span`
        & + & + & + & + & + & {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>1</Item>
          <Item>2</Item>
          <Item>3</Item>
          <Item>4</Item>
          <Item>5</Item>
          <Item>6</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".sc-a+.sc-a+.sc-a+.sc-a+.sc-a+.sc-a,.b+style[data-styled]+.b+.b+.b+.b+.b,.b+style[data-styled]+style[data-styled]+.b+.b+.b+.b+.b,.b+.b+style[data-styled]+.b+.b+.b+.b,.b+.b+style[data-styled]+style[data-styled]+.b+.b+.b+.b,.b+.b+.b+style[data-styled]+.b+.b+.b,.b+.b+.b+style[data-styled]+style[data-styled]+.b+.b+.b,.b+.b+.b+.b+style[data-styled]+.b+.b,.b+.b+.b+.b+style[data-styled]+style[data-styled]+.b+.b,.b+.b+.b+.b+.b+style[data-styled]+.b,.b+.b+.b+.b+.b+style[data-styled]+style[data-styled]+.b{color:red;}"`
      );
    });

    it('should handle + with ID selectors', () => {
      const Item = styled.div`
        &#first + &#second {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item id="first">A</Item>
          <Item id="second">B</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".b#first+.b#second,.b#first+style[data-styled]+.b#second,.b#first+style[data-styled]+style[data-styled]+.b#second{color:red;}"`
      );
    });

    it('should handle + with universal selector', () => {
      const Item = styled.div`
        * + & {
          margin-top: 8px;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `"*+.b,*+style[data-styled]+.b,*+style[data-styled]+style[data-styled]+.b{margin-top:8px;}"`
      );
    });

    it('should handle deeply nested pseudo-functions with +', () => {
      const Item = styled.div`
        &:is(:has(+ .a), .x) + & {
          color: red;
        }
      `;

      render(
        <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
          <Item>A</Item>
          <Item>B</Item>
        </StyleSheetManager>
      );

      expect(getInjectedCSS()).toMatchInlineSnapshot(
        `".sc-a:is(:has(+ .a), .x)+.sc-a,.b:is(:has(+ .a), .x)+style[data-styled]+.b,.b:is(:has(+ .a), .x)+style[data-styled]+style[data-styled]+.b{color:red;}"`
      );
    });
  });
});
