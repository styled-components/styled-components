import { NodeKind } from './ast';
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

  it('keeps a space after a comma in a value as written', () => {
    expect(parse('transition: opacity 1s, transform 2s; font-family: a,b;')).toEqual([
      { kind: NodeKind.Decl, prop: 'transition', value: 'opacity 1s, transform 2s' },
      { kind: NodeKind.Decl, prop: 'font-family', value: 'a,b' },
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

  // CSS Syntax 3 §4.3.1 Consume a token: "U+0040 COMMERCIAL AT (@): If the
  // next 3 input code points would start an ident sequence, consume an ident
  // sequence, create an <at-keyword-token> with its value set to the returned
  // value, and return it." The name ends at the first code point that is not
  // an ident code point; the parser stops it at whitespace, `;`, `{`, `}`, or `(`.
  describe('at-rule name end', () => {
    it('ends the name at `(`', () => {
      expect(parse('@media(min-width: 1px) { color: red; }')).toEqual([
        {
          kind: NodeKind.AtRule,
          name: 'media',
          prelude: '(min-width: 1px)',
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
    });

    it('ends the name at `}`, which at the top level drops the at-rule as a stray `}`', () => {
      expect(parse('@x} y; color: red;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      ]);
    });

    it('ends the name at `}`, which closes an enclosing block', () => {
      expect(parse('& { @x} color: red;')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&'],
          children: [{ kind: NodeKind.AtRule, name: 'x', prelude: '', children: null }],
        },
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      ]);
    });

    it('drops a `@` before a stray `}` at the top level', () => {
      expect(parse('@}')).toEqual([]);
    });
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

  it('reads a keyframe frame body as declarations only, with no nested rules or at-rules', () => {
    expect(parse('@keyframes k { from { @x: 1; a { b: c } } }')).toEqual([
      {
        kind: NodeKind.Keyframes,
        name: 'keyframes',
        prelude: 'k',
        frames: [
          {
            stops: ['from'],
            children: [
              { kind: NodeKind.Decl, prop: '@x', value: '1' },
              { kind: NodeKind.Decl, prop: 'a { b', value: 'c' },
            ],
          },
        ],
      },
    ]);
  });

  it('ends @keyframes at its own brace when a frame-list statement has no block', () => {
    expect(parse('@keyframes k { junk } color: red;')).toEqual([
      { kind: NodeKind.Keyframes, name: 'keyframes', prelude: 'k', frames: [] },
      { kind: NodeKind.Decl, prop: 'color', value: 'red' },
    ]);
  });

  it('ends @keyframes at its own brace after a slot followed by blockless text', () => {
    expect(parse('@keyframes k { \0S0\0junk } color: red;', { templates: true })).toEqual([
      { kind: NodeKind.Keyframes, name: 'keyframes', prelude: 'k', frames: [] },
      { kind: NodeKind.Decl, prop: 'color', value: 'red' },
    ]);
  });

  /**
   * CSS Syntax 3 §4.3.4 Consume an ident-like token: "If string’s value is an
   * ASCII case-insensitive match for "url", and the next input code point is
   * U+0028 LEFT PARENTHESIS ((), consume it. ... Otherwise, consume a url
   * token, and return it." §4.3.6 Consume a url token: "U+0022 QUOTATION MARK
   * (") U+0027 APOSTROPHE (') U+0028 LEFT PARENTHESIS (() non-printable code
   * point: This is a parse error. Consume the remnants of a bad url, create a
   * <bad-url-token>, and return it."
   */
  describe('the text of an unquoted url(', () => {
    it('reads a quote inside it as url text, not a string', () => {
      expect(parse('background: url(a"b); color: red;')).toEqual([
        { kind: NodeKind.Decl, prop: 'background', value: 'url(a"b)' },
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      ]);
    });

    // §4.3.7 Consume an escaped code point: "hex digit: Consume as many hex
    // digits as possible, but no more than 5. Note that this means 1-6 hex
    // digits have been consumed in total. If the next input code point is
    // whitespace, consume it as well."
    it('reads url( spelled with an escape as url(', () => {
      expect(parse('background: \\75rl(a"b); color: red;')).toEqual([
        { kind: NodeKind.Decl, prop: 'background', value: '\\75rl(a"b)' },
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      ]);
    });

    it('reads a hex escape and the whitespace after it as one identifier with the text after', () => {
      expect(parse('a: \\41 url(x"y); b: c; d: "e";')).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: '\\41 url(x"y); b: c; d: "e";' },
      ]);
    });

    // §4.3.1 Consume a token: "U+0023 NUMBER SIGN (#): If the next input code
    // point is an ident code point or the next two input code points are a
    // valid escape, then: Create a <hash-token>." "U+0040 COMMERCIAL AT (@):
    // If the next 3 input code points would start an ident sequence, consume
    // an ident sequence, create an <at-keyword-token>".
    it.each([['#'], ['@']])('reads `%surl(` as a name and a parenthesis, not url(', lead => {
      expect(parse(`a: ${lead}url(x"y); b: c; d: "e";`)).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: `${lead}url(x"y); b: c; d: "e";` },
      ]);
    });

    it('keeps a comma inside it within one list entry', () => {
      expect(splitSelectors('url(a"b), c')).toEqual(['url(a"b)', 'c']);
    });
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

  describe('a stray `}` at the top level', () => {
    it('drops the statement holding it and reads the next statement', () => {
      expect(parse('a: b; c: d } e: f; }; g: h')).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: 'b' },
        { kind: NodeKind.Decl, prop: 'e', value: 'f' },
        { kind: NodeKind.Decl, prop: 'g', value: 'h' },
      ]);
    });

    it('drops the statement after a rule it follows', () => {
      expect(parse('& { a: b; } } c: d;')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['&'],
          children: [{ kind: NodeKind.Decl, prop: 'a', value: 'b' }],
        },
        { kind: NodeKind.Decl, prop: 'c', value: 'd' },
      ]);
    });

    it('keeps the slots a Run splices before it', () => {
      expect(parse('\0S0\0 } color: red;', { templates: true })).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
      ]);
    });

    it('reads a `}` inside a string as string text', () => {
      expect(parse('a: "}"; b: c')).toEqual([
        { kind: NodeKind.Decl, prop: 'a', value: '"}"' },
        { kind: NodeKind.Decl, prop: 'b', value: 'c' },
      ]);
    });
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
    // `\0S<index>\0` marks a slot. `parseSource` joins the template around
    // these and the parser assigns each slot its role from where it sits.
    // Slot detection is gated on `options.templates` so untrusted CSS routed
    // through the static-input parse path (e.g. via the `buildHashCSS`
    // fallback after a fast-path bail) cannot fabricate slot-looking content
    // into structural Interpolation / TemplateValue nodes.

    it('emits an Interpolation node for a slot alone in the block (templates: true)', () => {
      expect(parse('\0S0\0', { templates: true })).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
      ]);
    });

    it('emits an Interpolation node between decls (templates: true)', () => {
      expect(parse('color: red; \0S0\0 margin: 0;', { templates: true })).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Decl, prop: 'margin', value: '0' },
      ]);
    });

    it('handles multi-digit indices (templates: true)', () => {
      expect(parse('\0S0\0\0S12\0\0S345\0', { templates: true })).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 12 },
        { kind: NodeKind.Interpolation, index: 345 },
      ]);
    });

    it('lifts slots in declaration values to TemplateValue', () => {
      expect(parse('color: \0S0\0;', { templates: true })).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'color',
          value: { chunks: ['', ''], slots: [0] },
        },
      ]);
    });

    it('lifts a slot glued to selector text to a TemplateValue selector', () => {
      expect(parse('\0S0\0& { color: red; }', { templates: true })).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [{ chunks: ['', '&'], slots: [0] }],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
    });

    it('reads a slot followed by whitespace and selector text as a rule Head', () => {
      expect(parse('\0S0\0 & { color: red; }', { templates: true })).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: [],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
          head: { gaps: [' '], rest: '&', slots: [0] },
        },
      ]);
    });

    it('lifts a slot written after a backslash to a TemplateValue', () => {
      expect(parse('content: "\\\0S0\0";', { templates: true })).toEqual([
        {
          kind: NodeKind.Decl,
          prop: 'content',
          value: { chunks: ['"\\', '"'], slots: [0] },
        },
      ]);
    });

    it('keeps existing `\0sc:...` theme sentinels as opaque value content', () => {
      // Native theme sentinels start with `\0s` (lowercase), distinct from `\0S`.
      expect(parse('color: \0sc:fg:#000\0;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0sc:fg:#000\0' },
      ]);
      expect(parse('color: \0sc:fg:#000\0;', { templates: true })).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0sc:fg:#000\0' },
      ]);
    });

    it('falls through on malformed slots (no digits)', () => {
      // `\0S\0` with no digits between the markers is not a slot. Malformed
      // input is treated as a stray decl and silently dropped.
      expect(parse('\0S\0', { templates: true })).toEqual([]);
    });

    it('treats other NUL-led letters as opaque text', () => {
      expect(parse('\0J0\0', { templates: true })).toEqual([]);
      expect(parse('color: \0I0\0;', { templates: true })).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0I0\0' },
      ]);
    });

    // The static-input gate. Untrusted CSS routed through `parse()` without
    // `{ templates: true }` (e.g. the `buildHashCSS` → `toNativeStyles`
    // fallback) must NEVER fabricate slot structure. These guard the attack
    // surface where a user-supplied interpolation value contains slot-shaped
    // bytes plus structural CSS chars (`;`/`{`/`}`); the primary fast path
    // bails on the structural chars, and the fallback re-parse must treat the
    // slot bytes as opaque content.

    it('default mode: slot bytes at a statement start do NOT emit an Interpolation node', () => {
      expect(parse('\0S0\0')).toEqual([]);
    });

    it('default mode: slot bytes in a value stay as plain string content', () => {
      expect(parse('color: \0S0\0;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0S0\0' },
      ]);
    });

    it('default mode: slot bytes before a rule do not form a Head', () => {
      expect(parse('\0S0\0 h2 { color: red; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['\0S0\0 h2'],
          children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
        },
      ]);
    });

    it('default mode: slot-shaped user value in a value position is opaque', () => {
      expect(parse('color: red\0S0\0blue;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red\0S0\0blue' },
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
