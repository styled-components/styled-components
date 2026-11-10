/**
 * Direct unit tests on the native style compiler.
 *
 * Exercises the AST walker's bucket output (`base` / `conditional` / `keyframes`)
 * in isolation from the render pipeline. Integration behavior lives in
 * `src/native/test/modern-css.test.tsx`.
 */
import {
  getCssPropertyRegistration,
  resetCssPropertiesForTest,
} from '../../native/propertyRegistry';
import { resetWarningsForTest } from '../../native/transform/dev';
import { toNativeStyles, NativeStyles, resetNativeStyleCache } from '../compileNative';

const stubStyleSheet = {
  create: <T extends object>(styles: T) => styles,
} as any;

function compile(css: string): NativeStyles {
  return toNativeStyles(css, stubStyleSheet);
}

describe('toNativeStyles', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetNativeStyleCache();
    resetWarningsForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('base declarations', () => {
    it('collects flat declarations into base', () => {
      const r = compile('color: red; padding-top: 10px;');
      expect(r.base).toEqual({ color: 'red', paddingTop: 10 });
      expect(r.conditional).toEqual([]);
      expect(r.keyframes).toEqual([]);
    });

    it('keeps a stray `}` from leaking the rest of the template into the style output', () => {
      const r = compile('color: red; } body { background: red } x {');
      expect([r.base, r.conditional, r.keyframes]).toEqual([{ color: 'red' }, [], []]);
    });

    it('returns empty base for comment-only input', () => {
      const r = compile('/* just a comment */');
      expect(r.base).toEqual({});
      expect(r.conditional).toEqual([]);
    });

    it('lifts custom-property declarations into the cascade map (not base)', () => {
      const r = compile('--brand: hotpink;');
      // CSS Custom Properties L1 §2: `--name` declarations publish to
      // descendants through the cascade rather than landing on the host
      // element. The render path threads `customProperties` through
      // NativeStyleContext.cascade so child components' `var(--name)`
      // references resolve.
      expect(r.base).toEqual({});
      expect(r.customProperties).toBeDefined();
      expect(r.customProperties!.get('--brand')).toBe('hotpink');
    });
  });

  // CSS Borders 4 §3.7: `square` is a convex 90deg corner, which the spec
  // notes "looks identical to the 'normal' square corner you get from
  // border-radius: 0". The polyfill emits a corner mask and this fold turns
  // it into per-corner radii once the block has merged.
  describe('corner-shape: square folds into per-corner radii', () => {
    it('squares every corner and leaves no sentinel behind', () => {
      const r = compile('border-radius: 20px; corner-shape: square;');
      expect(r.base).toEqual({
        borderRadius: 20,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        borderBottomLeftRadius: 0,
      });
    });

    // The reason the fold exists. `corner-shape` and `border-radius` are
    // independent properties, so declaration order between them must not
    // change the result; emitting the zero from the handler would let a
    // later `border-radius` silently un-square the corners.
    it('is order-independent against border-radius', () => {
      const before = compile('corner-shape: square; border-radius: 20px;').base;
      const after = compile('border-radius: 20px; corner-shape: square;').base;
      expect(before).toEqual(after);
      expect(before.borderTopLeftRadius).toBe(0);
    });

    it('squares only the corners named, keeping the curve on the rest', () => {
      const r = compile('border-radius: 16px; corner-shape: square squircle;');
      expect(r.base).toEqual({
        borderRadius: 16,
        borderCurve: 'continuous',
        borderTopLeftRadius: 0,
        borderBottomRightRadius: 0,
      });
    });

    // An author-declared per-corner radius collides with the fold on the
    // same key; the shape wins, since in CSS the radius only sizes the
    // corner area and never un-squares it.
    it('overrides an explicit per-corner radius on a squared corner', () => {
      const r = compile('border-top-left-radius: 30px; corner-shape: square round;');
      expect(r.base.borderTopLeftRadius).toBe(0);
      expect(r.base.borderCurve).toBe('circular');
    });

    // The fold lives in processDecls, which every layer passes through, so
    // a conditional block gets it too rather than leaking the sentinel.
    it('folds inside a media query, not just the base block', () => {
      const r = compile('@media (min-width: 1px) { border-radius: 20px; corner-shape: square; }');
      expect(r.conditional[0]).toEqual({
        type: 'media',
        condition: '(min-width: 1px)',
        styles: {
          borderRadius: 20,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderBottomLeftRadius: 0,
        },
      });
    });
  });

  describe('RN unsupported values', () => {
    it('warns and drops fit-content', () => {
      const r = compile('width: fit-content; height: 20px;');
      expect(r.base).toEqual({ height: 20 });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('fit-content'));
    });

    it('drops min-content and max-content', () => {
      expect(compile('width: min-content; color: red;').base).toEqual({ color: 'red' });
      expect(compile('width: max-content; color: red;').base).toEqual({ color: 'red' });
    });
  });

  describe('@media → conditional bucket', () => {
    // https://drafts.csswg.org/css-conditional-3/#at-ruledef-media
    // "@media = @media <media-query-list> { <rule-list> }"
    it('extracts media prelude + body into a bucket', () => {
      const r = compile('color: red; @media (min-width: 400px) { color: blue; }');
      expect(r.base).toEqual({ color: 'red' });
      expect(r.conditional).toEqual([
        { type: 'media', condition: '(min-width: 400px)', styles: { color: 'blue' } },
      ]);
    });

    it('does not emit a media bucket when body has no declarations', () => {
      const r = compile('color: red; @media (min-width: 400px) { }');
      expect(r.conditional).toEqual([]);
    });

    it('emits multiple media buckets in source order', () => {
      const r = compile(`
        color: red;
        @media (min-width: 400px) { color: blue; }
        @media (min-width: 800px) { color: green; }
      `);
      expect(r.conditional).toHaveLength(2);
      expect(r.conditional[0].condition).toBe('(min-width: 400px)');
      expect(r.conditional[1].condition).toBe('(min-width: 800px)');
    });
  });

  describe('@container → conditional bucket with containerName', () => {
    // https://drafts.csswg.org/css-conditional-5/#at-ruledef-container
    // "@container = @container [ <container-name> ]? <container-condition> { <rule-list> }"
    it('extracts named container', () => {
      const r = compile('@container card (min-width: 300px) { color: red; }');
      expect(r.conditional[0]).toEqual({
        type: 'container',
        condition: '(min-width: 300px)',
        containerName: 'card',
        styles: { color: 'red' },
      });
    });

    it('extracts bare (unnamed) container', () => {
      const r = compile('@container (min-width: 300px) { color: red; }');
      expect(r.conditional[0]).toEqual({
        type: 'container',
        condition: '(min-width: 300px)',
        styles: { color: 'red' },
      });
      expect(r.conditional[0].containerName).toBeUndefined();
    });

    it('extracts container with height query', () => {
      const r = compile('@container panel (min-height: 200px) { opacity: 0.5; }');
      expect(r.conditional[0]).toMatchObject({
        type: 'container',
        condition: '(min-height: 200px)',
        containerName: 'panel',
      });
    });
  });

  describe('@supports → conditional bucket', () => {
    // https://drafts.csswg.org/css-conditional-3/#at-ruledef-supports
    // "@supports = @supports <supports-condition> { <rule-list> }"
    it('extracts supports prelude', () => {
      const r = compile('@supports (display: grid) { color: red; }');
      expect(r.conditional[0]).toEqual({
        type: 'supports',
        condition: '(display: grid)',
        styles: { color: 'red' },
      });
    });
  });

  describe('pseudo-state rules', () => {
    it('extracts each supported pseudo', () => {
      const pseudos = [
        ['&:hover', 'hover'],
        ['&:focus', 'focus'],
        ['&:focus-visible', 'focus'],
        ['&:active', 'pressed'],
        ['&:disabled', 'disabled'],
        ['&:enabled', 'enabled'],
        ['&:read-only', 'readOnly'],
        ['&:read-write', 'readWrite'],
      ];
      for (const [selector, mapped] of pseudos) {
        resetNativeStyleCache();
        const r = compile(`${selector} { opacity: 0.5; }`);
        expect(r.conditional[0]).toEqual({
          type: 'pseudo',
          condition: mapped,
          styles: { opacity: 0.5 },
        });
      }
    });

    it('warns and drops unsupported selectors at root', () => {
      const r = compile('.child { color: red; }');
      expect(r.conditional).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('complex selectors'));
    });

    it('drops unknown pseudos with a warning', () => {
      const r = compile('&:unknown { color: red; }');
      expect(r.conditional).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('complex selectors'));
    });

    it('ignores pseudo rules with empty bodies', () => {
      const r = compile('&:hover { }');
      expect(r.conditional).toEqual([]);
    });

    it.each(['&:constructor', '&:READ-ONLY'])(
      'drops %s with the complex-selector warning',
      selector => {
        const r = compile(`${selector} { color: red; }`);
        expect(r.conditional).toEqual([]);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('complex selectors'));
      }
    );

    // https://drafts.csswg.org/selectors-4/#enableddisabled (12.1.1)
    // "The :enabled pseudo-class represents user interface elements that are in an enabled state; such elements must have a corresponding disabled state."
    // "Conversely, the :disabled pseudo-class represents user interface elements that are in a disabled state; such elements must have a corresponding enabled state."
    // Deviation: here every element that isn't disabled matches `:enabled`.
    // https://drafts.csswg.org/selectors-4/#rw-pseudos (12.1.2)
    // "An element matches :read-write if it is user-alterable, as defined by the document language. Otherwise, it is :read-only."
    it.each([
      ['&:disabled { opacity: 0.5; }', 8],
      ['&:not(:disabled) { opacity: 0.5; }', 8],
      ['&:where(:active, :disabled) { opacity: 0.5; }', 12],
      ['@media (min-width: 400px) { &:disabled { opacity: 0.5; } }', 8],
      ['&[aria-pressed]:disabled { opacity: 0.5; }', 8],
      ['&:enabled { opacity: 0.5; }', 16],
      ['&:read-only { opacity: 0.5; }', 32],
      ['&:read-write { opacity: 0.5; }', 64],
      ['&:hover { opacity: 0.5; }', 1],
      ['&:focus-visible { opacity: 0.5; }', 2],
      ['opacity: 0.5;', 0],
      ['&:disabled { }', 0],
    ])('records %s in pseudoReads as %i', (css, bits) => {
      expect(compile(css).pseudoReads).toBe(bits);
    });
  });

  // A compound is `&` followed by two or more `:known` or `:not(:known)` terms, all of which must hold.
  describe('pseudo-class compounds', () => {
    // The bits column is the OR of every term's bit, negated ones included.
    it.each([
      [
        '&:active:not(:disabled)',
        12,
        { condition: 'pressed', and: [{ pseudo: 'disabled', negate: true }] },
      ],
      ['&:hover:enabled', 17, { condition: 'hover', and: [{ pseudo: 'enabled', negate: false }] }],
      [
        '&:not(:disabled):active',
        12,
        { condition: 'disabled', negate: true, and: [{ pseudo: 'pressed', negate: false }] },
      ],
      [
        '&:not(:hover):not(:focus)',
        3,
        { condition: 'hover', negate: true, and: [{ pseudo: 'focus', negate: true }] },
      ],
      [
        '&:hover:focus-visible:read-write',
        67,
        {
          condition: 'hover',
          and: [
            { pseudo: 'focus', negate: false },
            { pseudo: 'readWrite', negate: false },
          ],
        },
      ],
      [
        '&:enabled:read-write',
        80,
        { condition: 'enabled', and: [{ pseudo: 'readWrite', negate: false }] },
      ],
      [
        '&:hover:focus:enabled',
        19,
        {
          condition: 'hover',
          and: [
            { pseudo: 'focus', negate: false },
            { pseudo: 'enabled', negate: false },
          ],
        },
      ],
    ])(
      'records %s (pseudoReads %i) as one entry whose `and` holds the remaining terms',
      (selector, bits, shape) => {
        const r = compile(`${selector} { opacity: 0.5; }`);
        expect(r.conditional).toEqual([{ type: 'pseudo', styles: { opacity: 0.5 }, ...shape }]);
        expect(r.pseudoEntries).toEqual(r.conditional);
        expect(r.pseudoReads).toBe(bits);
      }
    );

    it('carries the terms onto a compound nested in an at-rule', () => {
      const r = compile('@media (min-width: 400px) { &:hover:not(:disabled) { opacity: 0.5; } }');
      expect(r.conditional).toEqual([
        {
          type: 'media',
          condition: '(min-width: 400px)',
          pseudo: 'hover',
          and: [{ pseudo: 'disabled', negate: true }],
          styles: { opacity: 0.5 },
        },
      ]);
      expect(r.pseudoReads).toBe(9);
    });

    it('records the negation of a gated pseudo-class in `pseudoNegate`, not `negate`', () => {
      const r = compile(
        '@media (min-width: 400px) { &:not(:disabled):active { opacity: 0.5; } &:not(:hover) { opacity: 0.4; } }'
      );
      expect(r.conditional).toEqual([
        {
          type: 'media',
          condition: '(min-width: 400px)',
          pseudo: 'disabled',
          pseudoNegate: true,
          and: [{ pseudo: 'pressed', negate: false }],
          styles: { opacity: 0.5 },
        },
        {
          type: 'media',
          condition: '(min-width: 400px)',
          pseudo: 'hover',
          pseudoNegate: true,
          styles: { opacity: 0.4 },
        },
      ]);
    });

    it('records the negation of a gated attribute selector in `negate`', () => {
      const r = compile('@media (min-width: 400px) { &:not([data-x]):hover { opacity: 0.5; } }');
      expect(r.conditional).toEqual([
        {
          type: 'media',
          condition: '(min-width: 400px)',
          attrs: [{ name: 'data-x' }],
          negate: true,
          pseudo: 'hover',
          styles: { opacity: 0.5 },
        },
      ]);
    });

    it.each([
      '&:active:unknown',
      '&:unknown:active',
      '&:hover:',
      '&:hover::enabled',
      '&:hover :enabled',
      '&:hover:not(:unknown)',
      '&:hover:not(.foo)',
      '&:hover:not(:disabled, :focus)',
      '&:hover:constructor',
      '&:hover:READ-ONLY',
      '&:hover:is(:disabled)',
    ])('drops %s with the complex-selector warning', selector => {
      const r = compile(`${selector} { opacity: 0.5; }`);
      expect(r.conditional).toEqual([]);
      expect(r.pseudoReads).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('complex selectors'));
    });
  });

  // https://drafts.csswg.org/selectors-4/#structure
  // "A compound selector is a sequence of simple selectors that are not separated by a combinator, and represents a set of simultaneous conditions on a single element."
  // "A given element is said to match a compound selector when it matches all simple selectors in the compound selector."
  // The pseudo-class terms ride one entry: the first leads (`pseudo`, `pseudoNegate`) and any others go in `and`.
  describe('compounds that start with an attribute or structural selector', () => {
    it.each([
      [
        "&[aria-pressed='true']:hover:not(:disabled)",
        9,
        {
          type: 'attr',
          condition: 'aria-pressed=true',
          attrs: [{ name: 'aria-pressed', value: 'true' }],
          pseudo: 'hover',
          and: [{ pseudo: 'disabled', negate: true }],
        },
      ],
      [
        '&[x]:hover:enabled',
        17,
        {
          type: 'attr',
          condition: 'x',
          attrs: [{ name: 'x' }],
          pseudo: 'hover',
          and: [{ pseudo: 'enabled', negate: false }],
        },
      ],
      [
        '&[x]:not(:disabled)',
        8,
        {
          type: 'attr',
          condition: 'x',
          attrs: [{ name: 'x' }],
          pseudo: 'disabled',
          pseudoNegate: true,
        },
      ],
      [
        '&[a][b]:not(:disabled):active',
        12,
        {
          type: 'attr',
          condition: 'a+b',
          attrs: [{ name: 'a' }, { name: 'b' }],
          pseudo: 'disabled',
          pseudoNegate: true,
          and: [{ pseudo: 'pressed', negate: false }],
        },
      ],
      [
        '&:not([x]):hover:enabled',
        17,
        {
          type: 'attr',
          condition: 'x',
          attrs: [{ name: 'x' }],
          negate: true,
          pseudo: 'hover',
          and: [{ pseudo: 'enabled', negate: false }],
        },
      ],
      [
        '&:first-child:hover:enabled',
        17,
        {
          type: 'nthChild',
          condition: 'nth:Fc:0n+1',
          nthSpec: { a: 0, b: 1, fromEnd: false, ofType: false },
          pseudo: 'hover',
          and: [{ pseudo: 'enabled', negate: false }],
        },
      ],
      [
        '&:last-child:hover:not(:disabled)',
        9,
        {
          type: 'nthChild',
          condition: 'nth:Lc:0n+1',
          nthSpec: { a: 0, b: 1, fromEnd: true, ofType: false },
          pseudo: 'hover',
          and: [{ pseudo: 'disabled', negate: true }],
        },
      ],
      [
        '&:nth-child(2n+1):not(:disabled)',
        8,
        {
          type: 'nthChild',
          condition: 'nth:Fc:2n+1',
          nthSpec: { a: 2, b: 1, fromEnd: false, ofType: false },
          pseudo: 'disabled',
          pseudoNegate: true,
        },
      ],
      [
        '&:nth-child(2 of [data-x]):hover:focus:enabled',
        19,
        {
          type: 'nthChild',
          condition: 'nth:Fc:0n+2|ofa:data-x=',
          nthSpec: {
            a: 0,
            b: 2,
            fromEnd: false,
            ofType: false,
            of: { kind: 'attr', attr: { name: 'data-x' } },
          },
          pseudo: 'hover',
          and: [
            { pseudo: 'focus', negate: false },
            { pseudo: 'enabled', negate: false },
          ],
        },
      ],
    ])('records %s (pseudoReads %i) as one gated entry', (selector, bits, shape) => {
      const r = compile(`${selector} { opacity: 0.5; }`);
      expect(r.conditional).toEqual([{ styles: { opacity: 0.5 }, ...shape }]);
      expect(r.pseudoEntries).toEqual(r.conditional);
      expect(r.pseudoReads).toBe(bits);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it.each([
      '&[x]:hover:unknown',
      '&[x]:hover:not(:unknown)',
      '&[x]:hover:not(.foo)',
      '&[x]:hover:not(:disabled, :focus)',
      '&[x]:hover::enabled',
      '&[x]:hover :enabled',
      '&[x]:hover:constructor',
      '&[x]:hover:READ-ONLY',
      '&:first-child:hover:unknown',
      '&:first-child:hover:not(.foo)',
      '&:first-child:hover :enabled',
      '&:nth-child(2n+1):hover:',
      '&:hover:first-child',
    ])('drops %s with the complex-selector warning', selector => {
      const r = compile(`${selector} { opacity: 0.5; }`);
      expect(r.conditional).toEqual([]);
      expect(r.pseudoReads).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('complex selectors'));
    });

    it('carries the terms onto a chained attribute compound nested in an at-rule', () => {
      const r = compile(
        '@media (min-width: 400px) { &[x]:hover:not(:disabled) { opacity: 0.5; } }'
      );
      expect(r.conditional).toEqual([
        {
          type: 'media',
          condition: '(min-width: 400px)',
          attrs: [{ name: 'x' }],
          pseudo: 'hover',
          and: [{ pseudo: 'disabled', negate: true }],
          styles: { opacity: 0.5 },
        },
      ]);
    });
  });

  // https://drafts.csswg.org/selectors-4/#selector-list
  // "A comma-separated list of selectors represents the union of all elements selected by each of the individual selectors in the selector list."
  // https://drafts.csswg.org/selectors-4/#invalid
  // "a selector list containing an invalid selector is invalid."
  // Deviation: native judges each member alone, so a supported member applies and an unsupported one is skipped with a warning naming it.
  describe('selector lists are judged member by member', () => {
    const warnedMembers = () =>
      warnSpy.mock.calls.map(call => /\(received: (.*?)\)\. Only/.exec(String(call[0]))?.[1]);

    it('applies a pseudo-class member and skips a descendant member', () => {
      const r = compile('&:hover, & .icon { opacity: 0.5; }');
      expect(r.conditional).toEqual([
        { type: 'pseudo', condition: 'hover', styles: { opacity: 0.5 } },
      ]);
      expect(warnedMembers()).toEqual(['& .icon']);
    });

    it('applies an attribute member and a pseudo-class member in source order', () => {
      const r = compile("&[x], &:hover:enabled, &[a='b']:focus { opacity: 0.5; }");
      expect(r.conditional).toEqual([
        { type: 'attr', condition: 'x', attrs: [{ name: 'x' }], styles: { opacity: 0.5 } },
        {
          type: 'pseudo',
          condition: 'hover',
          and: [{ pseudo: 'enabled', negate: false }],
          styles: { opacity: 0.5 },
        },
        {
          type: 'attr',
          condition: 'a=b',
          attrs: [{ name: 'a', value: 'b' }],
          pseudo: 'focus',
          styles: { opacity: 0.5 },
        },
      ]);
      expect(r.pseudoReads).toBe(19);
      expect(warnedMembers()).toEqual([]);
    });

    it('applies a structural member and a chained attribute member beside an unsupported member', () => {
      const r = compile(
        '&:first-child:hover, &[x]:hover:not(:disabled), .a > .b { opacity: 0.5; }'
      );
      expect(r.conditional.map(entry => entry.type)).toEqual(['nthChild', 'attr']);
      expect(warnedMembers()).toEqual(['.a > .b']);
    });

    it('names each unsupported member in its own warning and drops a list of only those', () => {
      const r = compile('& .a, &:unknown, & .b { opacity: 0.5; }');
      expect(r.conditional).toEqual([]);
      expect(warnedMembers()).toEqual(['& .a', '&:unknown', '& .b']);
    });

    it('skips an unsupported member inside an at-rule without a warning', () => {
      const r = compile('@media (min-width: 400px) { &:hover, & .icon { opacity: 0.5; } }');
      expect(r.conditional).toEqual([
        {
          type: 'media',
          condition: '(min-width: 400px)',
          pseudo: 'hover',
          styles: { opacity: 0.5 },
        },
      ]);
      expect(warnedMembers()).toEqual([]);
    });
  });

  describe('nested pseudos inside at-rules', () => {
    it('tags nested pseudo bucket with both the outer condition AND the pseudo', () => {
      const r = compile(`
        @media (min-width: 400px) {
          &:hover { color: blue; }
        }
      `);
      expect(r.conditional[0]).toEqual({
        type: 'media',
        condition: '(min-width: 400px)',
        pseudo: 'hover',
        styles: { color: 'blue' },
      });
    });

    it('preserves containerName on composite pseudo buckets', () => {
      const r = compile(`
        @container card (min-width: 300px) {
          &:active { opacity: 0.5; }
        }
      `);
      expect(r.conditional[0]).toEqual({
        type: 'container',
        condition: '(min-width: 300px)',
        containerName: 'card',
        pseudo: 'pressed',
        styles: { opacity: 0.5 },
      });
    });

    it('emits both a plain at-rule bucket AND a composite pseudo bucket when both are present', () => {
      const r = compile(`
        @media (min-width: 400px) {
          padding: 8px;
          &:hover { color: blue; }
        }
      `);
      expect(r.conditional).toHaveLength(2);
      expect(r.conditional[0]).toEqual({
        type: 'media',
        condition: '(min-width: 400px)',
        // v7 transform: single-value shorthand emits the bare scalar,
        // matching RN's native acceptance of `padding: number`.
        styles: { padding: 8 },
      });
      expect(r.conditional[1]).toEqual({
        type: 'media',
        condition: '(min-width: 400px)',
        pseudo: 'hover',
        styles: { color: 'blue' },
      });
    });
  });

  describe('@keyframes collection', () => {
    it('collects keyframe frames with transformed declarations keyed by camelCase prop', () => {
      const r = compile(`
        @keyframes fade {
          0% { opacity: 0; }
          50%, 75% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `);
      expect(r.keyframes).toEqual([
        {
          name: 'fade',
          frames: [
            { stops: ['0%'], decls: { opacity: 0 } },
            { stops: ['50%', '75%'], decls: { opacity: 0.5 } },
            { stops: ['100%'], decls: { opacity: 1 } },
          ],
        },
      ]);
    });

    it('omits per-frame easing on end-only 100% / to frames (CSS Animations 1 §3.1)', () => {
      const r = compile(`
        @keyframes k {
          0% { opacity: 0; animation-timing-function: linear; }
          100% { opacity: 1; animation-timing-function: ease-in; }
        }
      `);
      expect(r.keyframes[0].frames[0].easing).toEqual({ kind: 'linear' });
      expect(r.keyframes[0].frames[1].easing).toBeUndefined();
      const r2 = compile(`
        @keyframes k2 {
          from { opacity: 0; }
          to { opacity: 1; animation-timing-function: ease-in; }
        }
      `);
      expect(r2.keyframes[0].frames.find(f => f.stops.includes('to'))!.easing).toBeUndefined();
    });
  });

  describe('web-only at-rules', () => {
    it('warns and drops @font-face', () => {
      compile('@font-face { font-family: Foo; src: url(foo.woff); }');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@font-face'));
    });

    it('registers @property instead of warning (CSS Properties and Values API)', () => {
      // Previously warned as web-only; @property now registers the
      // custom property. Full spec coverage lives in
      // src/native/test/property-registration.test.tsx.
      compile('@property --foo { syntax: "<color>"; inherits: false; initial-value: red; }');
      expect(warnSpy).not.toHaveBeenCalled();
      expect(getCssPropertyRegistration('--foo')).toEqual({
        syntax: '<color>',
        inherits: false,
        initialValue: 'red',
      });
      resetCssPropertiesForTest();
    });

    it('warns and drops @page', () => {
      compile('@page { margin: 1cm; }');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@page'));
    });
  });

  describe('cache semantics', () => {
    it('returns identical object reference for identical input', () => {
      const a = compile('color: red;');
      const b = compile('color: red;');
      expect(a).toBe(b);
    });

    it('evicts cache when content hashes exceed LIMIT', () => {
      for (let i = 0; i < 220; i++) compile(`opacity: 0.${i};`);
      // Original entry may have been evicted;re-compile to confirm cache still functions.
      const a = compile('color: red;');
      const b = compile('color: red;');
      expect(a).toBe(b);
    });
  });

  describe('composite outputs', () => {
    it('handles base + media + container + pseudo together', () => {
      const r = compile(`
        color: red;
        padding-top: 8px;
        @media (min-width: 400px) {
          color: blue;
        }
        @container card (min-width: 300px) {
          padding-top: 16px;
        }
        &:hover {
          opacity: 0.8;
        }
      `);
      expect(r.base).toEqual({ color: 'red', paddingTop: 8 });
      expect(r.conditional.map(c => c.type)).toEqual(['media', 'container', 'pseudo']);
      expect(r.conditional[1]).toMatchObject({ containerName: 'card' });
    });
  });

  describe(':is() / :where() pseudo-enumeration polyfill', () => {
    // https://drafts.csswg.org/selectors-4/#the-is-pseudo
    // https://drafts.csswg.org/selectors-4/#the-where-pseudo
    it('fans out &:is(:hover, :focus) into two pseudo buckets with identical styles', () => {
      const r = compile(`
        &:is(:hover, :focus) {
          opacity: 0.8;
        }
      `);
      expect(r.conditional).toHaveLength(2);
      expect(r.conditional[0]).toMatchObject({ type: 'pseudo', condition: 'hover' });
      expect(r.conditional[1]).toMatchObject({ type: 'pseudo', condition: 'focus' });
      expect(r.conditional[0].styles).toEqual(r.conditional[1].styles);
    });

    it('&:where(:active, :disabled) expands the same way (zero specificity is a no-op on RN)', () => {
      const r = compile(`
        &:where(:active, :disabled) {
          opacity: 0.5;
        }
      `);
      expect(r.conditional.map(c => c.condition)).toEqual(['pressed', 'disabled']);
    });

    it('unsupported enumerated state inside :is() falls back to the dev warning + skip', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const r = compile(`
        &:is(:hover, :unknown-state) {
          opacity: 0.5;
        }
      `);
      expect(r.conditional).toHaveLength(0);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('top-level comma form &:focus, &:focus-visible fans out the same way', () => {
      const r = compile(`
        &:focus, &:focus-visible {
          opacity: 0.7;
        }
      `);
      expect(r.conditional).toHaveLength(2);
      expect(r.conditional[0]).toMatchObject({ type: 'pseudo', condition: 'focus' });
      expect(r.conditional[1]).toMatchObject({ type: 'pseudo', condition: 'focus' });
      expect(r.conditional[0].styles).toEqual(r.conditional[1].styles);
    });

    it('top-level comma fanout keeps the known pseudo and warns for a member that is not one', () => {
      const r = compile(`
        &:hover, .child {
          opacity: 0.5;
        }
      `);
      expect(r.conditional).toMatchObject([{ type: 'pseudo', condition: 'hover' }]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('(received: .child)'));
    });
  });

  describe('@starting-style capture', () => {
    it('captures @starting-style declarations into a separate bucket', () => {
      const r = compile(`
        opacity: 1;
        @starting-style {
          opacity: 0;
        }
      `);
      expect(r.base).toEqual({ opacity: 1 });
      expect(r.startingStyle).toEqual({ opacity: 0 });
    });

    it('omits the bucket when no @starting-style is present', () => {
      const r = compile(`opacity: 1;`);
      expect(r.startingStyle).toBeUndefined();
    });
  });

  describe('@keyframes with dynamic values', () => {
    it('extracts theme color placeholders from @keyframes frame decls into per-frame resolvers', () => {
      const r = compile(
        '@keyframes fade { 0% { color: red; } 100% { color: \0sc:colors.end:blue; } }'
      );
      expect(r.keyframes.length).toBe(1);
      const kf = r.keyframes[0];
      expect(kf.name).toBe('fade');
      expect(kf.frames.length).toBe(2);
      // 0% frame is fully static
      expect(kf.frames[0].stops).toEqual(['0%']);
      expect(kf.frames[0].decls).toEqual({ color: 'red' });
      expect(kf.frames[0].resolvers).toBeUndefined();
      // 100% frame has a sentinel that landed in resolvers
      expect(kf.frames[1].stops).toEqual(['100%']);
      expect(kf.frames[1].decls).toEqual({});
      expect(kf.frames[1].resolvers).toBeDefined();
      expect(kf.frames[1].resolvers!.length).toBe(1);
      expect(kf.frames[1].resolvers![0][0]).toBe('color');
    });

    it('extracts viewport-unit values from @keyframes frame decls into resolvers', () => {
      const r = compile('@keyframes slide { 0% { width: 0; } 100% { width: 50vw; } }');
      const kf = r.keyframes[0];
      expect(kf.frames[1].decls).toEqual({});
      expect(kf.frames[1].resolvers).toBeDefined();
      expect(kf.frames[1].resolvers![0][0]).toBe('width');
    });

    it('keeps fully-static @keyframes frames unchanged', () => {
      const r = compile('@keyframes pulse { 0% { opacity: 0.4; } 100% { opacity: 1; } }');
      const kf = r.keyframes[0];
      expect(kf.frames[0].decls).toEqual({ opacity: 0.4 });
      expect(kf.frames[0].resolvers).toBeUndefined();
      expect(kf.frames[1].decls).toEqual({ opacity: 1 });
      expect(kf.frames[1].resolvers).toBeUndefined();
    });
  });

  // https://drafts.csswg.org/css-animations-1/#animation-definition
  describe('animation descriptor extraction (CSS Animations 1 §4 coordinating lists)', () => {
    // "These list-valued properties, which are all longhands of the animation shorthand,
    // form a coordinating list property group with animation-name as the coordinating list base property
    // and each item in the coordinated value list defining the properties of a single animation effect."
    it('cycles a shorter animation-delay list to match animation-name length', () => {
      const r = compile('animation: a 1s, b 2s; animation-delay: 80ms;');
      expect(r.animations).toHaveLength(2);
      expect(r.animations![0].delayMs).toBe(80);
      expect(r.animations![1].delayMs).toBe(80);
    });

    it('pairs animation-timing-function list items with animation-name when lengths match', () => {
      const r = compile('animation: a 1s, b 1s; animation-timing-function: ease-in, ease-out;');
      expect(r.animations).toHaveLength(2);
      expect(r.animations![0].timingFunction).toEqual({
        kind: 'cubic-bezier',
        p: [0.42, 0, 1, 1],
      });
      expect(r.animations![1].timingFunction).toEqual({
        kind: 'cubic-bezier',
        p: [0, 0, 0.58, 1],
      });
    });

    it('repeats a shorter animation-timing-function list to match animation-name length', () => {
      const r = compile(
        'animation: a 1s, b 1s, c 1s; animation-timing-function: linear, steps(2, jump-end);'
      );
      expect(r.animations).toHaveLength(3);
      expect(r.animations![0].timingFunction).toEqual({ kind: 'linear' });
      expect(r.animations![1].timingFunction).toEqual({
        kind: 'steps',
        n: 2,
        jump: 'jump-end',
      });
      expect(r.animations![2].timingFunction).toEqual({ kind: 'linear' });
    });

    it('pairs animation-composition list items with animation-name when lengths match', () => {
      const r = compile(
        'animation-name: a, b; animation-duration: 1s, 1s; animation-composition: add, accumulate;'
      );
      expect(r.animations).toHaveLength(2);
      expect(r.animations![0].composition).toBe('add');
      expect(r.animations![1].composition).toBe('accumulate');
    });
  });

  describe('@starting-style with dynamic values', () => {
    it('extracts theme color placeholders from @starting-style into resolvers', () => {
      const r = compile('@starting-style { color: \0sc:colors.start:red; }');
      // The static portion of starting-style strips out resolver-bearing
      // values; the resolvers go into startingStyleResolvers.
      expect(r.startingStyle).toEqual({});
      expect(r.startingStyleResolvers).toBeDefined();
      expect(r.startingStyleResolvers!.length).toBe(1);
      expect(r.startingStyleResolvers![0][0]).toBe('color');
    });

    it('keeps fully-static @starting-style declarations on the static side', () => {
      const r = compile('@starting-style { opacity: 0; }');
      expect(r.startingStyle).toEqual({ opacity: 0 });
      expect(r.startingStyleResolvers).toBeUndefined();
    });

    it('extracts viewport-unit values from @starting-style into resolvers', () => {
      const r = compile('@starting-style { width: 50vw; }');
      expect(r.startingStyle).toEqual({});
      expect(r.startingStyleResolvers).toBeDefined();
      expect(r.startingStyleResolvers![0][0]).toBe('width');
    });
  });

  // CSS Cascade 5, "The cascaded value represents the result of the cascade: it is the
  // declared value that wins the cascade (is sorted first in the output of the cascade)."
  // A declaration of font-size, line-height or direction can win from any layer the
  // compiler keeps (base, bucket, `!important`, `var()` deferral, resolver), so each of them
  // must turn the render path's cascade walk on. A declaration only an animation reads
  // (keyframes, a transition list, `@starting-style`) never wins the cascade, so it does not.
  describe('declared-key scan', () => {
    test.each([
      ['font-size', 'font-size: 20px;'],
      ['line-height', 'line-height: 20px;'],
      ['direction', 'direction: rtl;'],
      ['the font shorthand', 'font: 12px/16px serif;'],
      ['a resolver font-size', 'font-size: 2rem;'],
      ['an @media bucket', '@media (min-width: 1px) { font-size: 20px; }'],
      ['a pseudo-state bucket', '&:active { font-size: 20px; }'],
      ['an !important font-size', 'font-size: 20px !important;'],
      [
        'an !important font-size inside @media',
        '@media (min-width: 1px) { font-size: 20px !important; }',
      ],
      ['an !important resolver font-size', 'font-size: 2rem !important;'],
      ['var() on font-size', 'font-size: var(--s);'],
      ['var() on line-height', 'line-height: var(--l);'],
      ['var() on direction', 'direction: var(--d);'],
      ['var() on the font shorthand', 'font: var(--f);'],
      ['var() inside @media', '@media (min-width: 1px) { font-size: var(--s); }'],
    ])('publishesCascade is true for %s', (_name, css) => {
      expect(compile(css).publishesCascade).toBe(true);
    });

    test.each([
      ['keyframes alone', '@keyframes grow { from { font-size: 10px; } to { font-size: 20px; } }'],
      ['@starting-style alone', '@starting-style { font-size: 20px; }'],
      ['a font-size transition alone', 'transition: font-size 1s;'],
      ['a custom property named like the key', '--font-size: 20px;'],
      ['var() on an unrelated property', 'color: var(--x);'],
      ['no declarations', 'color: red;'],
    ])('publishesCascade is false for %s', (_name, css) => {
      expect(compile(css).publishesCascade).toBe(false);
    });
  });

  describe('a special-case declaration inside a conditional rule', () => {
    const SOURCE = 'line-clamp / text-wrap: nowrap';

    test.each([
      ['&:active { line-clamp: 2; }', ':active'],
      ['&:not(:read-only) { line-clamp: 2; }', ':not(:read-only)'],
      ['&:read-write { line-clamp: 2; }', ':read-write'],
      ['&:active:not(:disabled) { line-clamp: 2; }', ':active:not(:disabled)'],
      ['&[data-on]:hover { line-clamp: 2; }', '[data-on]:hover'],
      ['&:not([data-on]):hover { line-clamp: 2; }', ':not([data-on]):hover'],
      ['&[data-on] { line-clamp: 2; }', '[data-on]'],
      ['&[data-on^="a" i]:hover { line-clamp: 2; }', '[data-on^="a" i]:hover'],
      ['&:not([data-on]) { line-clamp: 2; }', ':not([data-on])'],
      [
        '@media (min-width: 0px) { &[data-on]:hover { line-clamp: 2; } }',
        '@media (min-width: 0px) [data-on]:hover',
      ],
      ['@media (min-width: 0px) { line-clamp: 2; }', '@media (min-width: 0px)'],
      [
        '@media (min-width: 0px) { &:not(:active) { line-clamp: 2; } }',
        '@media (min-width: 0px) :not(:active)',
      ],
      ['&:first-child { line-clamp: 2; }', ':first-child'],
      ['&:last-of-type { line-clamp: 2; }', ':last-of-type'],
      ['&:only-child { line-clamp: 2; }', ':only-child'],
      ['&:nth-child(2n+1) { line-clamp: 2; }', ':nth-child(2n+1)'],
      ['&:nth-last-child(-n+3):hover { line-clamp: 2; }', ':nth-last-child(-n+3):hover'],
      ['&:nth-of-type(3) { line-clamp: 2; }', ':nth-of-type(3)'],
      ['&:nth-child(2n of [data-on]) { line-clamp: 2; }', ':nth-child(2n of [data-on])'],
      ['&:has([data-on]) { line-clamp: 2; }', ':has([data-on])'],
      ['&:has(.sc-abc) { line-clamp: 2; }', ':has(.sc-abc)'],
      ['.sc-abc & { line-clamp: 2; }', '.sc-abc &'],
      ['.sc-abc > &:active { line-clamp: 2; }', '.sc-abc > &:active'],
      ['.sc-abc + & { line-clamp: 2; }', '.sc-abc + &'],
      ['.sc-abc ~ & { line-clamp: 2; }', '.sc-abc ~ &'],
    ])('names %s as `%s` in the warning and drops the declaration', (css, described) => {
      const compiled = compile(css);
      expect(compiled.conditional.filter(entry => 'numberOfLines' in entry.styles)).toEqual([]);
      expect(warnSpy.mock.calls.map(call => String(call[0]))).toEqual([
        '[sc] `' +
          SOURCE +
          '` is not supported inside `' +
          described +
          '` on React Native. Move `' +
          SOURCE +
          '` to the top level of your styled component.',
      ]);
    });
  });

  describe('rawCSS parse hardening (interpolation-sentinel gate)', () => {
    // `toNativeStyles(rawCSS)` is the static-input parse path; it's reachable
    // from the `NativeStyle.compile` fallback after a fast-path bail, where
    // the `rawCSS` is `buildHashCSS`'s output (template strings + filled
    // user values verbatim). Sentinel detection in `parse()` is gated on
    // `options.templates`, so user-supplied values that happen to contain
    // `\0I<n>\0` / `\0J<n>\0` byte patterns cannot lift to a TemplateValue
    // / Interpolation node and crash downstream string-only consumers.

    it('treats `\\0I<n>\\0` in a value as opaque text (no TemplateValue lift)', () => {
      const r = compile('color: red\0I0\0blue;');
      expect(r.base).toEqual({ color: 'red\0I0\0blue' });
    });

    it('treats `\\0J<n>\\0` inside a value as opaque text (no Interpolation node)', () => {
      // With the gate closed, the J-marker doesn't trigger the standalone-
      // sentinel fast dispatch. The bytes ride inside the value string.
      // Critical: NO TemplateValue lift and NO Interpolation node;
      // downstream consumers (transformDecl, the StyleSheet writer) see a
      // plain string field exactly as they expect.
      const r = compile('color: red\0J0\0blue;');
      expect(r.base).toEqual({ color: 'red\0J0\0blue' });
    });
  });
});
