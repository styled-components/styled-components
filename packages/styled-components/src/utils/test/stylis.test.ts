import createStylisInstance, { ICreateStylisInstance } from '../stylis';

function stylisTest(css: string, options: ICreateStylisInstance = {}): string[] {
  const stylis = createStylisInstance(options);
  const componentId = 'a';
  return stylis(css, `.${componentId}`, undefined, componentId);
}

describe('stylis', () => {
  it('handles simple rules', () => {
    const css = stylisTest(`
      background: yellow;
      color: red;
    `);

    expect(css).toMatchInlineSnapshot(`
      [
        ".a{background:yellow;color:red;}",
      ]
    `);
  });

  it('splits css with multiple rules', () => {
    const css = stylisTest(`
      background: yellow;
      color: red;
      @media (min-width: 500px) {
        color: blue;
      }
    `);

    expect(css).toMatchInlineSnapshot(`
      [
        ".a{background:yellow;color:red;}",
        "@media (min-width: 500px){.a{color:blue;}}",
      ]
    `);
  });

  it('splits css with encoded closing curly brace', () => {
    const css = stylisTest(`
      @media (min-width: 500px) {
        &::before {
          content: "}";
        }
      }
    `);

    expect(css).toMatchInlineSnapshot(`
      [
        "@media (min-width: 500px){.a::before{content:"}";}}",
      ]
    `);
  });

  it('splits vendor-prefixed rules', () => {
    const css = stylisTest(
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
    );

    expect(css).toMatchInlineSnapshot(`
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
    it('preserves styles after a declaration with unbalanced closing brace', () => {
      // This simulates the bug: line-height: ${() => "14px}"}
      const css = stylisTest(`
        width: 100px;
        height: 100px;
        line-height: 14px}";
        background-color: green;
      `);

      // The malformed line-height should be dropped, but background-color preserved
      expect(css).toMatchInlineSnapshot(`
        [
          ".a{width:100px;height:100px;background-color:green;}",
        ]
      `);
    });

    it('handles multiple malformed declarations', () => {
      const css = stylisTest(`
        width: 100px;
        foo: bar}";
        height: 50px;
        baz: qux}";
        background-color: green;
      `);

      expect(css).toMatchInlineSnapshot(`
        [
          ".a{width:100px;height:50px;background-color:green;}",
        ]
      `);
    });

    it('handles malformed declaration followed by @media query', () => {
      const css = stylisTest(`
        width: 100px;
        line-height: 14px}";
        @media (min-width: 500px) {
          color: blue;
        }
        background-color: green;
      `);

      expect(css).toMatchInlineSnapshot(`
        [
          ".a{width:100px;background-color:green;}",
          "@media (min-width: 500px){.a{color:blue;}}",
        ]
      `);
    });

    it('preserves properly quoted braces in content', () => {
      const css = stylisTest(`
        width: 100px;
        content: "}";
        background-color: green;
      `);

      expect(css).toMatchInlineSnapshot(`
        [
          ".a{width:100px;content:"}";background-color:green;}",
        ]
      `);
    });

    it('handles valid CSS unchanged (fast path)', () => {
      const css = stylisTest(`
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background-color: green;
      `);

      expect(css).toMatchInlineSnapshot(`
        [
          ".a{width:100px;height:100px;border-radius:50%;background-color:green;}",
        ]
      `);
    });
  });
});
