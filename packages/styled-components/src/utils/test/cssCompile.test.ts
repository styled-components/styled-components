import { emitWeb } from '../../parser/emit-web';
import { parse } from '../../parser/parser';
import createStylisInstance, { ICreateStylisInstance, preprocessCSS } from '../cssCompile';
import rtl from '../../plugins/rtl';
import rscPlugin from '../rsc';

function runCssCompile(css: string, options: ICreateStylisInstance = {}): string[] {
  const stringifier = createStylisInstance(options);
  const componentId = 'a';
  return stringifier(css, `.${componentId}`, undefined, componentId);
}

describe('cssCompile', () => {
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

  // Removed in v7: the runtime vendor-prefixer is gone. enableVendorPrefixes
  // is a no-op with a dev warning. See the v7.x auto-prefixer task for the
  // planned replacement driven by caniuse-lite data at build time.

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
      // // inside parens is preserved — paren-depth tracking protects
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
      // not just url() — no function name list needed
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
      expect(runCssCompile(`background-image: url(https://example.com/image.png);`))
        .toMatchInlineSnapshot(`
        [
          ".a{background-image:url(https://example.com/image.png);}",
        ]
      `);
    });
  });

  describe('empty custom property values (#4374)', () => {
    // CSS Custom Properties L1 — `--name: ` (empty) is a valid declaration.
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

  describe('preprocessCSS unified-path edge cases', () => {
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

    // Orphaned */ — only stripped when the full tokenizer runs (// present)
    it('passes orphaned */ through when no // present (fast path)', () => {
      // Orphan `*/` (without matching `/*`) is a pathological input. The v7
      // parser preserves whitespace as-is (`*/ background`), stylis collapsed
      // it (`*/background`). Either behavior is acceptable — the input is
      // malformed. This test locks v7 behavior.
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

    // Complex path 3j: comment removal changes what sanitizeBraces sees
    it('handles line comment hiding a closing brace from sanitizer', () => {
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

  describe('flat fast path (parseEmitFlat vs full parser)', () => {
    it('matches full parser for flat declarations (default stringifier)', () => {
      const css = `color: red;\nbackground: blue;`;
      const fromInstance = runCssCompile(css);
      const flatCSS = preprocessCSS(css);
      const viaFull = emitWeb(parse('.a{' + flatCSS + '}'), '', {
        selfRefSelector: '.a',
        componentId: 'a',
      });
      expect(fromInstance).toEqual(viaFull);
    });

    it('uses full parser when namespace is set (no fast path)', () => {
      const stringifier = createStylisInstance({ options: { namespace: '.ns' } });
      expect(stringifier(`color: red;`, '.a', undefined, 'a')).toMatchInlineSnapshot(`
        [
          ".ns .a{color:red;}",
        ]
      `);
    });

    it('uses full parser when rtl decl transform is active', () => {
      const stringifier = createStylisInstance({ plugins: [rtl] });
      expect(stringifier(`margin-left: 8px; padding-left: 4px;`, '.a', undefined, 'a'))
        .toMatchInlineSnapshot(`
        [
          ".a{margin-right:8px;padding-right:4px;}",
        ]
      `);
    });

    it('uses full parser when rscPlugin rw is active', () => {
      const stringifier = createStylisInstance({ plugins: [rscPlugin] });
      expect(stringifier(`color: red;`, '.a:hover:first-child', undefined, 'a'))
        .toMatchInlineSnapshot(`
        [
          ".a:hover:nth-child(1 of :not(style[data-styled])){color:red;}",
        ]
      `);
    });
  });
});
