import { SPLITTER } from '../constants';
import { InterpolationKind, NodeKind } from './ast';
import { resetWarnOnce } from '../utils/warnOnce';
import {
  isCustomProperty,
  NEEDS_FIELD_SCAN,
  parse,
  scanQPB,
  splitTopLevelCommas,
  staysOneField,
  STOP_COLON,
  STOP_COMBINATOR,
  STOP_COMMA,
  STOP_LBRACE,
  STOP_RBRACE,
  STOP_RBRACKET,
  STOP_RPAREN,
  STOP_SEMI,
  STOP_WS,
  trimRange,
} from './parser';

const splitSelectors = (raw: string) => splitTopLevelCommas(raw, true);

describe('parser', () => {
  describe('NEEDS_FIELD_SCAN', () => {
    const asciiBytes = Array.from({ length: 128 }, (_, code) => String.fromCharCode(code));

    it.each(asciiBytes.flatMap(byte => [byte, `a${byte}b`]))(
      'never passes %j as a field the scan would refuse',
      text => {
        const passedWithoutScan = !NEEDS_FIELD_SCAN.test(text);

        expect(passedWithoutScan && !staysOneField(text)).toBe(false);
      }
    );

    it('sends the server-rendering separator to the scan', () => {
      expect(NEEDS_FIELD_SCAN.test(SPLITTER)).toBe(true);
    });
  });

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

  it('parses @keyframes as an at-rule whose rules are the frames', () => {
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
        kind: NodeKind.AtRule,
        name: 'keyframes',
        prelude: 'spin',
        children: [
          {
            kind: NodeKind.Rule,
            selectors: ['from'],
            children: [{ kind: NodeKind.Decl, prop: 'transform', value: 'rotate(0deg)' }],
          },
          {
            kind: NodeKind.Rule,
            selectors: ['50%'],
            children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0.5' }],
          },
          {
            kind: NodeKind.Rule,
            selectors: ['to'],
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
        kind: NodeKind.AtRule,
        name: 'keyframes',
        prelude: 'pulse',
        children: [
          {
            kind: NodeKind.Rule,
            selectors: ['0%', '100%'],
            children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '1' }],
          },
          {
            kind: NodeKind.Rule,
            selectors: ['50%'],
            children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0.5' }],
          },
        ],
      },
    ]);
  });

  it('parses a vendor-prefixed @keyframes and a bodiless one as plain at-rules', () => {
    expect(parse('@-webkit-keyframes k { to { top: 0 } } @keyframes gone;')).toEqual([
      {
        kind: NodeKind.AtRule,
        name: '-webkit-keyframes',
        prelude: 'k',
        children: [
          {
            kind: NodeKind.Rule,
            selectors: ['to'],
            children: [{ kind: NodeKind.Decl, prop: 'top', value: '0' }],
          },
        ],
      },
      { kind: NodeKind.AtRule, name: 'keyframes', prelude: 'gone', children: null },
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
          kind: NodeKind.AtRule,
          name: 'keyframes',
          prelude: 'k',
          children: [
            {
              kind: NodeKind.Rule,
              selectors: ['from'],
              children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0' }],
            },
            {
              kind: NodeKind.Rule,
              selectors: ['to'],
              children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '1' }],
            },
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
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: '(min-width: 1px)',
          children: [{ kind: NodeKind.Decl, prop: 'a', value: 'b' }],
        },
      ]);
    });

    it.each([
      [
        '@import with an adjacent string holding a semicolon',
        '@import"a;b";',
        [{ kind: NodeKind.AtRule, name: 'import', prelude: '"a;b"', children: null }],
      ],
      [
        '@keyframes with an adjacent quoted name',
        '@keyframes"fade"{from{opacity:0}}',
        [
          {
            kind: NodeKind.AtRule,
            name: 'keyframes',
            prelude: '"fade"',
            children: [
              {
                kind: NodeKind.Rule,
                selectors: ['from'],
                children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0' }],
              },
            ],
          },
        ],
      ],
      [
        '@media with an adjacent condition',
        '@media(min-width: 600px){color:red}',
        [
          {
            kind: NodeKind.AtRule,
            name: 'media',
            prelude: '(min-width: 600px)',
            children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
          },
        ],
      ],
      [
        '@supports with an adjacent condition holding a quoted semicolon',
        '@supports(content:";"){color:red}',
        [
          {
            kind: NodeKind.AtRule,
            name: 'supports',
            prelude: '(content:";")',
            children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
          },
        ],
      ],
      [
        '@charset with an adjacent string',
        '@charset"utf-8";',
        [{ kind: NodeKind.AtRule, name: 'charset', prelude: '"utf-8"', children: null }],
      ],
    ])('ends the at-rule name before non-ident tokens for %s', (_label, css, expected) => {
      expect(parse(css)).toEqual(expected);
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
      ['1 backslash keeps the escaped space', '.a\\ ', '.a\\ '],
      ['1 backslash trims extra unescaped spaces after the escaped space', '.a\\   ', '.a\\ '],
      ['2 backslashes trim the unescaped space', '.a\\\\ ', '.a\\\\'],
      ['3 backslashes keep the escaped space', '.a\\\\\\ ', '.a\\\\\\ '],
      ['4 backslashes trim the unescaped space', '.a\\\\\\\\ ', '.a\\\\\\\\'],
    ])('trimRange handles trailing backslash parity when %s', (_label, input, expected) => {
      expect(trimRange(input)).toBe(expected);
    });

    it('trimRange stops backslash counting at the subrange start', () => {
      expect(trimRange('x\\\\ ', 2, 4)).toBe('\\ ');
    });

    it('trims the unescaped space ending a selector after an escaped backslash', () => {
      expect(parse('.a\\\\ { b: c; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['.a\\\\'],
          children: [{ kind: NodeKind.Decl, prop: 'b', value: 'c' }],
        },
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

    // CSS Syntax 3 §3.3 "Preprocessing the input stream":
    // "Replace any U+000D CARRIAGE RETURN (CR) code points, U+000C FORM FEED (FF)
    // code points, or pairs of U+000D CARRIAGE RETURN (CR) followed by U+000A LINE
    // FEED (LF) in input by a single U+000A LINE FEED (LF) code point."
    // CSS Syntax 3 §4.3.5 "Consume a string token": "newline: This is a parse error.
    // Reconsume the current input code point, create a <bad-string-token>, and return
    // it." and U+005C: "if the next input code point is a newline, consume it."
    // Deviation: a browser resumes at an unescaped newline, but a trimmed value could
    // emit the string open, so the statement goes as for a string left open.
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
      ['a CRLF', '\\\r\n'],
    ])('keeps a string continued past an escaped %s', (_label, escaped) => {
      expect(parse(`c: "d${escaped}e"; a: b;`)).toEqual([
        { kind: NodeKind.Decl, prop: 'c', value: `"d${escaped}e"` },
        { kind: NodeKind.Decl, prop: 'a', value: 'b' },
      ]);
    });

    it('keeps a string continued past backslash CRLF and a hex escape consuming CRLF', () => {
      expect(parse('content: "foo\\\r\nbar"; color: red;')).toEqual([
        { kind: NodeKind.Decl, prop: 'content', value: '"foo\\\r\nbar"' },
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      ]);
      expect(parse('content: "\\31\r\n"; color: red;')).toEqual([
        { kind: NodeKind.Decl, prop: 'content', value: '"\\31\r\n"' },
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      ]);
      expect(parse('color: red; content: "foo\\\\\r\nbar";')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
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
          `[sc] \`${text}\` holds a \`(\`, a \`[\`, or a quote that never closes, so it and everything after it in that text are dropped. Close it, and keep a string on one line.`,
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

  it('keeps a nested rule inside a keyframe frame for the emitter to leave out', () => {
    // A frame body is a declaration list; the parser keeps the tree as written, and a rule
    // inside a frame has no meaning to the emitters.
    expect(parse('@keyframes k { from { a { color: red } } to { opacity: 1 } }')).toEqual([
      {
        kind: NodeKind.AtRule,
        name: 'keyframes',
        prelude: 'k',
        children: [
          {
            kind: NodeKind.Rule,
            selectors: ['from'],
            children: [
              {
                kind: NodeKind.Rule,
                selectors: ['a'],
                children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
              },
            ],
          },
          {
            kind: NodeKind.Rule,
            selectors: ['to'],
            children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '1' }],
          },
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

  /**
   * Syntax 3, 4.3.7 (consume an escaped code point): "Consume as many hex digits as possible,
   * but no more than 5. Note that this means 1-6 hex digits have been consumed in total. If the
   * next input code point is whitespace, consume it as well." and "anything else: Return the
   * current input code point." (one character).
   */
  describe('scanQPB reading a CSS escape', () => {
    it.each<[string, string, number]>([
      ['a hex escape takes the space after it', '.\\31 0 a', 6],
      ['six hex digits take the space after them', '\\000041 b', 9],
      ['a seventh digit is plain text', '\\0000411 x', 8],
      ['only one whitespace belongs to the escape', '\\31  b', 4],
      ['a tab after a hex escape belongs to it', '\\31\tb c', 5],
      ['an uppercase hex digit counts', '\\3A b c', 5],
      ['a hex escape with no whitespace after it takes none', '\\31g b', 4],
      ['an escaped character that is not hex stays two bytes', '\\g b', 2],
      ['an escaped space is no stop', '\\ a b', 3],
      ['a hex escape at the end leaves no stop', 'a\\31 ', 5],
      [
        'a hex escape in a string takes the newline after it, so the string stays open',
        '"\\31\nb" x',
        7,
      ],
      ['a hex escape takes a CRLF after it', '\\31\r\nb c', 6],
      ['a backslash as the last character leaves the text open', 'a\\', 3],
    ])('%s', (_label, text, stop) => {
      expect(scanQPB(text, 0, text.length, STOP_WS | STOP_COMBINATOR)).toBe(stop);
    });
  });

  /**
   * CSS Custom Properties L1 §2.1 (https://drafts.csswg.org/css-variables-1/#syntax):
   * "The <declaration-value> production matches any sequence of one or more tokens, so long
   * as the sequence does not contain <bad-string-token>, <bad-url-token>, unmatched <)-token>,
   * <]-token>, or <}-token>, or top-level <semicolon-token> tokens or <delim-token> tokens
   * with a value of "!"."
   *
   * CSS Syntax 3 §5.5.6 (https://drafts.csswg.org/css-syntax-3/#consume-declaration):
   * "Consume a list of component values from input, with nested, and with <semicolon-token>
   * as the stop token, and set decl's value to the result."
   */
  describe('custom property values', () => {
    it('parses a custom property holding a balanced `{...}` block as a declaration', () => {
      expect(parse('--obj: { color: red; }; background: blue;')).toEqual([
        { kind: NodeKind.Decl, prop: '--obj', value: '{ color: red; }' },
        { kind: NodeKind.Decl, prop: 'background', value: 'blue' },
      ]);
    });

    it('parses nested `{...}` blocks inside a custom property value', () => {
      expect(parse('--a: { --b: { x: 1 }; }; color: green;')).toEqual([
        { kind: NodeKind.Decl, prop: '--a', value: '{ --b: { x: 1 }; }' },
        { kind: NodeKind.Decl, prop: 'color', value: 'green' },
      ]);
    });

    it('parses a custom property block without a trailing semicolon before its enclosing `}`', () => {
      expect(parse('.box { --obj: { color: red; } }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['.box'],
          children: [{ kind: NodeKind.Decl, prop: '--obj', value: '{ color: red; }' }],
        },
      ]);
    });

    it('drops a custom property whose `{` is never closed', () => {
      resetWarnOnce();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(parse('color: blue; --obj: { color: red;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'blue' },
      ]);
      warn.mockRestore();
    });

    it('preserves whitespace after top-level commas in custom property values', () => {
      expect(parse('--list: a, b, c; font-family: a, b, c;')).toEqual([
        { kind: NodeKind.Decl, prop: '--list', value: 'a, b, c' },
        { kind: NodeKind.Decl, prop: 'font-family', value: 'a,b,c' },
      ]);
    });

    /**
     * CSS Variables 1 §2 (https://drafts.csswg.org/css-variables-1/#defining-variables):
     * "The <custom-property-name> production corresponds to this: it’s defined as any
     * <dashed-ident> (a valid identifier that starts with two dashes), except -- itself,
     * which is reserved for future use by CSS."
     */
    it('validates <dashed-ident> in isCustomProperty so selector lists starting with -- parse as rules', () => {
      expect(isCustomProperty('--foo')).toBe(true);
      expect(isCustomProperty('--my\\:prop')).toBe(true);
      expect(isCustomProperty('--a\\31 b')).toBe(true);
      expect(isCustomProperty('--é')).toBe(true);
      expect(isCustomProperty('--')).toBe(false);
      expect(isCustomProperty('--a, .b')).toBe(false);
      expect(isCustomProperty('--a .b')).toBe(false);
      expect(isCustomProperty('--a\\')).toBe(false);
      expect(isCustomProperty('--a\\\nb')).toBe(false);
      // Linear-time guard against catastrophic regex backtracking on repeated hex escapes.
      const t0 = performance.now();
      expect(isCustomProperty('--' + '\\a'.repeat(500) + '!')).toBe(false);
      expect(isCustomProperty('--' + '\\aa'.repeat(500) + '!')).toBe(false);
      expect(performance.now() - t0).toBeLessThan(50);

      expect(parse('--a, .b:hover { color: red; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['--a', '.b:hover'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
      expect(parse('--a .b:hover { color: red; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['--a .b:hover'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
    });
  });

  /**
   * CSS Syntax 3 §3.3 (https://drafts.csswg.org/css-syntax-3/#input-preprocessing):
   * "Replace any U+000D CARRIAGE RETURN (CR) code points, U+000C FORM FEED (FF) code
   * points, or pairs of U+000D CARRIAGE RETURN (CR) followed by U+000A LINE FEED (LF)
   * in input by a single U+000A LINE FEED (LF) code point."
   */
  describe('form feed whitespace', () => {
    it('treats leading and surrounding \\f as whitespace in parseBlock and trimRange', () => {
      expect(parse('\f--x: ;')).toEqual([{ kind: NodeKind.Decl, prop: '--x', value: '' }]);
      expect(parse('--x: \f;')).toEqual([{ kind: NodeKind.Decl, prop: '--x', value: '' }]);
      expect(parse('\fcolor\f: \fred\f;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      ]);
      expect(trimRange('\fa\f')).toBe('a');
    });

    it('treats \\f as whitespace in takeSlots, stripCommaSpaces, and parseAtRule', () => {
      expect(
        parse('\x000\x00\f\x001\x00', [InterpolationKind.Static, InterpolationKind.Static])
      ).toEqual([
        { dyn: true, kind: NodeKind.Interpolation, index: 0 },
        { dyn: true, kind: NodeKind.Interpolation, index: 1 },
      ]);
      expect(parse('font-family: a,\fb,\fc;')).toEqual([
        { kind: NodeKind.Decl, prop: 'font-family', value: 'a,b,c' },
      ]);
      expect(parse('@media\f(min-width: 1px) { color: red; }')).toEqual([
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: '(min-width: 1px)',
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
    });
  });

  describe('scanQPB stop mask', () => {
    it.each<[string, number, string, number]>([
      ['STOP_COLON', STOP_COLON, 'a:b', 1],
      ['STOP_SEMI', STOP_SEMI, 'a;b', 1],
      ['STOP_LBRACE', STOP_LBRACE, 'a{b', 1],
      ['STOP_RBRACE', STOP_RBRACE, 'a}b', 1],
      ['STOP_COMMA', STOP_COMMA, 'a,b', 1],
      ['STOP_WS on a space', STOP_WS, 'a b', 1],
      ['STOP_WS on a tab', STOP_WS, 'a\tb', 1],
      ['STOP_WS on a line feed', STOP_WS, 'a\nb', 1],
      ['STOP_WS on a carriage return', STOP_WS, 'a\rb', 1],
      ['STOP_WS on a form feed', STOP_WS, 'a\fb', 1],
      ['STOP_COMBINATOR on >', STOP_COMBINATOR, 'a>b', 1],
      ['STOP_COMBINATOR on +', STOP_COMBINATOR, 'a+b', 1],
      ['STOP_COMBINATOR on ~', STOP_COMBINATOR, 'a~b', 1],
      ['STOP_RPAREN', STOP_RPAREN, 'a)b', 1],
      ['STOP_RBRACKET', STOP_RBRACKET, 'a]b', 1],
    ])('%s stops at the top-level byte', (_label, mask, text, stop) => {
      expect(scanQPB(text, 0, text.length, mask)).toBe(stop);
    });

    it.each(['a:b', 'a;b', 'a{b}', 'a,b', 'a b', 'a>b', 'a)b', 'a]b'])(
      'a mask that does not name a byte of %j reads to the end',
      text => {
        expect(scanQPB(text, 0, text.length, 0)).toBe(text.length);
      }
    );

    it('stops at the first of several masked bytes', () => {
      const text = 'ab c,d;e';
      expect(scanQPB(text, 0, text.length, STOP_SEMI | STOP_COMMA | STOP_WS)).toBe(2);
      expect(scanQPB(text, 3, text.length, STOP_SEMI | STOP_COMMA | STOP_WS)).toBe(4);
      expect(scanQPB(text, 5, text.length, STOP_SEMI | STOP_COMMA | STOP_WS)).toBe(6);
    });

    it.each([
      ['a string', '"a;b" c;'],
      ['a single-quoted string', "'a;b' c;"],
      ['a paren', '(a;b) c;'],
      ['a bracket', '[a;b] c;'],
      ['a brace', '{a;b} c;'],
      ['a url token', 'url(a;b) c;'],
    ])('skips a stop inside %s', (_label, text) => {
      expect(scanQPB(text, 0, text.length, STOP_SEMI)).toBe(text.length - 1);
    });

    it('stops at a top-level opener only when the mask names it', () => {
      expect(scanQPB('a{b', 0, 3, STOP_LBRACE)).toBe(1);
      expect(scanQPB('a{b', 0, 3, STOP_SEMI)).toBe(4);
      expect(scanQPB('a(b', 0, 3, STOP_SEMI)).toBe(4);
    });

    it('reads a byte past ASCII as text', () => {
      const text = 'é\u2028;';
      expect(scanQPB(text, 0, text.length, STOP_SEMI)).toBe(2);
    });

    it('closes a block only with its own mirror', () => {
      expect(scanQPB('[a)b];', 0, 6, STOP_SEMI)).toBe(5);
      expect(scanQPB('(a]b);', 0, 6, STOP_SEMI)).toBe(5);
      expect(scanQPB('{a)b};', 0, 6, STOP_SEMI)).toBe(5);
    });

    it('reads a text left open past its end', () => {
      expect(scanQPB('"a;b', 0, 4, STOP_SEMI)).toBe(5);
      expect(scanQPB('(a;b', 0, 4, STOP_SEMI)).toBe(5);
      expect(scanQPB('"a\nb";', 0, 6, STOP_SEMI)).toBe(7);
      expect(scanQPB('a/*b;', 0, 5, STOP_SEMI)).toBe(6);
      expect(scanQPB('a;b', 0, 1, STOP_SEMI)).toBe(1);
    });

    it.each<[string, string, number, number, number]>([
      ['a suffix past end', 'a;b', 2, 3, 3],
      ['a stop past end', 'ab;', 0, 2, 2],
      ['a hex escape whose trailing space sits past end', 'a\\31 b', 0, 4, 4],
      ['a trailing backslash whose hex digits sit past end', 'a\\31', 0, 2, 3],
      ['a trailing backslash at end', 'a\\', 0, 2, 3],
      ['a slash whose asterisk sits past end', 'a/*', 0, 2, 2],
      ['a comment opener inside end', 'a/*', 0, 3, 4],
    ])('reads a scan range, not the text past its end (%s)', (_label, text, start, end, stop) => {
      expect(scanQPB(text, start, end, STOP_SEMI)).toBe(stop);
    });

    it('holds a field stop by default and a further stop by mask', () => {
      expect(staysOneField('a,b')).toBe(true);
      expect(staysOneField('a,b', STOP_COMMA)).toBe(false);
      expect(staysOneField('a;b')).toBe(false);
      expect(staysOneField('a{b}')).toBe(false);
      expect(staysOneField('a}')).toBe(false);
      expect(staysOneField('[a,b]', STOP_COMMA)).toBe(true);
    });
  });

  describe('interpolation slots', () => {
    // A template's slots are `\0<index>\0` sentinels in the text. `parse` reads them only
    // when given `slotKinds` (one entry per slot): a whole statement becomes an Interpolation
    // node and its kind gains `InterpolationKind.Standalone`; anywhere else it becomes a
    // TemplateValue field. Without `slotKinds` the bytes are opaque, so untrusted CSS (a
    // value read on its own) cannot fabricate slot structure.
    const STATIC = InterpolationKind.Static;
    const STANDALONE = InterpolationKind.Standalone;
    const slots = (count: number) => Array.from({ length: count }, () => STATIC);

    it('emits an Interpolation node for a slot that is a whole statement', () => {
      const kinds = slots(1);
      expect(parse('\x000\x00', kinds)).toEqual([
        { dyn: true, kind: NodeKind.Interpolation, index: 0 },
      ]);
      expect(kinds).toEqual([STATIC | STANDALONE]);
    });

    it('emits an Interpolation between declarations', () => {
      const kinds = slots(1);
      expect(parse('color: red; \x000\x00 margin: 0;', kinds)).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
        { dyn: true, kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Decl, prop: 'margin', value: '0' },
      ]);
      expect(kinds).toEqual([STATIC | STANDALONE]);
    });

    it('ends the last slot before a semicolon, and no other', () => {
      expect(parse('\x000\x00 \x001\x00;', slots(2))).toEqual([
        { dyn: true, kind: NodeKind.Interpolation, index: 0 },
        { dyn: true, ended: true, kind: NodeKind.Interpolation, index: 1 },
      ]);
    });

    it('handles multi-digit indices', () => {
      const kinds = slots(346);
      expect(parse('\x000\x00\x0012\x00\x00345\x00', kinds)).toEqual([
        { dyn: true, kind: NodeKind.Interpolation, index: 0 },
        { dyn: true, kind: NodeKind.Interpolation, index: 12 },
        { dyn: true, kind: NodeKind.Interpolation, index: 345 },
      ]);
      expect(kinds.filter(kind => kind === (STATIC | STANDALONE)).length).toBe(3);
    });

    it('reads every slot of a run as a statement when nothing continues the last', () => {
      expect(parse('\x000\x00\n\x001\x00\ncolor: red;', slots(2))).toEqual([
        { dyn: true, kind: NodeKind.Interpolation, index: 0 },
        { dyn: true, kind: NodeKind.Interpolation, index: 1 },
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      ]);
    });

    it('lifts a slot inside a declaration value to a TemplateValue', () => {
      const kinds = slots(1);
      expect(parse('color: \x000\x00;', kinds)).toEqual([
        {
          dyn: true,
          kind: NodeKind.Decl,
          prop: 'color',
          value: { chunks: ['', ''], slots: [0] },
        },
      ]);
      expect(kinds).toEqual([STATIC]);
    });

    it('lifts a slot in a property name to a TemplateValue', () => {
      expect(parse('\x000\x00: red;', slots(1))).toEqual([
        {
          dyn: true,
          kind: NodeKind.Decl,
          prop: { chunks: ['', ''], slots: [0] },
          value: 'red',
        },
      ]);
    });

    it('defers comma-space stripping and empty-value dropping when the property name starts with a slot', () => {
      expect(parse('\x000\x00: a, b, c;', slots(1))).toEqual([
        {
          dyn: true,
          kind: NodeKind.Decl,
          prop: { chunks: ['', ''], slots: [0] },
          value: 'a, b, c',
        },
      ]);
      expect(parse('\x000\x00: ;', slots(1))).toEqual([
        {
          dyn: true,
          kind: NodeKind.Decl,
          prop: { chunks: ['', ''], slots: [0] },
          value: '',
        },
      ]);
      expect(parse('--\x000\x00: a, b, c;', slots(1))).toEqual([
        {
          dyn: true,
          kind: NodeKind.Decl,
          prop: { chunks: ['--', ''], slots: [0] },
          value: 'a, b, c',
        },
      ]);
      expect(parse('--\x000\x00: ;', slots(1))).toEqual([
        {
          dyn: true,
          kind: NodeKind.Decl,
          prop: { chunks: ['--', ''], slots: [0] },
          value: '',
        },
      ]);
    });

    it.each([
      ['a space and an ampersand', '\x000\x00 & { color: red; }', ['', ' &']],
      ['a pseudo-class', '\x000\x00:hover { color: red; }', ['', ':hover']],
      ['a combinator', '\x000\x00 > b { color: red; }', ['', ' > b']],
      ['a class written against it', '\x000\x00.x { color: red; }', ['', '.x']],
      ['only a block', '\x000\x00 { color: red; }', ['', '']],
    ])('keeps the last slot in the selector it continues: %s', (_label, css, chunks) => {
      const kinds = slots(1);
      expect(parse(css, kinds)).toEqual([
        {
          dyn: true,
          kind: NodeKind.Rule,
          selectors: [{ chunks, slots: [0] }],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
      expect(kinds).toEqual([STATIC]);
    });

    it('reads a slot before a class set apart by whitespace as a statement', () => {
      const kinds = slots(1);
      expect(parse('\x000\x00 .x { color: red; }', kinds)).toEqual([
        { dyn: true, kind: NodeKind.Interpolation, index: 0 },
        {
          kind: NodeKind.Rule,
          selectors: ['.x'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
      expect(kinds).toEqual([STATIC | STANDALONE]);
    });

    it('splits a slot run from the selector its last slot continues', () => {
      const kinds = slots(2);
      expect(parse('\x000\x00 \x001\x00 > b { color: red; }', kinds)).toEqual([
        { dyn: true, kind: NodeKind.Interpolation, index: 0 },
        {
          dyn: true,
          kind: NodeKind.Rule,
          selectors: [{ chunks: ['', ' > b'], slots: [1] }],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
      expect(kinds).toEqual([STATIC | STANDALONE, STATIC]);
    });

    it('reads a slot at the end of a block or of the text as a statement', () => {
      expect(parse('a { \x000\x00 }', slots(1))).toEqual([
        {
          dyn: true,
          kind: NodeKind.Rule,
          selectors: ['a'],
          children: [{ dyn: true, kind: NodeKind.Interpolation, index: 0 }],
        },
      ]);
    });

    it('marks every ancestor of a dynamic node, and no static sibling', () => {
      expect(
        parse('b { top: 0; } @media x { a { color: \x000\x00; } left: 0; } c: d;', slots(1))
      ).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['b'],
          children: [{ kind: NodeKind.Decl, prop: 'top', value: '0' }],
        },
        {
          dyn: true,
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: 'x',
          children: [
            {
              dyn: true,
              kind: NodeKind.Rule,
              selectors: ['a'],
              children: [
                {
                  dyn: true,
                  kind: NodeKind.Decl,
                  prop: 'color',
                  value: { chunks: ['', ''], slots: [0] },
                },
              ],
            },
            { kind: NodeKind.Decl, prop: 'left', value: '0' },
          ],
        },
        { kind: NodeKind.Decl, prop: 'c', value: 'd' },
      ]);
    });

    it('marks an at-rule whose name or prelude holds a slot', () => {
      expect(parse('@media \x000\x00 { a { top: 0; } }', slots(1))).toEqual([
        {
          dyn: true,
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: { chunks: ['', ''], slots: [0] },
          children: [
            {
              kind: NodeKind.Rule,
              selectors: ['a'],
              children: [{ kind: NodeKind.Decl, prop: 'top', value: '0' }],
            },
          ],
        },
      ]);
    });

    it('does not mark a parent for a dropped at-rule that held a slot', () => {
      // `@1x` cannot name an at-rule, so it and its slot are dropped; the rule around it
      // reads nothing at render time.
      expect(parse('a { @1x { top: \x000\x00; } color: red; }', slots(1))).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['a'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
    });

    it('marks no node of text without slots', () => {
      expect(parse('a { top: 0; } @media x { left: 0; }', [])).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['a'],
          children: [{ kind: NodeKind.Decl, prop: 'top', value: '0' }],
        },
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: 'x',
          children: [{ kind: NodeKind.Decl, prop: 'left', value: '0' }],
        },
      ]);
    });

    describe('a sentinel naming no slot of the template', () => {
      it('is dropped like any other statement of no meaning', () => {
        const kinds = slots(1);
        expect(parse('\x00999\x00', kinds)).toEqual([]);
        expect(kinds).toEqual([STATIC]);
        expect(kinds.length).toBe(1);
      });

      it('stays text in a declaration value', () => {
        const kinds = slots(1);
        expect(parse('color: red\x00999\x00blue;', kinds)).toEqual([
          { kind: NodeKind.Decl, prop: 'color', value: 'red\x00999\x00blue' },
        ]);
        expect(kinds.length).toBe(1);
      });

      it('stays text in a selector, with the slots around it read', () => {
        const kinds = slots(1);
        expect(parse('\x00999\x00\x000\x00 { color: red; }', kinds)).toEqual([
          {
            dyn: true,
            kind: NodeKind.Rule,
            selectors: [{ chunks: ['\x00999\x00', ''], slots: [0] }],
            children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
          },
        ]);
        expect(kinds).toEqual([STATIC]);
      });

      it('leaves no hole in the kinds', () => {
        const kinds = slots(1);
        parse('\x00999\x00 { color: \x00999\x00; } \x00999\x00;', kinds);
        expect(Object.keys(kinds)).toEqual(['0']);
      });

      it('does not end a slot run', () => {
        const kinds = slots(1);
        expect(parse('\x000\x00 \x00999\x00;', kinds)).toEqual([
          { dyn: true, kind: NodeKind.Interpolation, index: 0 },
        ]);
        expect(kinds).toEqual([STATIC | STANDALONE]);
      });
    });

    it('keeps `\0sc:...` theme sentinels as opaque value content', () => {
      // Native theme sentinels start with `\0s`, not a digit.
      const value = 'color: \0sc:fg:#000\0;';
      expect(parse(value)).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0sc:fg:#000\0' },
      ]);
      expect(parse(value, slots(1))).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0sc:fg:#000\0' },
      ]);
    });

    it('falls through on a malformed sentinel (no digits)', () => {
      expect(parse('\0\0', slots(1))).toEqual([]);
    });

    // The static-input gate. Untrusted CSS routed through `parse()` without `slotKinds` (a
    // value read on its own) must NEVER fabricate slot structure. These guard the attack
    // surface where a user-supplied interpolation value contains sentinel-shaped bytes plus
    // structural CSS characters (`;` `{` `}`); the sentinel bytes must stay opaque content.

    it('default mode: a standalone-looking sentinel emits no Interpolation node', () => {
      expect(parse('\x000\x00')).toEqual([]);
    });

    it('default mode: a sentinel-shaped value stays plain string content', () => {
      // No TemplateValue, no Interpolation, no crash, whether the sentinel is the whole value
      // or embedded inside user-supplied text.
      expect(parse('color: \x000\x00;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\x000\x00' },
      ]);
      expect(parse('color: red\x000\x00blue;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red\x000\x00blue' },
      ]);
    });

    it('default mode: a sentinel in a selector stays plain string content', () => {
      expect(parse('\x000\x00 & { color: red; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['\x000\x00 &'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
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
