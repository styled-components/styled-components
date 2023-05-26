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

  it('splits vendor-prefixed rules', () => {
    const css = stylisTest(
      `
      &::placeholder {
        color: red;
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
      ]
    `);
  });
});
