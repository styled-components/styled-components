import createStylisInstance from '../stylis';

function stylisTest(css: string): string[] {
  const stylis = createStylisInstance();
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
});
