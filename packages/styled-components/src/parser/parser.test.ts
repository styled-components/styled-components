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
    // context; the parser only recognizes `\0J` as a structural node.

    it('emits Interpolation node for a standalone sentinel', () => {
      expect(parse('\0J0\0')).toEqual([{ kind: NodeKind.Interpolation, index: 0 }]);
    });

    it('emits Interpolation between decls', () => {
      expect(parse('color: red; \0J0\0 margin: 0;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: 'red' },
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Decl, prop: 'margin', value: '0' },
      ]);
    });

    it('handles multi-digit indices', () => {
      expect(parse('\0J0\0\0J12\0\0J345\0')).toEqual([
        { kind: NodeKind.Interpolation, index: 0 },
        { kind: NodeKind.Interpolation, index: 12 },
        { kind: NodeKind.Interpolation, index: 345 },
      ]);
    });

    it('preserves embedded sentinels in declaration values', () => {
      expect(parse('color: \0I0\0;')).toEqual([
        { kind: NodeKind.Decl, prop: 'color', value: '\0I0\0' },
      ]);
    });

    it('preserves embedded sentinels in selectors before `{`', () => {
      // `${OtherComponent} & { ... }` becomes `\0I0\0 & { ... }`. The sentinel
      // is `\0I` (embedded); it rides in the selector string and resolves
      // at fill time without producing an Interpolation node.
      expect(parse('\0I0\0 & { color: red; }')).toEqual([
        {
          kind: NodeKind.Rule,
          selectors: ['\0I0\0 &'],
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
      expect(parse('\0J\0')).toEqual([]);
    });

    it('does not emit Interpolation node for embedded `\0I` sentinels', () => {
      // Even if an `\0I0\0` lands in block position, the parser treats it as
      // opaque text. A bug in parseSource would surface as malformed CSS,
      // not as a misclassified node.
      expect(parse('\0I0\0')).toEqual([]);
    });
  });
});
