import { emitWeb } from '../../parser/emit-web';
import { parse } from '../../parser/parser';
import createCompiler, { ICreateCompiler, normalize } from '../compiler';
import rtl from '../../plugins/rtl';

function runCssCompile(css: string, options: ICreateCompiler = {}): string[] {
  const compiler = createCompiler(options);
  const componentId = 'a';
  return compiler.compile(css, `.${componentId}`, undefined, componentId);
}

describe('compiler', () => {
  it('handles simple rules', () => {
    expect(
      runCssCompile(`
      background: yellow;
      color: red;
    `)
    ).toMatchInlineSnapshot(`
      [
        ".a{background:yellow;color:red;}",
      ]
    `);
  });

  it('splits css with multiple rules', () => {
    expect(
      runCssCompile(`
      background: yellow;
      color: red;
      @media (min-width: 500px) {
        color: blue;
      }
    `)
    ).toMatchInlineSnapshot(`
      [
        ".a{background:yellow;color:red;}",
        "@media (min-width: 500px){.a{color:blue;}}",
      ]
    `);
  });

  it('splits css with encoded closing curly brace', () => {
    expect(
      runCssCompile(`
      @media (min-width: 500px) {
        &::before {
          content: "}";
        }
      }
    `)
    ).toMatchInlineSnapshot(`
      [
        "@media (min-width: 500px){.a::before{content:"}";}}",
      ]
    `);
  });

  describe('malformed CSS handling', () => {
    it('preserves styles after declaration with unbalanced closing brace', () => {
      // Simulates: line-height: ${() => "14px}"}
      expect(
        runCssCompile(`
        width: 100px;
        height: 100px;
        line-height: 14px}";
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;height:100px;background-color:green;}",
        ]
      `);
    });

    it('handles multiple malformed declarations', () => {
      expect(
        runCssCompile(`
        width: 100px;
        foo: bar}";
        height: 50px;
        baz: qux}";
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;height:50px;background-color:green;}",
        ]
      `);
    });

    it('handles malformed declaration followed by @media query', () => {
      expect(
        runCssCompile(`
        width: 100px;
        line-height: 14px}";
        @media (min-width: 500px) {
          color: blue;
        }
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;background-color:green;}",
          "@media (min-width: 500px){.a{color:blue;}}",
        ]
      `);
    });

    it('preserves properly quoted braces in content', () => {
      expect(
        runCssCompile(`
        width: 100px;
        content: "}";
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;content:"}";background-color:green;}",
        ]
      `);
    });

    it('handles extra brace not in quotes', () => {
      expect(
        runCssCompile(`
        width: 100px;
        height: 50px}
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;background-color:green;}",
        ]
      `);
    });

    it('handles extra opening brace in string', () => {
      expect(
        runCssCompile(`
        width: 100px;
        content: "{test";
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;content:"{test";background-color:green;}",
        ]
      `);
    });

    it('drops remaining content when unterminated string causes brace imbalance', () => {
      expect(
        runCssCompile(`
        width: 100px;
        content: "unterminated }
        background: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;}",
        ]
      `);
    });

    it('drops the statement holding an unterminated string even with no brace in the input', () => {
      expect(
        runCssCompile(`
        width: 100px;
        content: "unterminated; color: red;
      `)
      ).toEqual(['.a{width:100px;}']);
    });

    // CSS Syntax, "Consume a block's contents": "<EOF-token> <}-token> Return rules."
    test.each([
      [
        'an open rule',
        'color: blue; &:hover { color: red',
        '.a',
        ['.a{color:blue;}', '.a:hover{color:red;}'],
      ],
      [
        'an open rule ending in `;`',
        'color: blue; &:hover { color: red;',
        '.a',
        ['.a{color:blue;}', '.a:hover{color:red;}'],
      ],
      [
        'an open rule ending in `; `',
        'color: blue; &:hover { color: red; ',
        '.a',
        ['.a{color:blue;}', '.a:hover{color:red;}'],
      ],
      ['an open element rule', 'a: b; x { y: z', '.a', ['.a{a:b;}', '.a x{y:z;}']],
      ['two open rules', '&:hover { &:focus { color: red', '.a', ['.a:hover:focus{color:red;}']],
      [
        'an open @media',
        '@media (min-width: 1px) { color: red',
        '.a',
        ['@media (min-width: 1px){.a{color:red;}}'],
      ],
      [
        'an open @media holding a closed rule',
        '@media (min-width: 1px) { &:hover { color: red; }',
        '.a',
        ['@media (min-width: 1px){.a:hover{color:red;}}'],
      ],
      [
        'an open @media after a declaration',
        'color: blue; @media screen { color: red',
        '.a',
        ['.a{color:blue;}', '@media screen{.a{color:red;}}'],
      ],
      [
        'an open @font-face with no selector',
        '@font-face { font-family: x',
        '',
        ['@font-face{font-family:x;}'],
      ],
      [
        'an open @keyframes with no selector',
        '@keyframes k { from { opacity: 0 } to { opacity: 1',
        '',
        ['@keyframes k{from{opacity:0;}to{opacity:1;}}'],
      ],
      ['a string open at the end of input', 'a: b; content: "x; c: d;', '.a', ['.a{a:b;}']],
      ['a single-quoted string open at the end of input', "a: b; content: 'x", '.a', ['.a{a:b;}']],
      [
        'a stray `}` swallowed by an at-rule prelude',
        'color: blue; @media screen } color: red;',
        '.a',
        ['.a{color:blue;}'],
      ],
    ])('closes %s at the end of input', (_label, css, selector, expected) => {
      expect(createCompiler().compile(css, selector)).toEqual(expected);
    });

    test.each([
      ['no selector', 'color:red', '', '.parent', ['.parent{color:red;}']],
      ['a selector', 'color:red', '.a', '.parent', ['.parent .a{color:red;}']],
      [
        'no selector and a nested rule',
        '&:hover { color: red }',
        '',
        '.parent',
        ['.parent:hover{color:red;}'],
      ],
    ])(
      'wraps in a prefix with %s without a stray space',
      (_label, css, selector, prefix, expected) => {
        expect(createCompiler().compile(css, selector, prefix)).toEqual(expected);
      }
    );

    // The string path emits with an empty parent selector, so no element takes an added name.
    it('adds no container name or view-transition-class on the string path', () => {
      expect(
        createCompiler().compile('container-type: size; view-transition-name: card;', '.a')
      ).toEqual(['.a{container-type:size;view-transition-name:card;}']);
    });

    it('handles valid CSS unchanged (fast path)', () => {
      expect(
        runCssCompile(`
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;height:100px;border-radius:50%;background-color:green;}",
        ]
      `);
    });
  });

  describe('line comment handling (issue #5613)', () => {
    it('strips line comments at start of line', () => {
      expect(
        runCssCompile(`
        // this is a comment
        width: 100px;
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;background-color:green;}",
        ]
      `);
    });

    it('strips line comments at end of line', () => {
      expect(
        runCssCompile(`
        width: 100px; // some comment
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;background-color:green;}",
        ]
      `);
    });

    it('strips line comments after multiline calc()', () => {
      expect(
        runCssCompile(`max-height: calc(
  100px + 200px
); // comment
background-color: green;`)
      ).toMatchInlineSnapshot(`
        [
          ".a{max-height:calc(
          100px + 200px
        );background-color:green;}",
        ]
      `);
    });

    it('preserves // inside function call parens (calc, etc.)', () => {
      // // inside parens is preserved;paren-depth tracking protects
      // all function arguments, not just url()
      expect(
        runCssCompile(`width: 100px;
height: calc(
  50vh // viewport height
  - 20px // header
);
background-color: green;`)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;height:calc(
          50vh // viewport height
          - 20px // header
        );background-color:green;}",
        ]
      `);
    });

    it('strips line comments after closing paren', () => {
      expect(
        runCssCompile(`
        height: calc(50vh - 20px); // viewport minus header
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{height:calc(50vh - 20px);background-color:green;}",
        ]
      `);
    });

    it('preserves // inside block comments (issue #5658)', () => {
      expect(
        runCssCompile(`
        /* http://example.com */
        font-size: 40px;
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{font-size:40px;color:red;}",
        ]
      `);
    });

    it('preserves styles after block comment with // on same line', () => {
      expect(
        runCssCompile(`
        width: 100px; /* http://example.com */ color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;color:red;}",
        ]
      `);
    });

    it('preserves // inside strings', () => {
      expect(
        runCssCompile(`
        width: 100px;
        content: "http://example.com";
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;content:"http://example.com";background-color:green;}",
        ]
      `);
    });

    // CSS Syntax, "consume comments": "If the next two input code points are
    // U+002F SOLIDUS (/) followed by a U+002A ASTERISK (*), consume them and all
    // following code points up to and including the first U+002A ASTERISK (*)
    // followed by a U+002F SOLIDUS (/), or up to an EOF code point." A `//`
    // never opens a CSS comment, so after a `:` it is the start of a value
    // (a protocol-relative URL); the line-comment strip is a library extension.
    describe('protocol-relative value after a colon', () => {
      test.each([
        ['one space', '--cdn: //cdn.example.com/x.png;\ncolor: red;'],
        ['no space', '--cdn://cdn.example.com/x.png;\ncolor: red;'],
        ['a tab', '--cdn:\t//cdn.example.com/x.png;\ncolor: red;'],
      ])('keeps the value with %s between the colon and //', (_label, css) => {
        expect(normalize(css)).toBe(css);
      });

      // A `//` on a later line than the colon is far likelier a comment inside a
      // multi-line value than a value that starts on its own line.
      it('strips a comment on the line after a trailing colon', () => {
        expect(normalize('background:\n  // stops\n  red;')).toBe('background:\n  \n  red;');
      });

      it('compiles a protocol-relative custom property value', () => {
        expect(runCssCompile('--cdn: //cdn.example.com/x.png;\ncolor: red;')).toEqual([
          '.a{--cdn://cdn.example.com/x.png;color:red;}',
        ]);
      });

      it('still strips a comment that follows a declaration terminator', () => {
        expect(normalize('color: blue; // note\ncolor: red;')).toBe('color: blue; \ncolor: red;');
      });

      it('scans a long whitespace run before // in linear time', () => {
        const css = 'a: b;' + ' '.repeat(200_000) + '// c\ncolor: red;';
        const start = performance.now();

        expect(normalize(css)).toBe('a: b;' + ' '.repeat(200_000) + '\ncolor: red;');
        expect(performance.now() - start).toBeLessThan(500);
      });
    });
  });

  describe('url() function handling', () => {
    it('preserves unquoted https:// URL in url()', () => {
      expect(
        runCssCompile(`
        background-image: url(https://example.com/image.png);
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url(https://example.com/image.png);background-color:green;}",
        ]
      `);
    });

    it('preserves unquoted http:// URL in url()', () => {
      expect(
        runCssCompile(`
        background-image: url(http://example.com/image.png);
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url(http://example.com/image.png);background-color:green;}",
        ]
      `);
    });

    it('preserves double-quoted URL in url()', () => {
      expect(
        runCssCompile(`
        background-image: url("https://example.com/image.png");
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url("https://example.com/image.png");background-color:green;}",
        ]
      `);
    });

    it('preserves single-quoted URL in url()', () => {
      expect(
        runCssCompile(`
        background-image: url('https://example.com/image.png');
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url('https://example.com/image.png');background-color:green;}",
        ]
      `);
    });

    it('preserves data URL in url()', () => {
      expect(
        runCssCompile(`
        background-image: url(data:image/png;base64,iVBORw0KGgo=);
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url(data:image/png;base64,iVBORw0KGgo=);background-color:green;}",
        ]
      `);
    });

    it('preserves URL with path and query params', () => {
      expect(
        runCssCompile(`
        background-image: url(https://example.com/path/to/image.png?v=1&size=large);
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url(https://example.com/path/to/image.png?v=1&size=large);background-color:green;}",
        ]
      `);
    });

    it('preserves multiple url() declarations', () => {
      expect(
        runCssCompile(`
        background-image: url(https://example.com/bg.png);
        cursor: url(https://example.com/cursor.png), auto;
        list-style-image: url(https://example.com/bullet.png);
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url(https://example.com/bg.png);cursor:url(https://example.com/cursor.png),auto;list-style-image:url(https://example.com/bullet.png);}",
        ]
      `);
    });

    it('preserves @font-face with unquoted URL', () => {
      expect(
        runCssCompile(`
        @font-face {
          font-family: 'MyFont';
          src: url(https://example.com/fonts/myfont.woff2) format('woff2');
        }
      `)
      ).toMatchInlineSnapshot(`
        [
          "@font-face{font-family:'MyFont';src:url(https://example.com/fonts/myfont.woff2) format('woff2');}",
        ]
      `);
    });

    it('preserves @font-face with multiple src URLs', () => {
      expect(
        runCssCompile(`
        @font-face {
          font-family: 'MyFont';
          src: url(https://example.com/fonts/myfont.woff2) format('woff2'),
               url(https://example.com/fonts/myfont.woff) format('woff');
        }
      `)
      ).toMatchInlineSnapshot(`
        [
          "@font-face{font-family:'MyFont';src:url(https://example.com/fonts/myfont.woff2) format('woff2'),url(https://example.com/fonts/myfont.woff) format('woff');}",
        ]
      `);
    });

    it('preserves @import with URL', () => {
      expect(
        runCssCompile(`
        @import url(https://example.com/styles.css);
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-color:green;}",
          "@import url(https://example.com/styles.css);",
        ]
      `);
    });

    it('preserves url() with file:// protocol', () => {
      expect(
        runCssCompile(`
        background-image: url(file:///path/to/image.png);
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url(file:///path/to/image.png);background-color:green;}",
        ]
      `);
    });

    it('preserves url() with protocol-relative URL', () => {
      expect(
        runCssCompile(`
        background-image: url(//example.com/image.png);
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url(//example.com/image.png);background-color:green;}",
        ]
      `);
    });

    it('handles mix of url() and line comments', () => {
      expect(
        runCssCompile(`
        background-image: url(https://example.com/image.png); // this is a comment
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url(https://example.com/image.png);background-color:green;}",
        ]
      `);
    });

    it('preserves srcset URLs in image-set()', () => {
      expect(
        runCssCompile(`
        background-image: image-set(url(https://example.com/image.png) 1x, url(https://example.com/image@2x.png) 2x);
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:image-set(url(https://example.com/image.png) 1x, url(https://example.com/image@2x.png) 2x);background-color:green;}",
        ]
      `);
    });

    it('preserves foourl() inside string (string tracking)', () => {
      expect(
        runCssCompile(`
        width: 100px; // comment
        content: "foourl(https://example.com)";
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;content:"foourl(https://example.com)";background-color:green;}",
        ]
      `);
    });

    it('preserves // inside any function call via paren-depth tracking', () => {
      // Paren-depth tracking protects // inside ALL function calls,
      // not just url();no function name list needed
      expect(
        runCssCompile(`
        background: foourl(https://example.com/image.png); // comment
        color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background:foourl(https://example.com/image.png);color:green;}",
        ]
      `);
    });

    it('preserves url() at the start of CSS', () => {
      expect(
        runCssCompile(`background-image: url(https://example.com/image.png);`)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:url(https://example.com/image.png);}",
        ]
      `);
    });
  });

  describe('empty custom property values (#4374)', () => {
    // CSS Custom Properties L1;`--name: ` (empty) is a valid declaration.
    // Stylis dropped these; our in-house parser preserves them.

    it('preserves an empty custom property value at the top level', () => {
      expect(runCssCompile(`--my-prop: ;`)).toMatchInlineSnapshot(`
        [
          ".a{--my-prop:;}",
        ]
      `);
    });

    it('preserves an empty custom property value inside @keyframes', () => {
      expect(
        runCssCompile(`
        @keyframes spin {
          from, to {
            --my-prop: ;
          }
        }
      `)
      ).toMatchInlineSnapshot(`
        [
          "@keyframes spin{from,to{--my-prop:;}}",
        ]
      `);
    });

    it('still drops empty values for regular properties', () => {
      expect(
        runCssCompile(`
        color: ;
        font-size: 12px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{font-size:12px;}",
        ]
      `);
    });

    it('preserves empty custom property alongside dropped regular property', () => {
      expect(
        runCssCompile(`
        color: ;
        --kept: ;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{--kept:;}",
        ]
      `);
    });
  });

  describe('adversarial edge cases', () => {
    // --- Block comment boundary conditions ---

    it('handles empty block comment followed by //', () => {
      expect(
        runCssCompile(`
        /**/ // this is a line comment
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles block comment with asterisks that mimic closing: /* a ** // b */', () => {
      expect(
        runCssCompile(`
        /* a ** // b */
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles adjacent block comments separated by //', () => {
      expect(
        runCssCompile(`
        /* first */ // line comment
        /* second */
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles block comment immediately followed by line comment (no space)', () => {
      expect(
        runCssCompile(`
        /* block */// line
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles unclosed block comment with // (eats remaining CSS)', () => {
      expect(
        runCssCompile(`
        color: blue;
        /* unclosed http://example.com
        font-size: 40px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:blue;}",
        ]
      `);
    });

    it('handles block comment where */ is at the very end of input', () => {
      expect(runCssCompile(`color: red; /* http://example.com */`)).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles multiple // inside a single block comment', () => {
      expect(
        runCssCompile(`
        /* http://a.com and http://b.com and ftp://c.com */
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles block comment containing only //', () => {
      expect(
        runCssCompile(`
        /* // */
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles block comment with */ lookalike: /* a * / b */', () => {
      expect(
        runCssCompile(`
        /* a * / b // c */
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    // --- String + comment interactions ---

    it('handles string containing /* followed by // outside string', () => {
      expect(
        runCssCompile(`
        content: "/*"; // this should be stripped
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:"/*";color:red;}",
        ]
      `);
    });

    it('handles string containing */ followed by // outside string', () => {
      expect(
        runCssCompile(`
        content: "*/"; // this should be stripped
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:"*/";color:red;}",
        ]
      `);
    });

    it('handles single-quoted string with //', () => {
      expect(
        runCssCompile(`
        content: 'http://example.com';
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:'http://example.com';color:red;}",
        ]
      `);
    });

    it('handles alternating quote types with //', () => {
      expect(
        runCssCompile(`
        content: "it's a // test";
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:"it's a // test";color:red;}",
        ]
      `);
    });

    it('handles single-quoted string containing double quote and //', () => {
      expect(
        runCssCompile(`
        content: 'say "http://hello"';
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:'say "http://hello"';color:red;}",
        ]
      `);
    });

    // --- Line comment boundary conditions ---

    it('handles // at the very end of input (no trailing newline)', () => {
      expect(runCssCompile(`color: red; //`)).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles // with nothing after it on line', () => {
      expect(
        runCssCompile(`color: red; //
        font-size: 20px;`)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;font-size:20px;}",
        ]
      `);
    });

    it('handles multiple // on the same line', () => {
      expect(
        runCssCompile(`
        color: red; // first // second // third
        font-size: 20px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;font-size:20px;}",
        ]
      `);
    });

    it('handles consecutive lines of only comments', () => {
      expect(
        runCssCompile(`
        // comment 1
        // comment 2
        // comment 3
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles input that is entirely a line comment', () => {
      expect(runCssCompile(`// nothing here`)).toMatchInlineSnapshot(`[]`);
    });

    it('strips line comment between two declarations on same line (semicolon before //)', () => {
      expect(
        runCssCompile(`color: red; // middle comment
        font-size: 20px; // end comment
        background: blue;`)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;font-size:20px;background:blue;}",
        ]
      `);
    });

    // --- url() edge cases ---

    it('handles url() containing block comment syntax', () => {
      expect(
        runCssCompile(`
        background: url(http://example.com/*.png);
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background:url(http://example.com/*.png);color:red;}",
        ]
      `);
    });

    it('handles url() immediately followed by // comment', () => {
      expect(
        runCssCompile(`
        background: url(http://example.com/img.png);// comment
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background:url(http://example.com/img.png);color:red;}",
        ]
      `);
    });

    it('handles uppercased URL() with //', () => {
      expect(
        runCssCompile(`
        background: URL(http://example.com/img.png);
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background:URL(http://example.com/img.png);color:red;}",
        ]
      `);
    });

    it('handles mixed-case Url() with //', () => {
      expect(
        runCssCompile(`
        background: Url(http://example.com/img.png);
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background:Url(http://example.com/img.png);color:red;}",
        ]
      `);
    });

    // --- Combined stress tests ---

    it('handles block comment with //, then url with //, then line comment', () => {
      expect(
        runCssCompile(`
        /* see http://spec.example.com */
        background: url(https://cdn.example.com/bg.png);
        color: red; // TODO: change later
        font-size: 16px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background:url(https://cdn.example.com/bg.png);color:red;font-size:16px;}",
        ]
      `);
    });

    it('handles string, block comment, url, and line comment all with //', () => {
      expect(
        runCssCompile(`
        content: "http://example.com";
        /* http://spec.example.com */
        background: url(https://cdn.example.com/bg.png);
        // line comment
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:"http://example.com";background:url(https://cdn.example.com/bg.png);color:red;}",
        ]
      `);
    });

    it('handles // in every possible context in one CSS block', () => {
      expect(
        runCssCompile(`
        content: "//not-a-comment";
        /* //also-not-a-comment */
        background: url(//protocol-relative.example.com/img.png);
        width: 100px; // real comment
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:"//not-a-comment";background:url(//protocol-relative.example.com/img.png);width:100px;color:red;}",
        ]
      `);
    });

    // --- Malformed / tricky combinations ---

    it('strips orphaned */ without opening /* followed by //', () => {
      expect(
        runCssCompile(`
        color: red;
        */ // whatever
        font-size: 20px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;font-size:20px;}",
        ]
      `);
    });

    it('handles block comment with // immediately before closing */', () => {
      expect(
        runCssCompile(`
        /* http://example.com// */
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles line comment containing */ (should not close a nonexistent block comment)', () => {
      expect(
        runCssCompile(`
        color: blue;
        // this comment has */ in it
        font-size: 20px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:blue;font-size:20px;}",
        ]
      `);
    });

    it('handles block comment with // on multiple lines', () => {
      expect(
        runCssCompile(`
        /*
          http://line1.com
          http://line2.com
          // not a line comment
        */
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    it('handles line comment followed by block comment on next line', () => {
      expect(
        runCssCompile(`
        color: blue; // line comment
        /* block comment http://example.com */
        font-size: 20px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:blue;font-size:20px;}",
        ]
      `);
    });

    // --- Malformed CSS + comment interactions ---

    it('handles unbalanced brace inside block comment with //', () => {
      expect(
        runCssCompile(`
        width: 100px;
        /* } http://example.com */
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;color:red;}",
        ]
      `);
    });

    it('handles unbalanced brace after line comment stripping', () => {
      expect(
        runCssCompile(`
        width: 100px;
        height: 50px}// malformed
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;color:red;}",
        ]
      `);
    });

    it('handles // inside @media block with url()', () => {
      expect(
        runCssCompile(`
        @media (min-width: 500px) {
          background: url(https://example.com/img.png);
          color: red; // comment inside media
        }
        font-size: 16px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{font-size:16px;}",
          "@media (min-width: 500px){.a{background:url(https://example.com/img.png);color:red;}}",
        ]
      `);
    });

    it('handles // inside nested selectors', () => {
      expect(
        runCssCompile(`
        &:hover {
          color: red; // hover color
          /* http://design-system-spec */
          background: url(https://example.com/hover.png);
        }
        font-size: 16px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{font-size:16px;}",
          ".a:hover{color:red;background:url(https://example.com/hover.png);}",
        ]
      `);
    });

    it('handles rapid alternation of // and /* */ on same line', () => {
      expect(
        runCssCompile(`
        /* a */ color: red; /* http://b */ font-size: 20px; // end
        background: blue;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;font-size:20px;background:blue;}",
        ]
      `);
    });

    // --- Escaped characters in strings ---

    it('handles escaped single quote inside single-quoted string with // after', () => {
      expect(
        runCssCompile(`
        content: 'it\\'s';
        color: red; // comment
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:'it\\'s';color:red;}",
        ]
      `);
    });

    it('handles empty string values with // after', () => {
      expect(
        runCssCompile(`
        content: "";
        color: red; // comment
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:"";color:red;}",
        ]
      `);
    });

    it('handles string at very start of CSS with //', () => {
      expect(runCssCompile(`content: "//test"; color: red;`)).toMatchInlineSnapshot(`
        [
          ".a{content:"//test";color:red;}",
        ]
      `);
    });

    // --- Protocol-like patterns outside url() ---

    it('handles // in a custom property value', () => {
      expect(
        runCssCompile(`
        --my-url: "https://example.com"; // comment
        color: var(--my-url);
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{--my-url:"https://example.com";color:var(--my-url);}",
        ]
      `);
    });

    it('handles multiple block comments with // on one line', () => {
      expect(
        runCssCompile(`/* http://a */ color: red; /* http://b */ font-size: 20px; /* http://c */`)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;font-size:20px;}",
        ]
      `);
    });
  });

  describe('normalize block-comment whitespace', () => {
    it('a /* foo */ b collapses surrounding whitespace to a single space', () => {
      expect(normalize('a /* foo */ b { color: red; }')).toEqual('a b { color: red; }');
    });

    it('a/* foo */b strips just the comment when no surrounding whitespace', () => {
      expect(normalize('a/* foo */b { color: red; }')).toEqual('ab { color: red; }');
    });

    it('comment between two declarations leaves only a single space', () => {
      expect(normalize('color: red; /* note */ background: blue;')).toEqual(
        'color: red; background: blue;'
      );
    });

    it('comment at start of value strips without leaving double space', () => {
      expect(normalize('color: /* note */ red;')).toEqual('color: red;');
    });
  });

  describe('normalize keeps a stray `}` from closing the component scope', () => {
    test.each([
      ['a block comment', 'color: red; } body { background: red } /* note */ x {;'],
      ['a line comment', 'color: red; } body { background: red } // note\nx {;'],
    ])('drops the escaping statement when the template also has %s', (_label, css) => {
      expect(runCssCompile(css)).toEqual(['.a{color:red;}']);
    });
  });

  it('strips many block comments in linear time', () => {
    const start = performance.now();

    expect(normalize('a/**/b;'.repeat(80_000))).toBe('ab;'.repeat(80_000));
    expect(performance.now() - start).toBeLessThan(200);
  });

  it.each([
    ['comments inside a function call', 'f(1/**/);'.repeat(80_000), 'f(1 );'.repeat(80_000)],
    ['unquoted urls', 'url(x/*);'.repeat(80_000), 'url(x/*);'.repeat(80_000)],
    ['urls left open', 'url(a '.repeat(80_000) + '/**/', 'url(a '.repeat(80_000) + '/**/'],
  ])('scans many %s in linear time', (_label, css, expected) => {
    const start = performance.now();

    expect(normalize(css)).toBe(expected);
    expect(performance.now() - start).toBeLessThan(200);
  });

  describe('normalize unified-path edge cases', () => {
    // Path 3j: comment stripping + brace imbalance fire together
    it('handles comment stripping that reveals brace imbalance', () => {
      expect(
        runCssCompile(`
        width: 100px;
        height: 50px}// malformed brace before comment
        color: red;
        font-size: 16px}// second malformed
        background: blue;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;color:red;background:blue;}",
        ]
      `);
    });

    it('handles nested rule with comment after opening brace', () => {
      expect(
        runCssCompile(`
        width: 100px;
        .nested {// comment inside rule
          color: red;
        }
        background: blue;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;background:blue;}",
          ".a .nested{color:red;}",
        ]
      `);
    });

    it('handles brace inside line comment (not counted)', () => {
      expect(
        runCssCompile(`
        width: 100px;
        // this } should not affect brace counting
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;color:red;}",
        ]
      `);
    });

    it('handles opening brace inside line comment (not counted)', () => {
      expect(
        runCssCompile(`
        width: 100px;
        // this { should not affect brace counting
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;color:red;}",
        ]
      `);
    });

    // Orphaned */;only stripped when the full tokenizer runs (// present)
    it('passes orphaned */ through when no // present (fast path)', () => {
      // Orphan `*/` (without matching `/*`) is a pathological input. The v7
      // parser preserves whitespace as-is (`*/ background`). This test locks v7
      // behavior for the fast path when no `//` comment triggers the full tokenizer.
      expect(
        runCssCompile(`
        color: red;
        */ background: blue;
        font-size: 16px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;*/ background:blue;font-size:16px;}",
        ]
      `);
    });

    it('strips orphaned */ when // is also present (full tokenizer)', () => {
      expect(
        runCssCompile(`
        color: red;
        */ background: blue; // comment
        font-size: 16px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;background:blue;font-size:16px;}",
        ]
      `);
    });

    it('strips multiple orphaned */ tokens when // triggers full tokenizer', () => {
      expect(
        runCssCompile(`
        color: red; // start
        */ font-size: 20px;
        */ background: blue;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;font-size:20px;background:blue;}",
        ]
      `);
    });

    // Empty / whitespace inputs
    it('handles empty string', () => {
      expect(runCssCompile('')).toMatchInlineSnapshot(`[]`);
    });

    it('handles whitespace-only input', () => {
      expect(runCssCompile('   \n\t  ')).toMatchInlineSnapshot(`[]`);
    });

    // Block comments only (no //)
    it('handles input that is only a block comment', () => {
      expect(runCssCompile('/* nothing here */')).toMatchInlineSnapshot(`[]`);
    });

    it('handles mix of only block and line comments', () => {
      expect(runCssCompile('/* first */ // second')).toMatchInlineSnapshot(`[]`);
    });

    // Nested block comments (CSS doesn't support them)
    it('handles nested block comments (closes at first */)', () => {
      expect(
        runCssCompile(`
        /* outer /* inner */ color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
        ]
      `);
    });

    // url() with bare paths (no protocol)
    it('preserves url() with bare absolute path', () => {
      expect(
        runCssCompile(`
        background: url(/images/logo.png); // comment
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background:url(/images/logo.png);color:red;}",
        ]
      `);
    });

    it('preserves url() with relative path', () => {
      expect(
        runCssCompile(`
        background: url(../assets/bg.png); // comment
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background:url(../assets/bg.png);color:red;}",
        ]
      `);
    });

    // url() with encoded braces
    it('preserves url() with encoded braces in data URI', () => {
      expect(
        runCssCompile(`
        background: url(data:image/svg+xml,%3Csvg%7B%7D%3C/svg%3E); // svg
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background:url(data:image/svg+xml,%3Csvg%7B%7D%3C/svg%3E);color:red;}",
        ]
      `);
    });

    // @supports and @layer with //
    it('handles // inside @supports block', () => {
      expect(
        runCssCompile(`
        @supports (display: grid) {
          display: grid; // use grid
          gap: 16px;
        }
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;}",
          "@supports (display: grid){.a{display:grid;gap:16px;}}",
        ]
      `);
    });

    it('handles // inside @layer block', () => {
      expect(
        runCssCompile(`
        @layer utilities {
          color: red; // utility color
        }
        font-size: 16px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{font-size:16px;}",
          "@layer utilities{.a{color:red;}}",
        ]
      `);
    });

    // Fast path: no // and no } (path 1)
    it('returns unchanged when no // and no } (fast path)', () => {
      expect(
        runCssCompile(`
        color: red;
        font-size: 16px;
        background: blue;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{color:red;font-size:16px;background:blue;}",
        ]
      `);
    });

    // CSS Syntax, "Consume comments": "consume them and all following code points
    // up to and including the first U+002A ASTERISK (*) followed by a U+002F
    // SOLIDUS (/), or up to an EOF code point."
    it.each([
      ['a quote', `don't`],
      ['a balanced paren pair', `(a) don't`],
      ['an unmatched `)`', `)`],
      ['an unmatched `(`', `(`],
      ['a `;`', `a; b`],
      ['a `}`', `}`],
    ])('strips a comment holding %s inside a function call', (_label, comment) => {
      expect(runCssCompile(`width: calc(100% /* ${comment} */ - 10px); color: red;`)).toEqual([
        '.a{width:calc(100% - 10px);color:red;}',
      ]);
    });

    it('treats a function whose name only ends in url as a function', () => {
      expect(runCssCompile(`width: myurl(1px /* ) */ + 2px); color: red;`)).toEqual([
        '.a{width:myurl(1px + 2px);color:red;}',
      ]);
    });

    // CSS Syntax, "Consume a token": "Consume comments." runs before every token, so
    // a comment ends the token before it. Serialization: "the pair of tokens must be
    // serialized with a comment between them." Whitespace keeps them apart the same way.
    it.each([
      ['two numbers', 'rgb(0/**/51/**/255)', 'rgb(0 51 255)'],
      ['a number and a dot number', 'rgb(0/**/.5/**/1)', 'rgb(0 .5 1)'],
      ['a number and a percent sign', 'calc(1/**/%)', 'calc(1 %)'],
      ['an ident and a paren', 'f(a/* c */(b))', 'f(a (b))'],
      ['a value and an operator', 'calc(1px/* c */+ 2px)', 'calc(1px + 2px)'],
      ['two adjacent comments', 'f(a/**//**/b)', 'f(a b)'],
      ['a comment with space around it', 'f(a /* c */ b)', 'f(a b)'],
      ['a comment with space before it', 'f(a /* c */b)', 'f(a b)'],
      ['a comment with space after it', 'f(a/* c */ b)', 'f(a b)'],
    ])('keeps %s apart around a comment inside a function call', (_label, value, expected) => {
      expect(runCssCompile(`color: ${value}; top: 0;`)).toEqual([`.a{color:${expected};top:0;}`]);
    });

    it('drops a declaration whose function call holds a comment left open', () => {
      expect(runCssCompile(`color: red; width: calc(1px /* oops; top: 0;`)).toEqual([
        '.a{color:red;}',
      ]);
    });

    // CSS Syntax, "Consume an ident-like token": "If string’s value is an ASCII
    // case-insensitive match for "url", and the next input code point is U+0028
    // LEFT PARENTHESIS ((), consume it. [...] If the next one or two input code
    // points are U+0022 QUOTATION MARK ("), U+0027 APOSTROPHE ('), or whitespace
    // followed by U+0022 QUOTATION MARK (") or U+0027 APOSTROPHE ('), then create
    // a <function-token> [...] Otherwise, consume a url token, and return it."
    it.each([
      ['a path that looks like an unclosed comment', 'url(x/*.png)'],
      ['an uppercase name', 'URL(x/*.png)'],
      ['whitespace around the path', 'url(  x/*.png  )'],
      ['an escaped `)` in the path', 'url(x\\)/*.png)'],
      ['an escape after leading whitespace', 'url( \\41 )'],
    ])('keeps an unquoted url with %s', (_label, url) => {
      expect(runCssCompile(`background: ${url}; color: red;`)).toEqual([
        `.a{background:${url};color:red;}`,
      ]);
    });

    // CSS Syntax, "Consume a url token": a quote makes the token bad, and "Consume
    // the remnants of a bad url" returns at "U+0029 RIGHT PARENTHESIS ())", so the
    // quote opens no string and the text after that `)` is outside the token.
    it.each([
      ['a lowercase name', 'url'],
      ['an uppercase name', 'URL'],
    ])('keeps rules inside the scope past a bad url with %s', (_label, name) => {
      expect(runCssCompile(`width: ${name}(a'b);}x{color:red;}y{');\ntop: 0;`)).toEqual([
        `.a{width:${name}(a'b);top:0;}`,
      ]);
    });

    // A browser's cssRules hold `.x` for the first and nothing past `.a` for the
    // second: a newline ends the string, and an open `[` holds the rest.
    it.each([
      ['a string ended by a newline', `content: "b\nc;}x{color:red;}y{content:"d"e"; top: 0;`],
      ['an open bracket', 'grid-area: [b; top: 0; }x{color:red;}'],
      ['an open bracket in a selector', '&[b { top: 0; } x { color: red; }'],
      ['a brace in a function', 'width: f({); top: 0; }x{color:red;}'],
      ['a comment after a colon', 'top: //*; left: 0;'],
      ['a function holding a form feed', 'top: url(\f")""; left: 0;'],
      ['a function with a non-ASCII name', 'top: éurl(a")""; left: 0;'],
      ['a function after an escape', 'top: \\41 bar(a")""; left: 0;'],
      ['a url name extended by an escape', 'top: \\61url(a")""; left: 0;'],
      ['a url name after an escaped character', 'top: \\:url(a")""; left: 0;'],
      ['a url name after a hex escape', 'top: \\41 url(a")""; left: 0;'],
      ['a url name a hash extends', 'top: #url(a")""; left: 0;'],
      ['a url name the scope extends', '&url(a") { top: 0; } y { color: red; }'],
      ['a paren after an at-rule name', '@media(min-width: 1px { top: 0; } y { color: red; }'],
      ['a url after `&` in a value', 'top: &url(a"b)c}x{color:red;}d"e); left: 0;'],
      ['a url after `&` in an at-rule prelude', '@media &url(a"b)c}x{color:red;}d"e) { top: 0; }'],
      ['a function name after an escape ended by a form feed', 'top: \\41\furl(a")""; left: 0;'],
      ['a function name after an escape ended by CR LF', 'top: \\41\r\nurl(a")""; left: 0;'],
      // https://drafts.csswg.org/css-syntax/#input-preprocessing: NUL becomes U+FFFD, a name character.
      ['a function name after a NUL', 'top: \0url(a")""; left: 0;'],
    ])('emits nothing for %s, which a browser reads past its statement', (_label, css) => {
      expect(runCssCompile(css)).toEqual([]);
    });

    it('drops a keyframe stop holding a url after `&` and keeps nothing from inside it', () => {
      expect(runCssCompile('@keyframes k { &url(a"b)c}x{color:red;}d"e) { top: 0; } }')).toEqual([
        '@keyframes k{}',
      ]);
    });

    it('keeps a plain url after `&` in a value, which both readings end at the same paren', () => {
      expect(runCssCompile('top: &url(a); left: 0;')).toEqual(['.a{top:&url(a);left:0;}']);
    });

    it.each([
      [
        'an escaped space in the token before it',
        'font-family: Font\\ Awesome var(--x, "a"); color: red;',
        '.a{font-family:Font\\ Awesome var(--x, "a");color:red;}',
      ],
      [
        'an escaped colon in the token before it',
        '--x: a\\: b var(--y, "f"); color: red;',
        '.a{--x:a\\: b var(--y, "f");color:red;}',
      ],
      [
        'a hex escape two tokens before it',
        '--x: \\41 px solid red(a"b"); color: red;',
        '.a{--x:\\41 px solid red(a"b");color:red;}',
      ],
    ])('keeps a function with a quote and %s', (_label, css, expected) => {
      expect(runCssCompile(css)).toEqual([expected]);
    });

    // CSS Syntax, "Consume a url token", whitespace: "If the next input code point is
    // U+0029 RIGHT PARENTHESIS ()) or EOF, consume it and return the <url-token> [...];
    // otherwise, consume the remnants of a bad url, create a <bad-url-token>, and return
    // it." So these are invalid, and the remnants read `\)` as an escape.
    it.each([
      ['an escaped `)`', 'top: url(a \\)}x{color:red;}); left: 0;'],
      ['an escaped backslash', 'top: url(a \\\\); left: 0;'],
      ['a form feed before it', 'top: url(a\f\\)}x{color:red;}); left: 0;'],
    ])('emits nothing for whitespace and a backslash in a url, with %s', (_label, css) => {
      expect(runCssCompile(css)).toEqual([]);
    });

    it('keeps a url whose escaped space comes before a backslash, which is no whitespace', () => {
      expect(runCssCompile('top: url(a\\ \\)b); left: 0;')).toEqual([
        '.a{top:url(a\\ \\)b);left:0;}',
      ]);
    });

    it('keeps the rules after a url with a space in its path, which only that url loses', () => {
      expect(runCssCompile('top: url(a b.png); left: 0;')).toEqual([
        '.a{top:url(a b.png);left:0;}',
      ]);
    });

    it.each([
      ['a closed bracket', 'grid-area: [b;c]; top: 0;', '.a{grid-area:[b;c];top:0;}'],
      ['an attribute selector', '&[b="]"] { top: 0; }', '.a[b="]"]{top:0;}'],
      [
        'selectors split around a bracket',
        '&[b="c,d"], &[e] { top: 0; }',
        '.a[b="c,d"],.a[e]{top:0;}',
      ],
      [
        'a url holding a bracket',
        'background: url(b[1.png), c; top: 0;',
        '.a{background:url(b[1.png),c;top:0;}',
      ],
      ['an escaped space ending a value', 'color: red\\ ; top: 0;', '.a{color:red\\ ;top:0;}'],
      [
        'a keyframe stop ending in an escaped space',
        '@keyframes k { from\\ { top: 0; } to { top: 1px; } }',
        '@keyframes k{from\\ {top:0;}to{top:1px;}}',
      ],
      [
        'text a closed bracket leaves outside it',
        'top: [b c]; } x { color: red; } d: e]; left: 0;',
        '.a{top:[b c];left:0;}',
      ],
    ])('emits %s whole', (_label, css, rule) => {
      expect(runCssCompile(css)).toEqual([rule]);
    });

    it('keeps the rule after a selector ending in an escaped space', () => {
      expect(runCssCompile('a\\ { top: 0; } y { color: red; }')).toEqual([
        '.a a\\ {top:0;}',
        '.a y{color:red;}',
      ]);
    });

    // CSS Syntax, "Consume an ident-like token": "If string’s value is an ASCII
    // case-insensitive match for "url", and the next input code point is U+0028 LEFT
    // PARENTHESIS ((), consume it." Decoding an escaped name is not worth its bytes, so
    // such a name counts as a url only while reading it as a function would agree.
    it.each([
      ['a letter', 'u\\72l'],
      ['a last letter', 'ur\\6c'],
      ['a letter ended by a space', '\\75 rl'],
    ])(
      'drops a url spelled with an escaped %s when a quote makes its reading unclear',
      (_label, name) => {
        expect(runCssCompile(`width: ${name}(a'b);}x{color:red;}y{'); top: 0;`)).toEqual([]);
      }
    );

    // Deviation: a browser keeps these, reading a function with a comment in it. The
    // same bytes under an escaped `url` name reach past the statement, so both drop.
    it.each([
      ['a hex escape', 'top: \\41 b(a/*);}x{color:red;}*/); left: 0;'],
      ['an escaped backslash', 'width: \\\\(1 /* ) */ + 2); top: 0;'],
    ])('drops a function named with %s when a comment sits inside it', (_label, css) => {
      expect(runCssCompile(css)).toEqual([]);
    });

    it.each([
      ['a letter', 'u\\72l'],
      ['a last letter', 'ur\\6c'],
      ['a letter ended by a space', '\\75 rl'],
    ])('keeps a url spelled with an escaped %s when both readings agree', (_label, name) => {
      expect(runCssCompile(`background: ${name}(a/b.png); top: 0;`)).toEqual([
        `.a{background:${name}(a/b.png);top:0;}`,
      ]);
    });

    it.each([
      ['a quoted url', `background: url( "a)b" ); top: 0;`, '.a{background:url( "a)b" );top:0;}'],
      [
        'a function after an escaped selector',
        '.md\\:x:not([a=")"]) { top: 0; }',
        '.a .md\\:x:not([a=")"]){top:0;}',
      ],
      [
        'a quoted url with an escaped name',
        `background: ur\\6c("a)b"); top: 0;`,
        '.a{background:ur\\6c("a)b");top:0;}',
      ],
    ])('reads the string in %s', (_label, css, rule) => {
      expect(runCssCompile(css)).toEqual([rule]);
    });

    it('strips a comment that follows the string in a quoted url', () => {
      expect(runCssCompile(`background: url("x/*.png" /* ) */); color: red;`)).toEqual([
        '.a{background:url("x/*.png" );color:red;}',
      ]);
    });

    // CSS Syntax, "Consume a token", U+005C REVERSE SOLIDUS (\): "If the input
    // stream starts with a valid escape, reconsume the current input code point,
    // consume an ident-like token, and return it."
    it.each([
      [
        'an escaped `(`',
        "&.a\\(b { color: red; /* don't */ top: 0; }",
        '.a.a\\(b{color:red;top:0;}',
      ],
      ['an escaped `(` in a value', 'left: \\(; /* note */ top: 0;', '.a{left:\\(;top:0;}'],
      [
        'an escaped `)` in a function call',
        'width: calc(1px \\) /* c */ + 2px); top: 0;',
        '.a{width:calc(1px \\) + 2px);top:0;}',
      ],
      ['an escaped quote', 'left: \\"; /* note */ top: 0;', '.a{left:\\";top:0;}'],
      [
        'an escaped backslash before a `(`',
        'width: \\\\(1 + 2); /* ) */ top: 0;',
        '.a{width:\\\\(1 + 2);top:0;}',
      ],
    ])('strips a comment after %s', (_label, css, rule) => {
      expect(runCssCompile(css)).toEqual([rule]);
    });

    it('reads an escaped `/` before a `*` as text and not as the start of a comment', () => {
      expect(normalize('left: \\/* top: 0; // x')).toBe('left: \\/* top: 0; ');
    });

    // Backtick in CSS content (not a CSS string delimiter)
    it('handles backtick in content value', () => {
      expect(
        runCssCompile(`
        content: "\`"; // backtick
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:"\`";color:red;}",
        ]
      `);
    });

    // \\\\ in template literal = \\ in CSS = escaped backslash, so " closes the string
    it('handles escaped backslash before closing quote', () => {
      expect(
        runCssCompile(`
        content: "test\\\\";
        color: red; // comment
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{content:"test\\\\";color:red;}",
        ]
      `);
    });

    // Complex path 3j: comment removal changes what the parser's root-block brace repair sees
    it('handles line comment hiding a closing brace from the root-block brace repair', () => {
      expect(
        runCssCompile(`
        width: 100px;
        }// this brace is NOT in the comment, it's before it
        color: red;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{width:100px;color:red;}",
        ]
      `);
    });

    it('handles line comment between balanced braces', () => {
      expect(
        runCssCompile(`
        &:hover {
          // hover styles
          color: red;
          background: blue; // bg
        }
        font-size: 16px;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{font-size:16px;}",
          ".a:hover{color:red;background:blue;}",
        ]
      `);
    });
  });

  describe('flat decl-only inputs', () => {
    it('compiles flat declarations against the AST emitter', () => {
      const css = `color: red;\nbackground: blue;`;
      const fromInstance = runCssCompile(css);
      const flatCSS = normalize(css);
      const viaFull = emitWeb(parse('.a{' + flatCSS + '}'), '', {
        selfRefSelector: '.a',
        componentId: 'a',
      });
      expect(fromInstance).toEqual(viaFull);
    });

    it('honors namespace option', () => {
      const compiler = createCompiler({ options: { namespace: '.ns' } });
      expect(compiler.compile(`color: red;`, '.a', undefined, 'a')).toMatchInlineSnapshot(`
        [
          ".ns .a{color:red;}",
        ]
      `);
    });

    it('runs decl transform from rtl plugin', () => {
      const compiler = createCompiler({ plugins: [rtl] });
      expect(
        compiler.compile(`margin-left: 8px; padding-left: 4px;`, '.a', undefined, 'a')
      ).toMatchInlineSnapshot(`
        [
          ".a{margin-right:8px;padding-right:4px;}",
        ]
      `);
    });

    it('expands a multi-result decl transform into several declarations', () => {
      const dual = {
        name: 'dual',
        decl: (prop: string, value: string) =>
          prop === 'appearance'
            ? [
                { prop: '-webkit-appearance', value },
                { prop: 'appearance', value },
              ]
            : undefined,
      };
      const compiler = createCompiler({ plugins: [dual] });
      expect(compiler.compile(`appearance: none; color: red;`, '.a', undefined, 'a')).toEqual([
        '.a{-webkit-appearance:none;appearance:none;color:red;}',
      ]);
    });

    it('expands a multi-result rw transform into several rules', () => {
      const placeholders = {
        name: 'placeholders',
        rw: (selector: string) =>
          selector.includes('::placeholder')
            ? [
                selector.replace('::placeholder', '::-webkit-input-placeholder'),
                selector.replace('::placeholder', '::-moz-placeholder'),
                selector,
              ]
            : selector,
      };
      const compiler = createCompiler({ plugins: [placeholders] });
      expect(compiler.compile(`color: gray;`, '.a::placeholder', undefined, 'a')).toEqual([
        '.a::-webkit-input-placeholder{color:gray;}',
        '.a::-moz-placeholder{color:gray;}',
        '.a::placeholder{color:gray;}',
      ]);
    });

    it('maps a later decl plugin over each result of an earlier multi-emit', () => {
      const dual = {
        name: 'dual',
        decl: (prop: string, value: string) =>
          prop === 'appearance'
            ? [
                { prop: '-webkit-appearance', value },
                { prop: 'appearance', value },
              ]
            : undefined,
      };
      const upperValue = {
        name: 'upper-value',
        decl: (prop: string, value: string) =>
          prop.endsWith('appearance') ? { prop, value: value.toUpperCase() } : undefined,
      };
      const compiler = createCompiler({ plugins: [dual, upperValue] });
      expect(compiler.compile(`appearance: none;`, '.a', undefined, 'a')).toEqual([
        '.a{-webkit-appearance:NONE;appearance:NONE;}',
      ]);
    });

    const unnamedPluginError = new Error(
      "A plugin has been supplied that is not named. We need a name for each plugin to be able to prevent styling collisions between different plugin configurations within the same app. Before you pass your plugin to `<StyleSheetManager plugins={[]}>`, please make sure each plugin is uniquely-named, e.g.\n\n```js\nObject.defineProperty(importedPlugin, 'name', { value: 'some-unique-name' });\n```"
    );

    it('throws error 15 for a plugin object with no name', () => {
      expect(() => {
        // @ts-expect-error negative-behavior assertion: a plugin without `name` is a type error and a runtime error
        createCompiler({ plugins: [{ decl: () => undefined }] });
      }).toThrow(unnamedPluginError);
    });

    it('throws error 15 for an anonymous arrow-function plugin', () => {
      expect(() => {
        // @ts-expect-error negative-behavior assertion: a function is not a plugin object, and an inline arrow has no name
        createCompiler({ plugins: [() => undefined] });
      }).toThrow(unnamedPluginError);
    });

    it('leaves single-result plugins unchanged when neighbors return undefined', () => {
      const dual = {
        name: 'dual',
        decl: (prop: string, value: string) =>
          prop === 'appearance'
            ? [
                { prop: '-webkit-appearance', value },
                { prop: 'appearance', value },
              ]
            : undefined,
      };
      const compiler = createCompiler({ plugins: [rtl, dual] });
      expect(compiler.compile(`margin-left: 8px; appearance: none;`, '.a', undefined, 'a')).toEqual(
        ['.a{margin-right:8px;-webkit-appearance:none;appearance:none;}']
      );
    });
  });
});
