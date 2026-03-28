import { parseCSSDeclarations } from '../InlineStyle';

describe('parseCSSDeclarations', () => {
  it('parses a single declaration', () => {
    expect(parseCSSDeclarations('color: red;')).toEqual([['color', 'red']]);
  });

  it('parses multiple declarations', () => {
    expect(parseCSSDeclarations('color: red; font-size: 12px; opacity: 0.5;')).toEqual([
      ['color', 'red'],
      ['font-size', '12px'],
      ['opacity', '0.5'],
    ]);
  });

  it('handles last declaration without trailing semicolon', () => {
    expect(parseCSSDeclarations('color: red; font-size: 12px')).toEqual([
      ['color', 'red'],
      ['font-size', '12px'],
    ]);
  });

  it('handles no space after colon', () => {
    expect(parseCSSDeclarations('color:red;font-size:12px;')).toEqual([
      ['color', 'red'],
      ['font-size', '12px'],
    ]);
  });

  it('handles extra whitespace around properties and values', () => {
    expect(parseCSSDeclarations('  color :  red  ;  font-size :  12px  ;  ')).toEqual([
      ['color', 'red'],
      ['font-size', '12px'],
    ]);
  });

  it('handles newlines and tabs', () => {
    expect(parseCSSDeclarations('\n\tcolor: red;\n\tfont-size: 12px;\n')).toEqual([
      ['color', 'red'],
      ['font-size', '12px'],
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(parseCSSDeclarations('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parseCSSDeclarations('   \n\t  ')).toEqual([]);
  });

  it('skips declarations with empty values', () => {
    expect(parseCSSDeclarations('color: ;')).toEqual([]);
  });

  it('skips declarations with empty property names', () => {
    expect(parseCSSDeclarations(': red;')).toEqual([]);
  });

  it('handles shorthand values with multiple parts', () => {
    expect(parseCSSDeclarations('margin: 10px 20px 30px 40px;')).toEqual([
      ['margin', '10px 20px 30px 40px'],
    ]);
  });

  it('handles border shorthand', () => {
    expect(parseCSSDeclarations('border: 1px solid red;')).toEqual([['border', '1px solid red']]);
  });

  it('handles rgb() values', () => {
    expect(parseCSSDeclarations('color: rgb(255, 0, 0); opacity: 1;')).toEqual([
      ['color', 'rgb(255, 0, 0)'],
      ['opacity', '1'],
    ]);
  });

  it('handles rgba() values', () => {
    expect(parseCSSDeclarations('color: rgba(255, 0, 0, 0.5);')).toEqual([
      ['color', 'rgba(255, 0, 0, 0.5)'],
    ]);
  });

  it('handles var() values', () => {
    expect(parseCSSDeclarations('color: var(--primary);')).toEqual([['color', 'var(--primary)']]);
  });

  it('handles var() with fallback', () => {
    expect(parseCSSDeclarations('color: var(--primary, red);')).toEqual([
      ['color', 'var(--primary, red)'],
    ]);
  });

  it('handles nested function calls (calc + var)', () => {
    expect(parseCSSDeclarations('width: calc(100% - var(--spacing, 10px));')).toEqual([
      ['width', 'calc(100% - var(--spacing, 10px))'],
    ]);
  });

  it('handles multiple function calls in one value', () => {
    expect(parseCSSDeclarations('transform: translate(10px, 20px) scale(1.5);')).toEqual([
      ['transform', 'translate(10px, 20px) scale(1.5)'],
    ]);
  });

  it('handles url() with data URI containing semicolons', () => {
    expect(
      parseCSSDeclarations('background: url(data:image/png;base64,abc123); color: red;')
    ).toEqual([
      ['background', 'url(data:image/png;base64,abc123)'],
      ['color', 'red'],
    ]);
  });

  it('handles double-quoted string with semicolons', () => {
    expect(parseCSSDeclarations('font-family: "Arial; Helvetica", sans-serif;')).toEqual([
      ['font-family', '"Arial; Helvetica", sans-serif'],
    ]);
  });

  it('handles single-quoted string with semicolons', () => {
    expect(parseCSSDeclarations("font-family: 'Arial; Helvetica', sans-serif;")).toEqual([
      ['font-family', "'Arial; Helvetica', sans-serif"],
    ]);
  });

  it('handles quoted string with parentheses', () => {
    expect(parseCSSDeclarations('content: "has(parens)";')).toEqual([['content', '"has(parens)"']]);
  });

  it('handles quoted string with close paren in url()', () => {
    expect(parseCSSDeclarations('background: url("has)paren"); color: red;')).toEqual([
      ['background', 'url("has)paren")'],
      ['color', 'red'],
    ]);
  });

  it('handles font-family with quoted and unquoted names', () => {
    expect(
      parseCSSDeclarations("font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;")
    ).toEqual([['font-family', "'Helvetica Neue', Helvetica, Arial, sans-serif"]]);
  });

  it('handles colon inside quoted value', () => {
    expect(parseCSSDeclarations("font-family: 'My: Font';")).toEqual([
      ['font-family', "'My: Font'"],
    ]);
  });

  it('handles custom property declarations', () => {
    expect(parseCSSDeclarations('--my-color: blue;')).toEqual([['--my-color', 'blue']]);
  });

  it('handles custom property as value via var()', () => {
    expect(parseCSSDeclarations('color: var(--my-color);')).toEqual([['color', 'var(--my-color)']]);
  });

  it('handles custom property with complex value', () => {
    expect(parseCSSDeclarations('--gradient: linear-gradient(to right, red, blue);')).toEqual([
      ['--gradient', 'linear-gradient(to right, red, blue)'],
    ]);
  });

  it('skips block comments between declarations', () => {
    expect(parseCSSDeclarations('color: red; /* a comment */ font-size: 12px;')).toEqual([
      ['color', 'red'],
      ['font-size', '12px'],
    ]);
  });

  it('skips comments at the start', () => {
    expect(parseCSSDeclarations('/* start */ color: red;')).toEqual([['color', 'red']]);
  });

  it('skips comments at the end', () => {
    expect(parseCSSDeclarations('color: red; /* end */')).toEqual([['color', 'red']]);
  });

  it('skips multiple consecutive comments', () => {
    expect(parseCSSDeclarations('/* a */ /* b */ color: red;')).toEqual([['color', 'red']]);
  });

  it('strips comments from within a value', () => {
    expect(parseCSSDeclarations('color: /* ignored */ red;')).toEqual([['color', 'red']]);
  });

  it('strips comments between property and colon', () => {
    expect(parseCSSDeclarations('color/* x */: red;')).toEqual([['color', 'red']]);
  });

  it('handles unterminated comment gracefully', () => {
    expect(parseCSSDeclarations('color: red; /* unterminated')).toEqual([['color', 'red']]);
  });

  it('handles comment-only input', () => {
    expect(parseCSSDeclarations('/* nothing here */')).toEqual([]);
  });

  it('warns on unclosed parenthesis in dev mode', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    parseCSSDeclarations('color: rgb(255, 0, 0; font-size: 12px;');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unclosed parenthesis'));
    warnSpy.mockRestore();
  });

  it('drops broken declaration and recovers subsequent ones', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseCSSDeclarations('color: rgb(255, 0, 0; font-size: 12px;')).toMatchInlineSnapshot(`
      [
        [
          "font-size",
          "12px",
        ],
      ]
    `);
    jest.restoreAllMocks();
  });

  it('handles stray close paren without going negative', () => {
    expect(parseCSSDeclarations('color: red) blue; font-size: 12px;')).toEqual([
      ['color', 'red) blue'],
      ['font-size', '12px'],
    ]);
  });

  it('handles typical styled-components RN output', () => {
    const css = `
      padding-top: 10px;
      padding-bottom: 20px;
      background-color: rgba(0, 0, 0, 0.5);
      flex: 1;
      justify-content: center;
      align-items: center;
    `;
    expect(parseCSSDeclarations(css)).toEqual([
      ['padding-top', '10px'],
      ['padding-bottom', '20px'],
      ['background-color', 'rgba(0, 0, 0, 0.5)'],
      ['flex', '1'],
      ['justify-content', 'center'],
      ['align-items', 'center'],
    ]);
  });

  it('handles dynamic interpolation output', () => {
    const opacity = '0.5';
    const color = 'rgb(255, 100, 50)';
    const css = `opacity: ${opacity}; color: ${color}; flex: 1;`;
    expect(parseCSSDeclarations(css)).toEqual([
      ['opacity', '0.5'],
      ['color', 'rgb(255, 100, 50)'],
      ['flex', '1'],
    ]);
  });

  it('handles shadow declarations (multiple values with commas)', () => {
    expect(
      parseCSSDeclarations(
        'shadow-offset: 0px 2px; shadow-radius: 4; shadow-color: rgba(0,0,0,0.3); shadow-opacity: 1;'
      )
    ).toEqual([
      ['shadow-offset', '0px 2px'],
      ['shadow-radius', '4'],
      ['shadow-color', 'rgba(0,0,0,0.3)'],
      ['shadow-opacity', '1'],
    ]);
  });

  it('handles hex color formats', () => {
    expect(
      parseCSSDeclarations('color: #fff; background-color: #ff00ff; border-color: #ff00ff80;')
    ).toEqual([
      ['color', '#fff'],
      ['background-color', '#ff00ff'],
      ['border-color', '#ff00ff80'],
    ]);
  });

  it('handles hsl/hsla colors', () => {
    expect(
      parseCSSDeclarations('color: hsl(120, 100%, 50%); background: hsla(0, 0%, 0%, 0.5);')
    ).toEqual([
      ['color', 'hsl(120, 100%, 50%)'],
      ['background', 'hsla(0, 0%, 0%, 0.5)'],
    ]);
  });

  it('handles modern space-separated color syntax', () => {
    expect(parseCSSDeclarations('color: rgb(255 0 0); background: rgba(0 0 0 / 0.5);')).toEqual([
      ['color', 'rgb(255 0 0)'],
      ['background', 'rgba(0 0 0 / 0.5)'],
    ]);
  });

  it('handles hwb() colors', () => {
    expect(parseCSSDeclarations('color: hwb(120, 0%, 0%);')).toEqual([
      ['color', 'hwb(120, 0%, 0%)'],
    ]);
  });

  it('handles color() function', () => {
    expect(parseCSSDeclarations('color: color(srgb 1 0.5 0);')).toEqual([
      ['color', 'color(srgb 1 0.5 0)'],
    ]);
  });

  it('handles single transform function', () => {
    expect(parseCSSDeclarations('transform: rotate(45deg);')).toEqual([
      ['transform', 'rotate(45deg)'],
    ]);
  });

  it('handles chained transform functions', () => {
    expect(
      parseCSSDeclarations(
        'transform: translate(10px, 20px) rotate(45deg) scale(1.5) skewX(10deg);'
      )
    ).toEqual([['transform', 'translate(10px, 20px) rotate(45deg) scale(1.5) skewX(10deg)']]);
  });

  it('handles perspective transform', () => {
    expect(parseCSSDeclarations('transform: perspective(500px) rotateY(45deg);')).toEqual([
      ['transform', 'perspective(500px) rotateY(45deg)'],
    ]);
  });

  it('handles transform with radians', () => {
    expect(parseCSSDeclarations('transform: rotateZ(0.785398rad);')).toEqual([
      ['transform', 'rotateZ(0.785398rad)'],
    ]);
  });

  it('handles single filter function', () => {
    expect(parseCSSDeclarations('filter: blur(10px);')).toEqual([['filter', 'blur(10px)']]);
  });

  it('handles chained filter functions', () => {
    expect(
      parseCSSDeclarations('filter: brightness(0.5) contrast(1.5) saturate(200%) blur(2px);')
    ).toEqual([['filter', 'brightness(0.5) contrast(1.5) saturate(200%) blur(2px)']]);
  });

  it('handles drop-shadow filter with nested parens', () => {
    expect(parseCSSDeclarations('filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));')).toEqual([
      ['filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'],
    ]);
  });

  it('handles simple box-shadow', () => {
    expect(parseCSSDeclarations('box-shadow: 0 2px 4px rgba(0,0,0,0.3);')).toEqual([
      ['box-shadow', '0 2px 4px rgba(0,0,0,0.3)'],
    ]);
  });

  it('handles multiple box-shadows (comma-separated)', () => {
    expect(parseCSSDeclarations('box-shadow: 0 2px 4px red, inset 0 1px 2px blue;')).toEqual([
      ['box-shadow', '0 2px 4px red, inset 0 1px 2px blue'],
    ]);
  });

  it('handles text-shadow', () => {
    expect(parseCSSDeclarations('text-shadow: 1px 1px 2px rgba(0,0,0,0.5);')).toEqual([
      ['text-shadow', '1px 1px 2px rgba(0,0,0,0.5)'],
    ]);
  });

  it('handles linear-gradient', () => {
    expect(parseCSSDeclarations('background-image: linear-gradient(to right, red, blue);')).toEqual(
      [['background-image', 'linear-gradient(to right, red, blue)']]
    );
  });

  it('handles complex gradient with color stops and rgba', () => {
    expect(
      parseCSSDeclarations(
        'background-image: linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%);'
      )
    ).toEqual([
      ['background-image', 'linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%)'],
    ]);
  });

  it('handles aspect-ratio with slash notation', () => {
    expect(parseCSSDeclarations('aspect-ratio: 16/9;')).toEqual([['aspect-ratio', '16/9']]);
  });

  it('handles font shorthand with line-height slash', () => {
    expect(parseCSSDeclarations('font: 14px/20px sans-serif;')).toEqual([
      ['font', '14px/20px sans-serif'],
    ]);
  });

  it('handles font-family with multiple quoted and unquoted names', () => {
    expect(parseCSSDeclarations('font-family: "Helvetica Neue", \'Arial\', sans-serif;')).toEqual([
      ['font-family', '"Helvetica Neue", \'Arial\', sans-serif'],
    ]);
  });

  it('handles font-variant with space-separated values', () => {
    expect(parseCSSDeclarations('font-variant: small-caps oldstyle-nums;')).toEqual([
      ['font-variant', 'small-caps oldstyle-nums'],
    ]);
  });

  it('handles negative values', () => {
    expect(parseCSSDeclarations('margin-top: -10px; translate: -50%;')).toEqual([
      ['margin-top', '-10px'],
      ['translate', '-50%'],
    ]);
  });

  it('handles decimal without leading zero', () => {
    expect(parseCSSDeclarations('opacity: .5;')).toEqual([['opacity', '.5']]);
  });

  it('handles scientific notation', () => {
    expect(parseCSSDeclarations('opacity: 5e-1;')).toEqual([['opacity', '5e-1']]);
  });

  it('handles percentage values', () => {
    expect(parseCSSDeclarations('width: 50%; height: 100%;')).toEqual([
      ['width', '50%'],
      ['height', '100%'],
    ]);
  });

  it('handles boolean-like string values', () => {
    expect(
      parseCSSDeclarations('include-font-padding: false; needs-offscreen-alpha-compositing: true;')
    ).toEqual([
      ['include-font-padding', 'false'],
      ['needs-offscreen-alpha-compositing', 'true'],
    ]);
  });

  it('handles auto and none values', () => {
    expect(parseCSSDeclarations('pointer-events: none; width: auto; position: relative;')).toEqual([
      ['pointer-events', 'none'],
      ['width', 'auto'],
      ['position', 'relative'],
    ]);
  });

  it('handles outline properties', () => {
    expect(
      parseCSSDeclarations('outline-width: 2px; outline-style: solid; outline-color: blue;')
    ).toEqual([
      ['outline-width', '2px'],
      ['outline-style', 'solid'],
      ['outline-color', 'blue'],
    ]);
  });

  it('handles mix-blend-mode', () => {
    expect(parseCSSDeclarations('mix-blend-mode: multiply;')).toEqual([
      ['mix-blend-mode', 'multiply'],
    ]);
  });

  it('handles gap properties', () => {
    expect(parseCSSDeclarations('gap: 10px; row-gap: 5px; column-gap: 15px;')).toEqual([
      ['gap', '10px'],
      ['row-gap', '5px'],
      ['column-gap', '15px'],
    ]);
  });

  it('handles inset properties', () => {
    expect(parseCSSDeclarations('inset: 0; inset-block: 10px 20px;')).toEqual([
      ['inset', '0'],
      ['inset-block', '10px 20px'],
    ]);
  });

  describe('adversarial inputs', () => {
    let warnSpy: jest.SpyInstance;
    beforeEach(() => {
      warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('handles undefined interpolation (coerced to "undefined" string)', () => {
      expect(parseCSSDeclarations('color: undefined;')).toEqual([['color', 'undefined']]);
    });

    it('handles null interpolation producing empty value', () => {
      expect(parseCSSDeclarations('color: ; font-size: 12px;')).toEqual([['font-size', '12px']]);
    });

    it('handles NaN interpolation', () => {
      expect(parseCSSDeclarations('opacity: NaN;')).toEqual([['opacity', 'NaN']]);
    });

    it('handles empty string interpolation producing empty value', () => {
      expect(parseCSSDeclarations('color: ;')).toEqual([]);
    });

    it('handles interpolation producing only whitespace value', () => {
      expect(parseCSSDeclarations('color:   ;')).toEqual([]);
    });

    it('handles double semicolons', () => {
      expect(parseCSSDeclarations('color: red;; font-size: 12px;')).toEqual([
        ['color', 'red'],
        ['font-size', '12px'],
      ]);
    });

    it('handles triple semicolons', () => {
      expect(parseCSSDeclarations('color: red;;; font-size: 12px;')).toEqual([
        ['color', 'red'],
        ['font-size', '12px'],
      ]);
    });

    it('handles leading semicolons', () => {
      expect(parseCSSDeclarations('; ; color: red;')).toEqual([['color', 'red']]);
    });

    it('handles only semicolons', () => {
      expect(parseCSSDeclarations(';;;')).toEqual([]);
    });

    it('handles text with no colon', () => {
      expect(parseCSSDeclarations('just some random text')).toEqual([]);
    });

    it('handles trailing colon with no value', () => {
      expect(parseCSSDeclarations('color:')).toEqual([]);
    });

    it('handles trailing colon with whitespace only', () => {
      expect(parseCSSDeclarations('color:   ')).toEqual([]);
    });

    it('handles colon at start (empty property)', () => {
      expect(parseCSSDeclarations(': red;')).toEqual([]);
    });

    it('handles multiple colons in value (url with protocol)', () => {
      expect(parseCSSDeclarations('--api-url: https://example.com:8080/path;')).toEqual([
        ['--api-url', 'https://example.com:8080/path'],
      ]);
    });

    it('warns and excludes selector-like text', () => {
      expect(parseCSSDeclarations('.foo { color: red; }')).toMatchInlineSnapshot(`[]`);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not supported as an inline style')
      );
    });

    it('excludes all declarations inside a selector block', () => {
      expect(parseCSSDeclarations('.foo { color: red; font-size: 12px; }')).toMatchInlineSnapshot(
        `[]`
      );
    });

    it('recovers declarations after a selector block', () => {
      expect(parseCSSDeclarations('.foo { color: red; font-size: 12px; } opacity: 1;'))
        .toMatchInlineSnapshot(`
        [
          [
            "opacity",
            "1",
          ],
        ]
      `);
    });

    it('warns and excludes at-rules', () => {
      expect(parseCSSDeclarations('@media screen { color: red; }')).toMatchInlineSnapshot(`[]`);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not supported as an inline style')
      );
    });

    it('excludes all declarations inside an at-rule block', () => {
      expect(
        parseCSSDeclarations('@media screen { color: red; font-size: 12px; }')
      ).toMatchInlineSnapshot(`[]`);
    });

    it('drops unterminated double quote and recovers', () => {
      expect(parseCSSDeclarations('font-family: "Unterminated; color: red;'))
        .toMatchInlineSnapshot(`
        [
          [
            "color",
            "red",
          ],
        ]
      `);
    });

    it('drops unterminated single quote and recovers', () => {
      expect(parseCSSDeclarations("font-family: 'Unterminated; color: red;"))
        .toMatchInlineSnapshot(`
        [
          [
            "color",
            "red",
          ],
        ]
      `);
    });

    it('handles single quotes inside double quotes', () => {
      const result = parseCSSDeclarations(`font-family: "it's complex"; color: red;`);
      expect(result).toEqual([
        ['font-family', `"it's complex"`],
        ['color', 'red'],
      ]);
    });

    it('handles nested quote styles', () => {
      expect(parseCSSDeclarations(`content: "she said 'hello'"; color: red;`)).toEqual([
        ['content', `"she said 'hello'"`],
        ['color', 'red'],
      ]);
    });

    it('handles unicode in values', () => {
      expect(parseCSSDeclarations('content: "\\2603"; color: red;')).toEqual([
        ['content', '"\\2603"'],
        ['color', 'red'],
      ]);
    });

    it('handles emoji in values', () => {
      expect(parseCSSDeclarations('content: "🎨"; color: red;')).toEqual([
        ['content', '"🎨"'],
        ['color', 'red'],
      ]);
    });

    it('handles non-ASCII in custom property names', () => {
      expect(parseCSSDeclarations('--cölor: blue;')).toEqual([['--cölor', 'blue']]);
    });

    it('handles backslash in values', () => {
      expect(parseCSSDeclarations('content: "line1\\nline2";')).toEqual([
        ['content', '"line1\\nline2"'],
      ]);
    });

    it('handles very long value strings', () => {
      const longValue = 'x'.repeat(10000);
      expect(parseCSSDeclarations(`color: ${longValue};`)).toEqual([['color', longValue]]);
    });

    it('handles 200 declarations', () => {
      const decls = Array.from({ length: 200 }, (_, i) => `prop-${i}: value-${i}`).join('; ');
      const result = parseCSSDeclarations(decls);
      expect(result).toHaveLength(200);
      expect(result[0]).toEqual(['prop-0', 'value-0']);
      expect(result[199]).toEqual(['prop-199', 'value-199']);
    });

    it('handles deeply nested parentheses', () => {
      expect(
        parseCSSDeclarations('width: calc(calc(calc(100% - 10px) - 5px) - 2px); color: red;')
      ).toEqual([
        ['width', 'calc(calc(calc(100% - 10px) - 5px) - 2px)'],
        ['color', 'red'],
      ]);
    });

    it('drops multiple broken declarations and recovers valid ones', () => {
      const result = parseCSSDeclarations('color: rgb(; font-size: calc(; opacity: 1;');
      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(result).toEqual([['opacity', '1']]);
    });

    it('handles CRLF line endings', () => {
      expect(parseCSSDeclarations('color: red;\r\nfont-size: 12px;\r\n')).toEqual([
        ['color', 'red'],
        ['font-size', '12px'],
      ]);
    });

    it('handles tab characters in unusual positions', () => {
      expect(parseCSSDeclarations('\tcolor\t:\tred\t;\tfont-size\t:\t12px\t;')).toEqual([
        ['color', 'red'],
        ['font-size', '12px'],
      ]);
    });

    it('preserves comment-like text inside double quotes', () => {
      expect(parseCSSDeclarations('content: "/* not a comment */"; color: red;')).toEqual([
        ['content', '"/* not a comment */"'],
        ['color', 'red'],
      ]);
    });

    it('preserves comment-like text inside single quotes', () => {
      expect(parseCSSDeclarations("content: '/* hello */'; color: red;")).toEqual([
        ['content', "'/* hello */'"],
        ['color', 'red'],
      ]);
    });

    it('preserves /* in quoted url()', () => {
      expect(parseCSSDeclarations('background: url("path/to/*.css"); color: red;')).toEqual([
        ['background', 'url("path/to/*.css")'],
        ['color', 'red'],
      ]);
    });

    it('handles escaped quotes inside double-quoted strings', () => {
      expect(parseCSSDeclarations('content: "hello\\"world"; color: red;')).toEqual([
        ['content', '"hello\\"world"'],
        ['color', 'red'],
      ]);
    });

    it('handles escaped quotes inside single-quoted strings', () => {
      expect(parseCSSDeclarations("content: 'it\\'s here'; color: red;")).toEqual([
        ['content', "'it\\'s here'"],
        ['color', 'red'],
      ]);
    });

    it('handles semicolon immediately after colon (empty value)', () => {
      expect(parseCSSDeclarations('color:; font-size: 12px;')).toEqual([['font-size', '12px']]);
    });

    it('handles whitespace-only segments between semicolons', () => {
      expect(parseCSSDeclarations('color: red;   ;   ; font-size: 12px;')).toEqual([
        ['color', 'red'],
        ['font-size', '12px'],
      ]);
    });

    it('handles close paren without open paren', () => {
      expect(parseCSSDeclarations('color: red); font-size: 12px;')).toEqual([
        ['color', 'red)'],
        ['font-size', '12px'],
      ]);
    });

    it('handles cascading colons without semicolons', () => {
      expect(parseCSSDeclarations('a: b: c')).toEqual([['a', 'b: c']]);
    });

    it('handles [object Object] from broken interpolation', () => {
      expect(parseCSSDeclarations('color: [object Object];')).toEqual([
        ['color', '[object Object]'],
      ]);
    });

    it('handles just newlines and whitespace (conditional styles)', () => {
      expect(parseCSSDeclarations('\n\n  \n  \n\n')).toEqual([]);
    });

    it('preserves duplicate properties', () => {
      expect(parseCSSDeclarations('color: red; color: blue;')).toEqual([
        ['color', 'red'],
        ['color', 'blue'],
      ]);
    });

    it('includes !important in value', () => {
      expect(parseCSSDeclarations('color: red !important;')).toEqual([['color', 'red !important']]);
    });

    it('handles data URI with semicolons and base64 in quotes', () => {
      expect(
        parseCSSDeclarations(
          'background: url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E"); color: red;'
        )
      ).toEqual([
        ['background', 'url("data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E")'],
        ['color', 'red'],
      ]);
    });

    it('handles data URI without quotes (semicolons protected by parens)', () => {
      expect(
        parseCSSDeclarations('background: url(data:image/svg+xml;base64,PHN2Zz4=); color: red;')
      ).toEqual([
        ['background', 'url(data:image/svg+xml;base64,PHN2Zz4=)'],
        ['color', 'red'],
      ]);
    });

    it('double backslash before quote closes the string correctly', () => {
      expect(parseCSSDeclarations('content: "test\\\\"; color: red;')).toEqual([
        ['content', '"test\\\\"'],
        ['color', 'red'],
      ]);
    });

    it('triple backslash: escaped backslash then quote closes string', () => {
      expect(parseCSSDeclarations('content: "test\\\\\\"more"; color: red;'))
        .toMatchInlineSnapshot(`
        [
          [
            "content",
            ""test\\\\\\"more"",
          ],
          [
            "color",
            "red",
          ],
        ]
      `);
    });

    it('backslash at end of value', () => {
      expect(parseCSSDeclarations('color: red\\')).toMatchInlineSnapshot(`
        [
          [
            "color",
            "red\\",
          ],
        ]
      `);
    });

    it('backslash at end of quoted string before EOF (dropped, nothing to recover)', () => {
      expect(parseCSSDeclarations('content: "end\\')).toMatchInlineSnapshot(`[]`);
    });

    it('backslash-n inside quotes preserved as-is', () => {
      expect(parseCSSDeclarations('content: "line1\\nline2"; color: red;')).toEqual([
        ['content', '"line1\\nline2"'],
        ['color', 'red'],
      ]);
    });

    it('empty quoted strings', () => {
      expect(parseCSSDeclarations('content: ""; color: red;')).toEqual([
        ['content', '""'],
        ['color', 'red'],
      ]);
    });

    it('adjacent different quotes', () => {
      expect(parseCSSDeclarations('content: ""\'\'; color: red;')).toEqual([
        ['content', '""\'\''],
        ['color', 'red'],
      ]);
    });

    it('interpolation returning /* (unquoted comment start)', () => {
      const result = parseCSSDeclarations('color: red /* hey; font-size: 12px;');
      expect(result).toEqual([['color', 'red']]);
    });

    it('interpolation returning unmatched quote drops and recovers', () => {
      expect(parseCSSDeclarations('content: "broken; color: red;')).toMatchInlineSnapshot(`
        [
          [
            "color",
            "red",
          ],
        ]
      `);
    });

    it('interpolation returning semicolon splits into two declarations', () => {
      expect(parseCSSDeclarations('color: red; font-size: 12px;')).toEqual([
        ['color', 'red'],
        ['font-size', '12px'],
      ]);
    });

    it('interpolation returning full property:value pair', () => {
      expect(parseCSSDeclarations('color: red; font-size: 14px;')).toEqual([
        ['color', 'red'],
        ['font-size', '14px'],
      ]);
    });

    it('theme value with quotes in it (font stack)', () => {
      expect(
        parseCSSDeclarations('font-family: "Helvetica Neue", sans-serif; color: red;')
      ).toEqual([
        ['font-family', '"Helvetica Neue", sans-serif'],
        ['color', 'red'],
      ]);
    });

    it('url() with /* inside quoted argument is preserved', () => {
      expect(parseCSSDeclarations('background: url("image/*2x*/.png"); color: red;')).toEqual([
        ['background', 'url("image/*2x*/.png")'],
        ['color', 'red'],
      ]);
    });

    it('nested comment (CSS does not nest comments)', () => {
      expect(parseCSSDeclarations('/* outer /* inner */ visible */ color: red;'))
        .toMatchInlineSnapshot(`
        [
          [
            "visible */ color",
            "red",
          ],
        ]
      `);
    });

    it('null bytes in CSS', () => {
      expect(parseCSSDeclarations('color: red\0; font-size: 12px;')).toEqual([
        ['color', 'red\0'],
        ['font-size', '12px'],
      ]);
    });

    it('custom property with unquoted /* truncates (correct CSS behavior)', () => {
      const result = parseCSSDeclarations('--code: a /* b; color: red;');
      expect(result).toEqual([['--code', 'a']]);
    });

    it('unclosed quote drops and recovers remaining declarations', () => {
      expect(parseCSSDeclarations("content: 'unclosed; color: red; margin: 10px;"))
        .toMatchInlineSnapshot(`
        [
          [
            "color",
            "red",
          ],
          [
            "margin",
            "10px",
          ],
        ]
      `);
    });

    it('unclosed paren drops and recovers remaining declarations', () => {
      expect(parseCSSDeclarations('background: url(broken; color: red; margin: 10px;'))
        .toMatchInlineSnapshot(`
        [
          [
            "color",
            "red",
          ],
          [
            "margin",
            "10px",
          ],
        ]
      `);
    });
  });

  it('matches postcss output for a variety of valid declarations', () => {
    const cases: [string, [string, string][]][] = [
      ['color: red;', [['color', 'red']]],
      [
        'border-width: 10px; border-color: red;',
        [
          ['border-width', '10px'],
          ['border-color', 'red'],
        ],
      ],
      ['width: fit-content;', [['width', 'fit-content']]],
      ['background-color: hsl(120, 100%, 50%);', [['background-color', 'hsl(120, 100%, 50%)']]],
      [
        'flex-grow: 1; flex-shrink: 0; flex-basis: auto;',
        [
          ['flex-grow', '1'],
          ['flex-shrink', '0'],
          ['flex-basis', 'auto'],
        ],
      ],
    ];

    for (const [input, expected] of cases) {
      expect(parseCSSDeclarations(input)).toEqual(expected);
    }
  });
});
