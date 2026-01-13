import createStylisInstance, { ICreateStylisInstance } from '../stylis';

function stylisTest(css: string, options: ICreateStylisInstance = {}): string[] {
  const stylis = createStylisInstance(options);
  const componentId = 'a';
  return stylis(css, `.${componentId}`, undefined, componentId);
}

describe('stylis', () => {
  it('handles simple rules', () => {
    expect(
      stylisTest(`
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
      stylisTest(`
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
      stylisTest(`
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

  it('splits vendor-prefixed rules', () => {
    expect(
      stylisTest(
        `
      &::placeholder {
        color: red;
      }

      // this currently does not split correctly
      @media (min-width: 500px) {
        &::placeholder {
          content: "}";
        }
      }
    `,
        { options: { prefix: true } }
      )
    ).toMatchInlineSnapshot(`
      [
        ".a::-webkit-input-placeholder{color:red;}",
        ".a::-moz-placeholder{color:red;}",
        ".a:-ms-input-placeholder{color:red;}",
        ".a::placeholder{color:red;}",
        "@media (min-width: 500px){.a::-webkit-input-placeholder{content:"}";}}",
        "@media (min-width: 500px){.a::-moz-placeholder{content:"}";}}",
        "@media (min-width: 500px){.a:-ms-input-placeholder{content:"}";}}",
        "@media (min-width: 500px){.a::placeholder{content:"}";}}",
      ]
    `);
  });

  describe('malformed CSS handling', () => {
    it('preserves styles after declaration with unbalanced closing brace', () => {
      // Simulates: line-height: ${() => "14px}"}
      expect(
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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

    it('handles valid CSS unchanged (fast path)', () => {
      expect(
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`max-height: calc(
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

    it('strips line comments within multiline declarations', () => {
      expect(
        stylisTest(`width: 100px;
height: calc(
  50vh // viewport height
  - 20px // header
);
background-color: green;`)
      ).toMatchInlineSnapshot(`
[
  ".a{width:100px;height:calc(
  50vh 
  - 20px 
);background-color:green;}",
]
`);
    });

    it('preserves // inside strings', () => {
      expect(
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
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
        stylisTest(`
        background-image: image-set(url(https://example.com/image.png) 1x, url(https://example.com/image@2x.png) 2x);
        background-color: green;
      `)
      ).toMatchInlineSnapshot(`
        [
          ".a{background-image:image-set(url(https://example.com/image.png) 1x, url(https://example.com/image@2x.png) 2x);background-color:green;}",
        ]
      `);
    });
  });
});
