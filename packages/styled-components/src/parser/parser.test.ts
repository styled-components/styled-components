import { NodeKind } from './ast';
import { resetWarnOnce } from '../utils/warnOnce';
import { parse, splitTopLevelCommas } from './parser';

const splitSelectors = (raw: string) => splitTopLevelCommas(raw, true);

describe('parser', () => {
  it('parses a single declaration', () => {
    expect(parse('color: red;')).toEqual([{ kind: NodeKind.Decl, prop: 'color', value: 'red' }]);
  });

  it('parses multiple declarations', () => {
    expect(parse('color: red; background: blue;')).toEqual([
      { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      { kind: NodeKind.Decl, prop: 'background', value: 'blue' },
    ]);
  });

  it('tolerates trailing omitted semicolon', () => {
    expect(parse('color: red; background: blue')).toEqual([
      { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      { kind: NodeKind.Decl, prop: 'background', value: 'blue' },
    ]);
  });

  it('preserves value strings verbatim for multi-token values', () => {
    expect(parse('padding: 8px 16px; border: 1px solid red;')).toEqual([
      { kind: NodeKind.Decl, prop: 'padding', value: '8px 16px' },
      { kind: NodeKind.Decl, prop: 'border', value: '1px solid red' },
    ]);
  });

  it('respects parens in values (rgb, calc)', () => {
    expect(parse('color: rgb(1, 2, 3); width: calc(100% - 16px);')).toEqual([
      { kind: NodeKind.Decl, prop: 'color', value: 'rgb(1, 2, 3)' },
      { kind: NodeKind.Decl, prop: 'width', value: 'calc(100% - 16px)' },
    ]);
  });

  it('respects strings in values (content)', () => {
    expect(parse('content: "hello;world"; color: red;')).toEqual([
      { kind: NodeKind.Decl, prop: 'content', value: '"hello;world"' },
      { kind: NodeKind.Decl, prop: 'color', value: 'red' },
    ]);
  });

  it('parses a nested rule', () => {
    expect(parse('color: red; &:hover { color: blue; }')).toEqual([
      { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      {
        kind: NodeKind.Rule,
        selectors: ['&:hover'],
        children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
      },
    ]);
  });

  it('parses deeply nested rules', () => {
    expect(
      parse(`
        color: red;
        & > .foo {
          padding: 8px;
          &:hover {
            color: blue;
          }
        }
      `)
    ).toEqual([
      { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      {
        kind: NodeKind.Rule,
        selectors: ['& > .foo'],
        children: [
          { kind: NodeKind.Decl, prop: 'padding', value: '8px' },
          {
            kind: NodeKind.Rule,
            selectors: ['&:hover'],
            children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
          },
        ],
      },
    ]);
  });

  it('parses an @media block', () => {
    expect(
      parse(`
        color: red;
        @media (min-width: 500px) {
          color: blue;
        }
      `)
    ).toEqual([
      { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      {
        kind: NodeKind.AtRule,
        name: 'media',
        prelude: '(min-width: 500px)',
        children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
      },
    ]);
  });

  it('parses nested rules inside @media', () => {
    expect(
      parse(`
        @media (min-width: 500px) {
          &:hover {
            color: blue;
          }
        }
      `)
    ).toEqual([
      {
        kind: NodeKind.AtRule,
        name: 'media',
        prelude: '(min-width: 500px)',
        children: [
          {
            kind: NodeKind.Rule,
            selectors: ['&:hover'],
            children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
          },
        ],
      },
    ]);
  });

  it('parses block-less at-rules (@import)', () => {
    expect(parse('@import url(https://example.com/styles.css);')).toEqual([
      {
        kind: NodeKind.AtRule,
        name: 'import',
        prelude: 'url(https://example.com/styles.css)',
        children: null,
      },
    ]);
  });

  it('parses @container', () => {
    expect(parse('@container card (min-width: 400px) { padding: 16px; }')).toEqual([
      {
        kind: NodeKind.AtRule,
        name: 'container',
        prelude: 'card (min-width: 400px)',
        children: [{ kind: NodeKind.Decl, prop: 'padding', value: '16px' }],
      },
    ]);
  });

  it('parses @layer block and block-less forms', () => {
    expect(parse('@layer reset, framework, utilities;')).toEqual([
      {
        kind: NodeKind.AtRule,
        name: 'layer',
        prelude: 'reset, framework, utilities',
        children: null,
      },
    ]);
    expect(parse('@layer utilities { color: red; }')).toEqual([
      {
        kind: NodeKind.AtRule,
        name: 'layer',
        prelude: 'utilities',
        children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
      },
    ]);
  });

  it('parses @scope with prelude', () => {
    expect(parse('@scope (.card) to (.content) { color: red; }')).toEqual([
      {
        kind: NodeKind.AtRule,
        name: 'scope',
        prelude: '(.card) to (.content)',
        children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
      },
    ]);
  });

  it('parses @keyframes with stops', () => {
    expect(
      parse(`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          50% {
            opacity: 0.5;
          }
          to {
            transform: rotate(360deg);
          }
        }
      `)
    ).toEqual([
      {
        kind: NodeKind.Keyframes,
        name: 'keyframes',
        prelude: 'spin',
        frames: [
          {
            stops: ['from'],
            children: [{ kind: NodeKind.Decl, prop: 'transform', value: 'rotate(0deg)' }],
          },
          {
            stops: ['50%'],
            children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0.5' }],
          },
          {
            stops: ['to'],
            children: [{ kind: NodeKind.Decl, prop: 'transform', value: 'rotate(360deg)' }],
          },
        ],
      },
    ]);
  });

  it('parses @keyframes with comma-separated stops', () => {
    expect(
      parse(`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `)
    ).toEqual([
      {
        kind: NodeKind.Keyframes,
        name: 'keyframes',
        prelude: 'pulse',
        frames: [
          {
            stops: ['0%', '100%'],
            children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '1' }],
          },
          {
            stops: ['50%'],
            children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0.5' }],
          },
        ],
      },
    ]);
  });

  describe('nesting depth cap', () => {
    // Input can carry runtime values, so nesting depth must not be able to
    // exhaust the call stack. The block past the cap is skipped with its
    // contents; the statements around the chain still parse.
    it.each([
      ['rule', 'a{'],
      ['at-rule', '@media x{'],
    ])('skips a %s chain nested 80k deep without overflowing the stack', (_label, opener) => {
      const css = 'b: c; ' + opener.repeat(80_000) + 'color:red;' + '}'.repeat(80_000) + ' d: e;';
      const start = performance.now();
      const ast = parse(css);
      expect(performance.now() - start).toBeLessThan(200);

      expect(ast[0]).toEqual({ kind: NodeKind.Decl, prop: 'b', value: 'c' });
      expect(ast[2]).toEqual({ kind: NodeKind.Decl, prop: 'd', value: 'e' });
      expect(ast).toHaveLength(3);
      let node = ast[1];
      let depth = 0;
      while (
        (node.kind === NodeKind.Rule || node.kind === NodeKind.AtRule) &&
        node.children?.length
      ) {
        depth++;
        node = node.children[0];
      }
      expect(depth).toBeGreaterThan(100);
      expect(depth).toBeLessThan(1_000);
      expect(node.kind === NodeKind.Rule || node.kind === NodeKind.AtRule).toBe(true);
    });

    it('keeps nesting under the cap intact', () => {
      let node = parse('a{'.repeat(100) + 'color:red;' + '}'.repeat(100))[0];
      let depth = 0;
      while (node.kind === NodeKind.Rule) {
        depth++;
        node = node.children[0];
      }
      expect(depth).toBe(100);
      expect(node).toEqual({ kind: NodeKind.Decl, prop: 'color', value: 'red' });
    });
  });

  describe('brace repair at the root block', () => {
    it('drops the statement around a stray `}` up to the next `;` and keeps the rest', () => {
      expect(parse('a: b; } c: d; e: f;')).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: 'b' },
        { kind: NodeKind.Decl, prop: 'e', value: 'f' },
      ]);
    });

    it('drops a declaration a stray `}` interrupts and resumes after the newline', () => {
      expect(parse('a: b}\nc: d;')).toEqual([{ kind: NodeKind.Decl, prop: 'c', value: 'd' }]);
    });

    // CSS Syntax, "Consume a string token": "newline: This is a parse error. Reconsume
    // the current input code point, create a <bad-string-token>, and return it."
    it.each([
      ['a string', 'a: b}"; /* c */\nd: e;'],
      ['a string after an escaped quote', 'a: b}\\""; /* c */\nd: e;'],
    ])('reads the `;` in %s after a stray `}` as text, up to the newline', (_label, css) => {
      expect(parse(css)).toEqual([{ kind: NodeKind.Decl, prop: 'd', value: 'e' }]);
    });

    it('stops at the `;` after a string closed past a stray `}`', () => {
      expect(parse('a: b}"c;"; d: e;')).toEqual([{ kind: NodeKind.Decl, prop: 'd', value: 'e' }]);
    });

    // CSS Syntax, "Consume a block's contents": "<EOF-token> <}-token> Return rules."
    // A block still open at the end of input ends there and keeps what it parsed.
    it.each([
      ['rule', 'a: b; x { y: z', 'x'],
      ['rule with a trailing `;`', 'a: b; x { y: z;', 'x'],
      ['rule with trailing whitespace', 'a: b; x { y: z; ', 'x'],
    ])(
      'closes an unclosed %s at the end of input and keeps its declarations',
      (_label, css, sel) => {
        expect(parse(css)).toEqual([
          { kind: NodeKind.Decl, prop: 'a', value: 'b' },
          {
            kind: NodeKind.Rule,
            selectors: [sel],
            children: [{ kind: NodeKind.Decl, prop: 'y', value: 'z' }],
          },
        ]);
      }
    );

    it('closes every unclosed level and keeps the innermost declaration', () => {
      expect(parse('&:hover { &:focus { color: red')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&:hover'],
          children: [
            {
              kind: NodeKind.Rule,
              selectors: ['&:focus'],
              children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
            },
          ],
        },
      ]);
    });

    it('closes an unclosed at-rule block at the end of input', () => {
      expect(parse('@media (min-width: 1px) { color: red')).toEqual([
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: '(min-width: 1px)',
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
    });

    it('keeps a closed nested rule inside an at-rule block left open', () => {
      expect(parse('@media x { &:hover { color: red; }')).toEqual([
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: 'x',
          children: [
            {
              kind: NodeKind.Rule,
              selectors: ['&:hover'],
              children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
            },
          ],
        },
      ]);
    });

    it('closes an unclosed @font-face block at the end of input', () => {
      expect(parse('@font-face { font-family: x')).toEqual([
        {
          kind: NodeKind.AtRule,
          name: 'font-face',
          prelude: '',
          children: [{ kind: NodeKind.Decl, prop: 'font-family', value: 'x' }],
        },
      ]);
    });

    it('closes an unclosed @keyframes block at the end of input and keeps its frames', () => {
      expect(parse('@keyframes k { from { opacity: 0 } to { opacity: 1')).toEqual([
        {
          kind: NodeKind.Keyframes,
          name: 'keyframes',
          prelude: 'k',
          frames: [
            { stops: ['from'], children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0' }] },
            { stops: ['to'], children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '1' }] },
          ],
        },
      ]);
    });

    it('drops the statement holding an unclosed string', () => {
      expect(parse('a: b; content: "x; c: d;')).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: 'b' },
      ]);
    });

    it('drops only the declaration holding an unclosed string inside an unclosed block', () => {
      expect(parse('x { a: b; content: "y')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['x'],
          children: [{ kind: NodeKind.Decl, prop: 'a', value: 'b' }],
        },
      ]);
    });

    it('drops an at-rule whose prelude holds an unclosed string', () => {
      expect(parse('a: b; @import "x')).toEqual([{ kind: NodeKind.Decl, prop: 'a', value: 'b' }]);
    });

    // CSS Syntax, "Consume a function": "<eof-token> <)-token> Discard a token
    // from input. Return function." Deviation: the spec closes an open function
    // at the end of input, but the end of a template is not the end of a
    // stylesheet, and an emitted `(` would consume the rules after it. The
    // statement is dropped instead, as for a string left open.
    it.each([
      ['a function', 'a: b; c: calc(1px + 2px'],
      ['a function spanning later statements', 'a: b; c: calc(1px; d: e; x { y: z; }'],
      ['a plain paren block', 'a: b; c: (1px'],
      ['a nested function', 'a: b; c: calc((1px + 2px) * (3'],
      ['a url', 'a: b; c: url(x.png; d: e;'],
      ['a selector', 'a: b; &:not(.x { y: z; } d: e;'],
      ['an at-rule prelude', 'a: b; @media (min-width: 1px { y: z; } d: e;'],
    ])('drops the statement holding an unclosed paren in %s', (_label, css) => {
      expect(parse(css)).toEqual([{ kind: NodeKind.Decl, prop: 'a', value: 'b' }]);
    });

    it('drops only the statement holding an unclosed paren inside a block', () => {
      expect(parse('x { a: b; c: calc(1px; } d: e;')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['x'],
          children: [{ kind: NodeKind.Decl, prop: 'a', value: 'b' }],
        },
      ]);
    });

    // CSS Syntax, "Consume a simple block": "Let ending token be the mirror variant
    // of the next token. (E.g. if it was called with <[-token>, the ending token is
    // <]-token>.)" and "anything else: Consume a component value from input and append
    // the result to block's value." Only the mirror closes a block, so a `)` inside
    // `[` closes nothing, and `;` `{` `}` inside one are part of it. The deviation
    // at the end of input is the one the unclosed paren table above describes.
    it.each([
      ['a selector', 'a: b; &[x { y: z; } d: e;'],
      ['a value', 'a: b; c: [d 1fr; e: f;'],
      ['a value before a rule', 'a: b; c: [d; x { y: z; }'],
      ['an at-rule prelude', 'a: b; @media [x { y: z; } d: e;'],
      ['a value whose `)` sits inside the `[`', 'a: b; c: [d); e: f;'],
      ['a selector whose `]` sits inside a `(`', 'a: b; &[x(]) { y: z; } d: e;'],
      ['a function whose `)` sits inside a `{`', 'a: b; c: f({); d: e;'],
      ['a bracket whose `]` sits inside a `{`', 'a: b; c: [{]; d: e;'],
      ['a function holding a `[`', 'a: b; c: f([); d: e;'],
      ['an at-rule prelude with a `{` in a paren', 'a: b; @media f({) { y: z; } d: e;'],
    ])('drops the statement holding a block left open in %s', (_label, css) => {
      expect(parse(css)).toEqual([{ kind: NodeKind.Decl, prop: 'a', value: 'b' }]);
    });

    it('drops only the statement holding an unclosed bracket inside a block', () => {
      expect(parse('x { a: b; c: [d; } e: f;')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['x'],
          children: [{ kind: NodeKind.Decl, prop: 'a', value: 'b' }],
        },
      ]);
    });

    it('drops what follows an unclosed bracket in a block past the nesting limit', () => {
      const levels = 513;
      let expected: unknown[] = [];
      for (let i = 0; i < levels; i++) {
        expected = [{ kind: NodeKind.Rule, selectors: ['a'], children: expected }];
      }
      expect(parse(`${'a{'.repeat(levels)} b: [c; ${'}'.repeat(levels)} f: g;`)).toEqual(expected);
    });

    it('drops a statement nesting blocks past the nesting limit', () => {
      expect(parse(`a: b; c: ${'[('.repeat(300)}${')]'.repeat(300)}; d: e;`)).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: 'b' },
      ]);
    });

    it.each([
      ['a comment right after a value slash', 'a: b; c: //*; d: e;'],
      ['a comment a stray `}` hides from a quote', "a: b; } it's; c: /* d; */ e: f;"],
    ])('drops the statement holding %s', (_label, css) => {
      expect(parse(css)).toEqual([{ kind: NodeKind.Decl, prop: 'a', value: 'b' }]);
    });

    // CSS Syntax, "U+0040 COMMERCIAL AT (@)": "If the next 3 input code points would
    // start an ident sequence, consume an ident sequence, create an <at-keyword-token>
    // with its value set to the returned value, and return it. Otherwise, return a
    // <delim-token>". The name ends where the ident does, so what follows it is
    // tokenized as usual; a delim starts a qualified rule that reads past a `;`.
    it.each([
      ['a paren right after the name', 'a: b; @media(c: 1px { d: e; } f: g;'],
      ['a brace in a paren after the name', 'a: b; @supports(f({) { d: e; } g: h;'],
      ['a quote in the name', 'a: b; @x" { d: e; } f: g;'],
      ['a bracket in the name', 'a: b; @x[ { d: e; } f: g;'],
      ['a paren after the name `url`', 'a: b; @url([) { d: e; } f: g;'],
    ])('drops an at-rule holding %s', (_label, css) => {
      expect(parse(css)).toEqual([{ kind: NodeKind.Decl, prop: 'a', value: 'b' }]);
    });

    it.each([
      ['no name', '@; a: b;'],
      ['a paren for a name', '@(x); a: b;'],
      ['a paren for a name with a block', '@(x) { c: d; } a: b;'],
      ['a string for a name', '@"x"; a: b;'],
      ['a digit starting the name', '@1x; a: b;'],
      ['a backslash before a line feed', '@\\\n; a: b;'],
      ['a backslash before a form feed', '@\\\f; a: b;'],
    ])('drops only the at-rule with %s', (_label, css) => {
      expect(parse(css)).toEqual([{ kind: NodeKind.Decl, prop: 'a', value: 'b' }]);
    });

    it('ends an at-rule name at a `}`', () => {
      expect(parse('@media x { @a} b { c: d; }')).toEqual([
        expect.objectContaining({
          name: 'media',
          children: [expect.objectContaining({ name: 'a', children: null })],
        }),
        {
          kind: NodeKind.Rule,
          selectors: ['b'],
          children: [{ kind: NodeKind.Decl, prop: 'c', value: 'd' }],
        },
      ]);
    });

    it('reads an escaped `;` as part of an at-rule name', () => {
      expect(parse('@a\\; b; c: d;')).toEqual([
        expect.objectContaining({ name: 'a\\;', prelude: 'b', children: null }),
        { kind: NodeKind.Decl, prop: 'c', value: 'd' },
      ]);
    });

    it('keeps an at-rule with a condition right after its name', () => {
      expect(parse('@media(min-width: 1px) { a: b; }')).toEqual([
        expect.objectContaining({
          children: [{ kind: NodeKind.Decl, prop: 'a', value: 'b' }],
        }),
      ]);
    });

    // CSS Syntax, "Consume an escaped code point": "It assumes that the U+005C REVERSE
    // SOLIDUS (\) has already been consumed and that the next input code point has
    // already been verified to be part of a valid escape." So a trimmed space that was
    // escaped would leave a `\` to escape the `;` or `{` emitted after it.
    it.each([
      ['a selector', 'a\\ { b: c; }', 'a\\ '],
      ['a selector before a list item', 'a\\ , d { b: c; }', 'a\\ '],
    ])('keeps the escaped space ending %s', (_label, css, selector) => {
      expect(parse(css)).toEqual([
        expect.objectContaining({
          selectors: expect.arrayContaining([selector]),
          children: [{ kind: NodeKind.Decl, prop: 'b', value: 'c' }],
        }),
      ]);
    });

    it('keeps the escaped space ending a value', () => {
      expect(parse('a: b\\ ; c: d;')).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: 'b\\ ' },
        { kind: NodeKind.Decl, prop: 'c', value: 'd' },
      ]);
    });

    it.each([
      ['a value', 'a: b; c: d\\'],
      ['a selector', 'a: b; c\\'],
      ['an at-rule', 'a: b; @media x\\'],
    ])('drops a statement ending in an unpaired backslash in %s', (_label, css) => {
      expect(parse(css)).toEqual([{ kind: NodeKind.Decl, prop: 'a', value: 'b' }]);
    });

    it.each([
      ['a trimmed part', 'a, (b ', true, ['a', '(b']],
      ['a raw part', 'a, (b ', false, ['a', ' (b ']],
    ])('splits text left open into %s', (_label, raw, trim, parts) => {
      expect(splitTopLevelCommas(raw, trim)).toEqual(parts);
    });

    it.each([
      ['a semicolon in a bracket', '--a: [b;c]; d: e;', '--a', '[b;c]'],
      ['a brace in a bracket', '--a: [{b;c}]; d: e;', '--a', '[{b;c}]'],
      ['a brace in a function', '--a: f({b;c}); d: e;', '--a', 'f({b;c})'],
      ['a function in a bracket', '--a: [f(b;c)]; d: e;', '--a', '[f(b;c)]'],
      ['a stray `]`', 'a: b]; d: e;', 'a', 'b]'],
      ['a `[` in a string', 'a: "["; d: e;', 'a', '"["'],
      ['a `[` in an unquoted url', 'a: url(b[1.png); d: e;', 'a', 'url(b[1.png)'],
      ['an escaped `[`', 'a: b\\[c; d: e;', 'a', 'b\\[c'],
      ['a closed line name', 'a: [b] 1fr [c]; d: e;', 'a', '[b] 1fr [c]'],
    ])('keeps the statements around %s', (_label, css, prop, value) => {
      expect(parse(css)).toEqual([
        { kind: NodeKind.Decl, prop, value },
        { kind: NodeKind.Decl, prop: 'd', value: 'e' },
      ]);
    });

    it.each([
      ['a closing bracket in a string', '&[a="]"]', '&[a="]"]'],
      ['a colon in a bracket', '&[a:b]:hover', '&[a:b]:hover'],
      ['an escaped bracket', '&.a\\[b', '&.a\\[b'],
    ])('keeps the rule with %s in its selector', (_label, css, selector) => {
      expect(parse(`${css} { c: d; }`)).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [selector],
          children: [{ kind: NodeKind.Decl, prop: 'c', value: 'd' }],
        },
      ]);
    });

    it.each([
      ['a closed bracket', 'selector([a])'],
      ['a closed brace in a paren', 'f({a;b})'],
    ])('keeps an at-rule with %s in its prelude', (_label, prelude) => {
      expect(parse(`@supports ${prelude} { b: c; }`)).toEqual([
        expect.objectContaining({
          prelude,
          children: [{ kind: NodeKind.Decl, prop: 'b', value: 'c' }],
        }),
      ]);
    });

    // CSS Syntax, "Consume a string token": "newline: This is a parse error.
    // Reconsume the current input code point, create a <bad-string-token>, and return
    // it." and U+005C: "if the next input code point is a newline, consume it."
    // "Preprocessing the input stream" reads CR, FF and CR LF as that newline.
    // Deviations: a browser resumes at the newline, but a trimmed value could emit the
    // string open, so the statement goes as for a string left open. An escaped CR LF
    // is dropped too; a template literal has none, only an interpolated value can.
    it.each([
      ['a line feed', '\n'],
      ['a carriage return', '\r'],
      ['a form feed', '\f'],
    ])('drops the statement holding a string ended by %s', (_label, newline) => {
      expect(parse(`a: b; c: "d${newline}e;}x{y:z}f{g:"h"i"; j: k;`)).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: 'b' },
      ]);
    });

    it.each([
      ['a line feed', '\\\n'],
      ['a carriage return', '\\\r'],
      ['a form feed', '\\\f'],
    ])('keeps a string continued past an escaped %s', (_label, escaped) => {
      expect(parse(`c: "d${escaped}e"; a: b;`)).toEqual([
        { kind: NodeKind.Decl, prop: 'c', value: `"d${escaped}e"` },
        { kind: NodeKind.Decl, prop: 'a', value: 'b' },
      ]);
    });

    it.each([
      ['a declaration', 'a: b; c: calc(1px; d: e;', 'c: calc(1px; d: e;'],
      ['an at-rule prelude', '@media (min-width: 1px { y: z; }', '(min-width: 1px { y: z; }'],
      ['a bracket', 'a: b; c: [d;', 'c: [d;'],
    ])('warns in development that %s left open is dropped', (_label, css, text) => {
      resetWarnOnce();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      parse(css);
      expect(warn.mock.calls).toEqual([
        [
          `[sc] \`${text}\` holds a \`(\`, a \`[\`, or a quote that never closes, so it and everything after it in the template are dropped. Close it, and keep a string on one line.`,
        ],
      ]);
      warn.mockRestore();
    });

    it('does not warn about a closed paren', () => {
      resetWarnOnce();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      parse('a: calc(1px); b: c;');
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('keeps the statements around a stray `)`, which opens nothing', () => {
      expect(parse('a: 1px); b: c;')).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: '1px)' },
        { kind: NodeKind.Decl, prop: 'b', value: 'c' },
      ]);
    });

    // CSS Syntax, "Consume an at-rule", `<}-token>`: "If nested is true: If rule is
    // valid in the current context, return it. Otherwise, return nothing.
    // Otherwise, consume a token and append the result to rule's prelude."
    // At the root block a `}` joins the prelude, so a bodiless at-rule that
    // swallowed it is not a valid rule.
    it.each([
      ['a bodiless at-rule', 'color: blue; @media screen } color: red;'],
      ['an at-rule at the end of input', 'color: blue; @media screen }'],
      ['an at-rule with a block', 'color: blue; @media screen } x { y: z }'],
    ])('drops %s whose prelude swallows a stray `}`', (_label, css) => {
      expect(parse(css)).toEqual([{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }]);
    });

    it.each([
      ['stray closers', 'a:b; } c:d;\n'.repeat(80_000), 80_000],
      ['unclosed openers', '{'.repeat(80_000), 1],
      ['unclosed at-rule openers', '@media x{'.repeat(80_000), 1],
      ['unclosed parens', 'a:b;'.repeat(80_000) + 'c:' + '('.repeat(80_000), 80_000],
      ['unclosed urls', 'a:b;'.repeat(80_000) + 'c:' + 'url(a '.repeat(80_000), 80_000],
      ['escaped names', 'a:b;'.repeat(80_000) + 'c:' + '\\a b('.repeat(80_000), 80_000],
      ['unclosed brackets', 'a:b;'.repeat(80_000) + 'c:' + '['.repeat(80_000), 80_000],
      ['braces in parens', 'a:b;'.repeat(80_000) + 'c:' + '({'.repeat(80_000), 80_000],
      ['closed brackets', 'a:[b];'.repeat(80_000), 80_000],
      ['one bracket after many statements', 'a:b;'.repeat(80_000) + 'c:[d];', 80_001],
      ['closed braces in parens', 'a:f({});'.repeat(80_000), 80_000],
      ['strings ended by a newline', 'a:b;'.repeat(80_000) + 'c:"\n'.repeat(80_000), 80_000],
    ])('repairs %s in linear time', (_label, css, nodes) => {
      const start = performance.now();
      expect(parse(css)).toHaveLength(nodes);
      expect(performance.now() - start).toBeLessThan(200);
    });
  });

  it('drops a nested rule inside a keyframe frame and keeps the next frame', () => {
    // A frame body is a declaration list; a rule inside it has no meaning
    // and is dropped without disturbing the frames that follow.
    expect(parse('@keyframes k { from { a { color: red } } to { opacity: 1 } }')).toEqual([
      {
        kind: NodeKind.Keyframes,
        name: 'keyframes',
        prelude: 'k',
        frames: [
          { stops: ['from'], children: [] },
          { stops: ['to'], children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '1' }] },
        ],
      },
    ]);
  });

  it('splits comma-separated selectors', () => {
    expect(splitSelectors('.a, .b, .c')).toEqual(['.a', '.b', '.c']);
  });

  it('preserves commas inside :is() / :where() / :has()', () => {
    expect(splitSelectors(':is(.a, .b), .c')).toEqual([':is(.a, .b)', '.c']);
    expect(splitSelectors(':where(.a, .b), :has(.c, .d)')).toEqual([
      ':where(.a, .b)',
      ':has(.c, .d)',
    ]);
  });

  it('preserves commas inside attribute selectors', () => {
    expect(splitSelectors('[data-foo="a,b"], .c')).toEqual(['[data-foo="a,b"]', '.c']);
  });

  it('handles empty input', () => {
    expect(parse('')).toEqual([]);
    expect(parse('   \n\t  ')).toEqual([]);
  });

  it('handles trailing semicolons', () => {
    expect(parse(';;;color: red;;;')).toEqual([
      { kind: NodeKind.Decl, prop: 'color', value: 'red' },
    ]);
  });

  describe('CSS escape sequences in declarations', () => {
    it('treats `\\:` in a property name as a literal colon, not a decl boundary', () => {
      expect(parse('foo\\:bar: 10px;')).toEqual([
        { kind: NodeKind.Decl, prop: 'foo\\:bar', value: '10px' },
      ]);
    });

    it('treats `\\:` in a custom property name correctly', () => {
      expect(parse('--my\\:prop: 10px;')).toEqual([
        { kind: NodeKind.Decl, prop: '--my\\:prop', value: '10px' },
      ]);
    });

    it('treats `\\;` as part of the value, not a decl terminator', () => {
      expect(parse('content: "a\\;b";')).toEqual([
        { kind: NodeKind.Decl, prop: 'content', value: '"a\\;b"' },
      ]);
    });
  });

  describe('interpolation sentinels', () => {
    // `\0J<index>\0` = standalone block-level interpolation (emit Interpolation node).
    // `\0I<index>\0` = embedded interpolation (stays opaque inside value/selector strings).
    // Both kinds are emitted by `parseSource` based on surrounding template-literal
    // context. Sentinel detection is gated on `options.templates` so untrusted
    // CSS routed through the static-input parse path (e.g. via the
    // `buildHashCSS` fallback after a fast-path bail) cannot fabricate
    // sentinel-looking content into structural Interpolation / TemplateValue
    // nodes.

    it('emits Interpolation node for a standalone sentinel (templates: true)', () => {
      expect(parse('\0J0\0', { templates: true })).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
      ]);
    });

    it('emits Interpolation between decls (templates: true)', () => {
      expect(parse('color: red; \0J0\0 margin: 0;', { templates: true })).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Decl, prop: 'margin', value: '0' },
      ]);
    });

    it('handles multi-digit indices (templates: true)', () => {
      expect(parse('\0J0\0\0J12\0\0J345\0', { templates: true })).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 12 },
        { kind: NodeKind.Interpolation, index: 345 },
      ]);
    });

    it('lifts embedded sentinels in declaration values to TemplateValue', () => {
      expect(parse('color: \0I0\0;', { templates: true })).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'color',
          value: { chunks: ['', ''], slots: [0] },
        },
      ]);
    });

    it('lifts embedded sentinels in selectors to TemplateValue', () => {
      // `${OtherComponent} & { ... }` becomes `\0I0\0 & { ... }`. The
      // selector with the embedded sentinel converts to a TemplateValue
      // (chunks + slot indices) so the fill path can splice without
      // re-scanning the string at render time.
      expect(parse('\0I0\0 & { color: red; }', { templates: true })).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [{ chunks: ['', ' &'], slots: [0] }],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
    });

    it('keeps existing `\0sc:...` theme sentinels as opaque value content', () => {
      // Native theme sentinels start with `\0s` (lowercase), distinct from `\0I`/`\0J`.
      expect(parse('color: \0sc:fg:#000\0;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0sc:fg:#000\0' },
      ]);
    });

    it('falls through on malformed sentinels (no digits)', () => {
      // `\0J\0` with no digits between the markers should not be recognized.
      // Malformed input is treated as a stray decl and silently dropped.
      expect(parse('\0J\0', { templates: true })).toEqual([]);
    });

    it('does not emit Interpolation node for embedded `\0I` sentinels', () => {
      // Even if an `\0I0\0` lands in block position, the parser treats it as
      // opaque text. A bug in parseSource would surface as malformed CSS,
      // not as a misclassified node.
      expect(parse('\0I0\0', { templates: true })).toEqual([]);
    });

    // The static-input gate. Untrusted CSS routed through `parse()` without
    // `{ templates: true }` (e.g. the `buildHashCSS` → `toNativeStyles`
    // fallback) must NEVER fabricate sentinel structure. These guard the
    // attack surface where a user-supplied interpolation value contains
    // sentinel-shaped bytes plus structural CSS chars (`;`/`{`/`}`);the
    // primary fast-path bails on the structural chars, and the fallback
    // re-parse must treat the sentinel bytes as opaque content.

    it('default mode: standalone-sentinel bytes do NOT emit Interpolation node', () => {
      // Without `{ templates: true }`, `\0J0\0` is opaque CSS content.
      // The decl-scanning loop falls through and the malformed bytes drop.
      expect(parse('\0J0\0')).toEqual([]);
    });

    it('default mode: embedded sentinel bytes stay as plain string content', () => {
      // The whole construct is treated as a normal decl: prop=color,
      // value=`\0I0\0`. No TemplateValue, no Interpolation node, no crash.
      expect(parse('color: \0I0\0;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0I0\0' },
      ]);
    });

    it('default mode: sentinel-shaped user value in a value position is opaque', () => {
      // What `buildHashCSS` would produce when a user-supplied filled[] slot
      // contains the encoded sentinel pattern. The parser must not lift
      // anything into TemplateValue here;that's how the value would crash
      // downstream string-only consumers.
      expect(parse('color: red\0J0\0blue;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red\0J0\0blue' },
      ]);
    });
  });
});

describe('CSS Nesting Level 1 spec compliance', () => {
  // Spec source: drafts.csswg.org/css-nesting-1/
  //
  // The parser's job for Nesting is structural: preserve the rule tree
  // verbatim so downstream consumers (rn-web's browser; the native
  // engine's conditional-rule evaluator) see the same nesting the author
  // wrote. Semantic desugaring (& → :is(parent), specificity) is a
  // downstream concern; we only assert the parser keeps the right shape.

  describe('§3 nesting style rules', () => {
    // Spec verbatim: "Style rules can be nested inside of other styles
    // rules. These nested style rules act exactly like ordinary style
    // rules, associating properties with elements via selectors, but
    // they 'inherit' their parent rule's selector context."
    it('parses a nested rule as a child Rule of the parent', () => {
      expect(parse('.foo { color: red; a { color: blue; } }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['.foo'],
          children: [
            { kind: NodeKind.Decl, prop: 'color', value: 'red' },
            {
              kind: NodeKind.Rule,
              selectors: ['a'],
              children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
            },
          ],
        },
      ]);
    });

    // Spec example verbatim: deeply nested rules preserve their hierarchy.
    it('preserves three-level nesting', () => {
      expect(parse('& { & .a { & .b { color: red; } } }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&'],
          children: [
            {
              kind: NodeKind.Rule,
              selectors: ['& .a'],
              children: [
                {
                  kind: NodeKind.Rule,
                  selectors: ['& .b'],
                  children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
                },
              ],
            },
          ],
        },
      ]);
    });
  });

  describe('§3.1 syntax: relative selector list', () => {
    // Spec verbatim: "A nested style rule accepts a <relative-selector-list>
    // as its prelude (rather than just a <selector-list>). Any relative
    // selectors are relative to the elements represented by the nesting
    // selector."
    //
    // Practically: selectors inside a parent rule may start with a
    // combinator (>, +, ~) without an explicit & prefix.
    it('accepts a leading > combinator', () => {
      expect(parse('color: red; > .bar { color: blue; }')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
        {
          kind: NodeKind.Rule,
          selectors: ['> .bar'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
        },
      ]);
    });

    it('accepts a leading + combinator', () => {
      expect(parse('color: red; + .bar { color: blue; }')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
        {
          kind: NodeKind.Rule,
          selectors: ['+ .bar'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
        },
      ]);
    });

    it('accepts a leading ~ combinator', () => {
      expect(parse('color: red; ~ .sibling { color: blue; }')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
        {
          kind: NodeKind.Rule,
          selectors: ['~ .sibling'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
        },
      ]);
    });
  });

  describe('§4 nesting selector: the & selector', () => {
    // Spec verbatim: "When using a nested style rule, one must be able
    // to refer to the elements matched by the parent rule; that is,
    // after all, the entire point of nesting. To accomplish that, this
    // specification defines a new selector, the nesting selector,
    // written as & (U+0026 AMPERSAND)."
    it('& at the head of a compound selector parses verbatim', () => {
      expect(parse('&:hover { color: blue; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&:hover'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
        },
      ]);
    });

    // Spec example verbatim: "& + & { margin-left: 8px; }". Multiple
    // references to the nesting selector in a single complex selector.
    it('supports multiple & references in a single complex selector', () => {
      expect(parse('& + & { margin-left: 8px; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['& + &'],
          children: [{ kind: NodeKind.Decl, prop: 'margin-left', value: '8px' }],
        },
      ]);
    });

    it('& with comma-separated selector list', () => {
      expect(parse('&:hover, &:focus { color: blue; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&:hover', '&:focus'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
        },
      ]);
    });

    it('& with attribute selector', () => {
      expect(parse('&[data-state="open"] { color: blue; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&[data-state="open"]'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
        },
      ]);
    });

    it('& with pseudo-element', () => {
      expect(parse('&::before { content: "x"; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&::before'],
          children: [{ kind: NodeKind.Decl, prop: 'content', value: '"x"' }],
        },
      ]);
    });
  });

  describe('§3.3 nesting at-rules', () => {
    // Spec verbatim from §3.3 intro: "Conditional group rules and other
    // similar rules can also be nested inside of style rules."
    it('parses @media inside a style rule', () => {
      expect(parse('color: red; @media (min-width: 500px) { color: blue; }')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: '(min-width: 500px)',
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
        },
      ]);
    });

    it('parses @media containing a nested style rule', () => {
      expect(parse('@media (min-width: 500px) { &:hover { color: blue; } }')).toEqual([
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: '(min-width: 500px)',
          children: [
            {
              kind: NodeKind.Rule,
              selectors: ['&:hover'],
              children: [{ kind: NodeKind.Decl, prop: 'color', value: 'blue' }],
            },
          ],
        },
      ]);
    });
  });
});
