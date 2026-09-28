import React from 'react';
import css from '../constructors/css';
import Keyframes from '../models/Keyframes';
import StyleSheet from '../sheet';
import createCompiler from '../utils/compiler';
import { resetWarnOnce } from '../utils/warnOnce';
import { NodeKind } from './ast';
import { compileWeb, fillSource } from './compile';
import { parseSource } from './source';

const compiler = createCompiler();

const tagged = (strings: ReadonlyArray<string>, ...interps: unknown[]) =>
  parseSource(strings, interps);

/**
 * Compare the construction-time AST path against `compiler.compile()` on a
 * pre-resolved CSS string. The string represents what a fully-resolved
 * (post-substitution) CSS body looks like before going through the parser;
 * AST-direct emit on the same logical input must produce byte-equivalent
 * output for hash + SSR rehydration stability.
 */
function legacy(rawCSS: string, componentId = 'a'): string[] {
  return compiler.compile(rawCSS, `.${componentId}`, undefined, componentId);
}

describe('compileWeb', () => {
  describe('static templates (no interpolations)', () => {
    it('matches the legacy path on a simple decl', () => {
      const src = parseSource(['color: red;'], []);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red;')
      );
    });

    it('matches the legacy path on multiple decls', () => {
      const src = parseSource(['color: red; background: blue; padding: 8px;'], []);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; background: blue; padding: 8px;')
      );
    });

    it('matches the legacy path on a nested rule', () => {
      const css = 'color: red; &:hover { color: blue; }';
      const src = parseSource([css], []);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy(css)
      );
    });

    it('matches the legacy path on a media query', () => {
      const css = 'color: red; @media (min-width: 600px) { color: blue; }';
      const src = parseSource([css], []);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy(css)
      );
    });

    it('matches the legacy path on keyframes', () => {
      const css = '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }';
      const src = parseSource([css], []);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy(css)
      );
    });
  });

  describe('value-position interpolations', () => {
    it('substitutes a string interpolation', () => {
      const src = tagged`color: ${'red'};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red;')
      );
    });

    it('substitutes a number interpolation', () => {
      const src = tagged`padding: ${10}px;`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('padding: 10px;')
      );
    });

    it('substitutes a function interpolation that returns a string', () => {
      const src = tagged`color: ${(p: { fg: string }) => p.fg};`;
      const ctx = { fg: 'tomato' };
      expect(compileWeb(src, ctx, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: tomato;')
      );
    });

    it('coerces falsy interpolations to empty', () => {
      const src = tagged`color: red${false};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red;')
      );
    });

    it('calls a custom toString() on a plain-object interpolation (#5740)', () => {
      // Design-token shape: an object whose own-property `toString` returns
      // the canonical resolved value while siblings are alternates. Before
      // this fix the object reached `objectToCSS`, which iterated every
      // key as a CSS declaration and produced broken output.
      const token = {
        default: '#000000',
        subtle: '#aaaaaa',
        toString() {
          return '#000000';
        },
      };
      const src = tagged`color: ${token};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: #000000;')
      );
    });
  });

  // Multi-slot decl-value patterns. These are the ones that previously
  // misclassified the trailing slot as a standalone block-level
  // interpolation and emitted the literal `J<n>` sentinel into CSS.
  describe('multi-slot value shorthands round-trip via the fast path', () => {
    const id = '.a';
    const opts = { selfRefSelector: '.a', componentId: 'a' };

    it('padding 2-value', () => {
      const src = tagged`padding: ${'8px'} ${'16px'};`;
      const out = compileWeb(src, {}, id, opts);
      expect(out).toEqual(legacy('padding: 8px 16px;'));
      expect(out!.join('')).not.toMatch(/\0/);
    });

    it('padding 4-value', () => {
      const src = tagged`padding: ${'1px'} ${'2px'} ${'3px'} ${'4px'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('padding: 1px 2px 3px 4px;'));
    });

    it('border shorthand width-style-color', () => {
      const src = tagged`border: ${'1px'} solid ${'#000'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('border: 1px solid #000;'));
    });

    it('box-shadow x-y-blur-color', () => {
      const src = tagged`box-shadow: ${'0'} ${'2px'} ${'4px'} ${'rgba(0,0,0,0.1)'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('box-shadow: 0 2px 4px rgba(0,0,0,0.1);')
      );
    });

    it('multi-shadow comma-separated', () => {
      const src = tagged`box-shadow: ${'0'} ${'1px'} ${'2px'} ${'red'}, ${'0'} ${'4px'} ${'8px'} ${'blue'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('box-shadow: 0 1px 2px red, 0 4px 8px blue;')
      );
    });

    it('transition shorthand', () => {
      const src = tagged`transition: ${'opacity'} ${'200ms'} ${'ease-in'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('transition: opacity 200ms ease-in;'));
    });

    it('animation shorthand', () => {
      const src = tagged`animation: ${'fadeIn'} ${'1s'} ${'ease-out'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('animation: fadeIn 1s ease-out;'));
    });

    it('font shorthand with slash', () => {
      const src = tagged`font: ${'14px'}/${'1.4'} ${'system-ui'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('font: 14px/1.4 system-ui;'));
    });

    it('grid-template with slash', () => {
      const src = tagged`grid-template: ${'auto 1fr'} / ${'1fr 2fr'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('grid-template: auto 1fr / 1fr 2fr;'));
    });

    it('background shorthand', () => {
      const src = tagged`background: ${'#fff'} ${'url(/x.png)'} ${'center'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('background: #fff url(/x.png) center;'));
    });

    it('transform with multiple function calls', () => {
      const src = tagged`transform: translate(${'10px'}, ${'20px'}) rotate(${'45deg'});`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('transform: translate(10px, 20px) rotate(45deg);')
      );
    });

    it('calc with two operand slots', () => {
      const src = tagged`width: calc(${'100%'} - ${'2rem'});`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('width: calc(100% - 2rem);'));
    });

    it('clamp with three slots', () => {
      const src = tagged`font-size: clamp(${'14px'}, ${'2vw'}, ${'24px'});`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('font-size: clamp(14px, 2vw, 24px);'));
    });

    it('linear-gradient with direction and color stops', () => {
      const src = tagged`background: linear-gradient(${'to right'}, ${'red'}, ${'blue'});`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('background: linear-gradient(to right, red, blue);')
      );
    });

    it('color-mix with alpha-modulated arms', () => {
      const src = tagged`color: color-mix(in srgb, ${'red'} 50%, ${'blue'});`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('color: color-mix(in srgb, red 50%, blue);')
      );
    });

    it('two consecutive multi-slot decls', () => {
      const src = tagged`padding: ${'8px'} ${'16px'}; margin: ${'4px'} ${'8px'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('padding: 8px 16px; margin: 4px 8px;'));
    });

    it('nested rule with multi-slot value inside', () => {
      const src = tagged`& > .child { padding: ${'4px'} ${'8px'}; }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('& > .child { padding: 4px 8px; }'));
    });

    it('@media query with multi-slot value inside', () => {
      const src = tagged`@media (min-width: 600px) { padding: ${'8px'} ${'16px'}; }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('@media (min-width: 600px) { padding: 8px 16px; }')
      );
    });

    it('function-returning interpolations resolve identically', () => {
      const src = tagged`padding: ${() => '8px'} ${() => '16px'};`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('padding: 8px 16px;'));
    });
  });

  describe('selector-position interpolations', () => {
    it('substitutes a styled-component class selector', () => {
      // The compiler resolves `${OtherComp}` to its class name string at fill time.
      // We mimic that here by passing the resolved class string as the slot.
      const src = tagged`${'.x'} & { color: red; }`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('.x & { color: red; }')
      );
    });

    it('substitutes inside attribute selectors', () => {
      const src = tagged`&[${'aria-pressed'}='true'] { color: red; }`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy(`&[aria-pressed='true'] { color: red; }`)
      );
    });
  });

  describe('keyframes refs in value position', () => {
    it('substitutes the keyframe name and registers into the sheet', () => {
      const sheet = new StyleSheet();
      const kf = new Keyframes(
        'fade',
        '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }'
      );
      const src = tagged`animation-name: ${kf};`;
      const out = compileWeb(
        src,
        {},
        '.a',
        { selfRefSelector: '.a', componentId: 'a' },
        sheet,
        compiler
      );
      // Expected: same output as compiling the resolved keyframe-name string
      // directly through the compiler. Resolve the name first so the test
      // doesn't depend on the compiler hash bit-for-bit.
      const resolvedName = kf.getName(compiler);
      const expected = compiler.compile(`animation-name: ${resolvedName};`, '.a', undefined, 'a');
      expect(out).toEqual(expected);
      // Keyframe rules registered with the active compiler hash.
      expect(sheet.hasNameForId(kf.id, resolvedName)).toBe(true);
    });

    it('substitutes the main compiler name when no compiler is supplied', () => {
      const kf = new Keyframes('fade', '@keyframes fade {}');
      const src = tagged`animation-name: ${kf};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('animation-name: fade;')
      );
    });

    it('substitutes a function-returning keyframes ref', () => {
      const sheet = new StyleSheet();
      const kf = new Keyframes('spin', '@keyframes spin { to { transform: rotate(360deg); } }');
      const src = tagged`animation-name: ${() => kf};`;
      const out = compileWeb(
        src,
        {},
        '.a',
        { selfRefSelector: '.a', componentId: 'a' },
        sheet,
        compiler
      );
      const resolvedName = kf.getName(compiler);
      const expected = compiler.compile(`animation-name: ${resolvedName};`, '.a', undefined, 'a');
      expect(out).toEqual(expected);
    });
  });

  /**
   * A templated at-rule name resolves at fill time: the realized name must be
   * an identifier, and a keyframes name turns the block into a @keyframes rule.
   */
  describe('templated at-rule and keyframes names', () => {
    const id = '.a';
    const opts = { selfRefSelector: '.a', componentId: 'a' };
    let warn: jest.SpyInstance;

    beforeEach(() => {
      resetWarnOnce();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    const warnings = () => warn.mock.calls.map(call => String(call[0]));

    it('resolves a templated at-rule name', () => {
      const src = tagged`@${'media'} (min-width: 600px) { padding: 8px; }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('@media (min-width: 600px) { padding: 8px; }')
      );
    });

    it('reads a templated vendor-prefixed keyframes name as @keyframes', () => {
      const src = tagged`@${'-webkit-'}keyframes anim { from { opacity: 0; } to { opacity: 1; } }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('@-webkit-keyframes anim { from { opacity: 0; } to { opacity: 1; } }')
      );
    });

    it('drops the at-rule when the realized name is not an identifier, with a dev warning', () => {
      const src = tagged`color: blue; @${'media x'} (min-width: 600px) { padding: 8px; }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('color: blue;'));
      expect(warnings()).toEqual([expect.stringContaining('`@media x`')]);
    });

    it('resolves a templated keyframes name in the prelude', () => {
      const src = tagged`@keyframes ${'spin'} { from { opacity: 0; } to { opacity: 1; } }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('@keyframes spin { from { opacity: 0; } to { opacity: 1; } }')
      );
    });

    it('drops @keyframes whose templated name is not an identifier, with a dev warning', () => {
      const src = tagged`color: blue; @keyframes ${'a b'} { to { opacity: 1; } }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(legacy('color: blue;'));
      expect(warnings()).toEqual([expect.stringContaining('`a b`')]);
    });

    // CSS Syntax 3 §4.2 Definitions: "ident-start code point: A letter, a
    // non-ASCII ident code point, or U+005F LOW LINE (_)." "ident code point:
    // An ident-start code point, a digit, or U+002D HYPHEN-MINUS (-)."
    // Deviation: the draft limits "non-ASCII ident code point" to listed
    // ranges ("changed to be consistent with HTML's valid custom element
    // names"); a templated name accepts every code point at or above U+0080.
    it.each([['fadé'], ['愛'], ['_x-1'], ['--x'], ['-x']])(
      'resolves the templated keyframes name `%s`',
      name => {
        const src = tagged`@keyframes ${name} { to { opacity: 1; } }`;
        expect(compileWeb(src, {}, id, opts)).toEqual([`@keyframes ${name}{to{opacity:1;}}`]);
        expect(warnings()).toEqual([]);
      }
    );

    it('resolves a templated at-rule name holding a non-ASCII character', () => {
      const src = tagged`@${'x-é'} y;`;
      expect(compileWeb(src, {}, id, opts)).toEqual(['@x-é y;']);
    });

    it.each([['1a'], ['-1a'], ['-'], ['a\\62'], ['a.b'], ['']])(
      'drops @keyframes whose templated name `%s` is not an identifier',
      name => {
        const src = tagged`color: blue; @keyframes ${name} { to { opacity: 1; } }`;
        expect(compileWeb(src, {}, id, opts)).toEqual(legacy('color: blue;'));
      }
    );
  });

  describe('styled-component refs', () => {
    // Synthetic styled-component shape: the fast path checks for the
    // `styledComponentId` field, which is the v6+ public brand on every
    // styled component (typeof === 'function' in React 19).
    const makeFakeComponent = (id: string) => {
      const fn = function FakeComponent() {} as unknown as { styledComponentId: string };
      fn.styledComponentId = id;
      return fn;
    };

    it('substitutes the class selector in value position', () => {
      const Other = makeFakeComponent('sc-other');
      const src = tagged`color: ${Other};`;
      // Pre-classified at parseSource as `.sc-other` Static value, so the
      // emitter walks a fully-static template.
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: .sc-other;')
      );
    });

    it('substitutes the class selector in selector position', () => {
      const Other = makeFakeComponent('sc-other');
      const src = tagged`${Other} & { color: red; }`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('.sc-other & { color: red; }')
      );
    });

    it('substitutes a function-returning styled-component', () => {
      const Other = makeFakeComponent('sc-other');
      const src = tagged`${() => Other} & { color: red; }`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('.sc-other & { color: red; }')
      );
    });
  });

  describe('css`` fragment splicing', () => {
    it('splices a static mixin at block position', () => {
      const mixin = css`
        background: blue;
        padding: 4px;
      `;
      const src = parseSource(['color: red;\n', '\nmargin: 0;'], [mixin]);
      const out = compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' });
      expect(out).toEqual(legacy('color: red; background: blue; padding: 4px; margin: 0;'));
    });

    it('splices a dynamic mixin via function-returning-fragment', () => {
      const dark = css`
        background: black;
        color: white;
      `;
      const light = css`
        background: white;
        color: black;
      `;
      const src = parseSource(['', ''], [(p: { dark?: boolean }) => (p.dark ? dark : light)]);
      expect(
        compileWeb(src, { dark: true }, '.a', { selfRefSelector: '.a', componentId: 'a' })
      ).toEqual(legacy('background: black; color: white;'));
      expect(
        compileWeb(src, { dark: false }, '.a', { selfRefSelector: '.a', componentId: 'a' })
      ).toEqual(legacy('background: white; color: black;'));
    });

    it('splices a conditional mixin (`condition && mixin`)', () => {
      const mixin = css`
        font-weight: bold;
      `;
      const src = parseSource(
        ['color: red;\n', '\nmargin: 0;'],
        [(p: { important?: boolean }) => p.important && mixin]
      );
      const present = compileWeb(src, { important: true }, '.a', {
        selfRefSelector: '.a',
        componentId: 'a',
      });
      const absent = compileWeb(src, { important: false }, '.a', {
        selfRefSelector: '.a',
        componentId: 'a',
      });
      expect(present).toEqual(legacy('color: red;\n font-weight: bold;\nmargin: 0;'));
      expect(absent).toEqual(legacy('color: red;\nmargin: 0;'));
    });

    it('splices nested mixins (mixin referencing another mixin)', () => {
      const inner = css`
        opacity: 0.5;
      `;
      const outer = css`
        font-weight: bold;
        ${inner}
        text-transform: uppercase;
      `;
      const src = parseSource(['color: red;\n', '\nmargin: 0;'], [outer]);
      const out = compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' });
      expect(out).toEqual(
        legacy(
          'color: red;\nfont-weight: bold; opacity: 0.5; text-transform: uppercase;\nmargin: 0;'
        )
      );
    });

    it('splices a mixin inside @media', () => {
      const mixin = css`
        font-size: 18px;
      `;
      const src = parseSource(['@media (min-width: 600px) {\n  ', '\n}'], [mixin]);
      const out = compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' });
      expect(out).toEqual(legacy('@media (min-width: 600px) {\n  font-size: 18px;\n}'));
    });

    it('stringifies an embedded mixin (animation value continuation)', () => {
      const sheet = new StyleSheet();
      const kf = new Keyframes(
        'fade',
        '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }'
      );
      const valueMixin = css`
        ${kf} 1s linear
      `;
      const src = parseSource(['animation: ', ';'], [valueMixin]);
      const out = compileWeb(
        src,
        {},
        '.a',
        { selfRefSelector: '.a', componentId: 'a' },
        sheet,
        compiler
      );
      const resolvedName = kf.getName(compiler);
      const expected = compiler.compile(
        `animation: ${resolvedName} 1s linear;`,
        '.a',
        undefined,
        'a'
      );
      expect(out).toEqual(expected);
    });

    it('terminates a prior decl when the user forgot `;` before a block-style fragment', () => {
      // Authored: `margin: 0 ${10}px ${css\`color: red\`};`. The user
      // forgot the `;` after the unit literal. The fragment has top-level
      // `;` so it's clearly a block; recovery promotes it to a sibling
      // declaration and injects `;` before its sentinel so `margin: 0
      // 10px` terminates cleanly instead of swallowing the fragment as
      // part of its value.
      const block = css`
        color: red;
      `;
      const src = parseSource(['margin: 0 ', 'px\n', ';'], [10, block]);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('margin: 0 10px; color: red;')
      );
    });

    it('terminates a prior decl when the user forgot `;` before a nested-rule fragment', () => {
      // The fragment carries `{`/`}` so it's unambiguously a rule block.
      const hover = css`
        &:hover {
          color: blue;
        }
      `;
      const src = parseSource(['color: red\n', ''], [hover]);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; &:hover { color: blue; }')
      );
    });

    it('reads a block fragment after a selector colon as selector text and drops the rule', () => {
      resetWarnOnce();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const src = tagged`color: green; &:hover ${css`color: red;`} { color: blue; }`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: green;')
      );
      expect(warn.mock.calls.map(call => String(call[0]))).toEqual([
        expect.stringContaining('rule `&:hover ${…}`'),
      ]);
      warn.mockRestore();
    });

    it('promotes both fragments when two block-style fragments are adjacent', () => {
      // Author wrote `${first}${second}` with no separator. Both source
      // strings carry top-level `;` so both must be standalone siblings;
      // the inherited `prevWasStandalone` flag carries through the empty
      // gap between them.
      const first = css`
        color: red;
      `;
      const second = css`
        background: blue;
      `;
      const src = parseSource(['', '', ''], [first, second]);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; background: blue;')
      );
    });

    it('does not crash on a fragment whose only top-level `;` lives inside a quoted string', () => {
      const frag = css`
        content: 'hi;there';
      `;
      const src = parseSource(['color: red\n', ''], [frag]);
      const out = compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' });
      // Either the legacy splice path produces the decl, or it bails to
      // the slow string path. Both flows are valid; the requirement is
      // no thrown exception and the literal quoted content preserved.
      if (out !== null) {
        expect(out.join('\n')).toMatch(/hi;there/);
      }
    });

    it('handles a fragment whose only braces live inside a comment', () => {
      const frag = css`
        /* {} */
        color: red;
      `;
      const src = parseSource(['', ''], [frag]);
      const out = compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' });
      expect(out).toEqual(legacy('color: red;'));
    });

    it('leaves a value-position fragment embedded when the prefix ends in `:`', () => {
      // `border: ${frag};` with a value-shaped fragment must NOT be
      // promoted to a sibling; the prefix's `:` is the value-position
      // signal that overrides the block-shape heuristic.
      const frag = css`
        1px solid red
      `;
      const src = parseSource(['border: ', ';'], [frag]);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('border: 1px solid red;')
      );
    });

    it('stringifies a ternary between two embedded-position multi-line fragments', () => {
      // Multi-line `css\`...\`` is the natural way users write fragments;
      // the template literal syntax forces leading/trailing whitespace into
      // the fragment's source strings. In mid-value position
      // (`animation: ${frag} linear`), that whitespace must be trimmed at
      // stringification time so the substituted output flows cleanly.
      const fast = css`
        spin1 1s
      `;
      const slow = css`
        spin2 2s
      `;
      const src = parseSource(
        ['animation: ', ' linear;'],
        [(p: { fast?: boolean }) => (p.fast ? fast : slow)]
      );
      expect(
        compileWeb(src, { fast: true }, '.a', { selfRefSelector: '.a', componentId: 'a' })
      ).toEqual(legacy('animation: spin1 1s linear;'));
      expect(
        compileWeb(src, { fast: false }, '.a', { selfRefSelector: '.a', componentId: 'a' })
      ).toEqual(legacy('animation: spin2 2s linear;'));
    });
  });

  /**
   * A Run of slots before the selector text of a rule is a Head. Each slot's
   * realized text is read front to back: everything through its last `;` or
   * `}` is spliced before the rule as statements, and what remains prefixes
   * the rule's selector (or, for a listed at-keyword, turns the rule into a
   * conditional group rule).
   */
  describe('rule heads', () => {
    const opts = { selfRefSelector: '.a', componentId: 'a' };
    const Other = Object.assign(function FakeComponent() {}, { styledComponentId: 'sc-other' });
    let warn: jest.SpyInstance;

    beforeEach(() => {
      resetWarnOnce();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    const warnings = () => warn.mock.calls.map(call => String(call[0]));

    it('prefixes the selector with a styled component returned by a function', () => {
      const src = tagged`${() => Other} h2 { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('.sc-other h2 { color: red; }'));
    });

    it('splices a function result ending in `;` before the rule', () => {
      const src = tagged`${() => 'opacity: 0.5;'} h2 { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('opacity: 0.5; h2 { color: red; }'));
      expect(warnings()).toEqual([]);
    });

    it('prefixes the selector with a declaration missing its `;`, with a dev warning', () => {
      const src = tagged`${() => 'opacity: 0.5'} h2 { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('opacity: 0.5 h2 { color: red; }'));
      expect(warnings()).toEqual([
        expect.stringContaining('`opacity: 0.5` is written before a nested rule'),
      ]);
    });

    it('applies the rule to its own selector text when the Head is empty', () => {
      const src = tagged`${() => ''} h2 { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('h2 { color: red; }'));
    });

    it('applies the block to the parent when the Head and the selector text are empty', () => {
      const src = tagged`color: blue; ${() => ''} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: blue; & { color: red; }'));
    });

    it('splices a block css fragment before the rule', () => {
      const frag = css`
        color: blue;
      `;
      const src = tagged`${frag} h2 { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: blue; h2 { color: red; }'));
    });

    it('reads a css fragment holding a selector as selector text', () => {
      const hover = css`
        ${Other}:hover
      `;
      const src = tagged`${hover} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('.sc-other:hover { color: red; }'));
    });

    it.each([
      ['a:hover'],
      ['&:hover'],
      ['LI:first-child'],
      ['my-el:hover'],
      ['input[type="text"]:focus'],
    ])('reads `%s` as selector text without a warning', selector => {
      const src = tagged`${() => selector} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy(`${selector} { color: red; }`));
      expect(warnings()).toEqual([]);
    });

    it('turns a static media query string into a conditional group rule', () => {
      const src = tagged`${'@media (min-width: 900px)'} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(
        legacy('@media (min-width: 900px) { color: red; }')
      );
    });

    it('turns a media query returned by a function into a conditional group rule', () => {
      const src = tagged`
        color: blue;
        ${() => '@media (min-width: 900px)'} {
          color: red;
        }
      `;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(
        legacy('color: blue; @media (min-width: 900px) { color: red; }')
      );
    });

    it('drops the rule for another at-keyword, with a dev warning', () => {
      const src = tagged`color: blue; ${'@import url(x)'} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: blue;'));
      expect(warnings()).toEqual([expect.stringContaining('@import')]);
    });

    it('splices statements and prefixes the selector with what follows them', () => {
      const src = tagged`${() => 'a: b; h1'} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('a: b; h1 { color: red; }'));
    });

    it('resolves stacked Head slots front to back', () => {
      const src = tagged`${() => 'color: blue;'} ${() => '.x'} ${() => '.y'} h2 { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(
        legacy('color: blue; .x .y h2 { color: red; }')
      );
    });

    it('resolves stacked Head slots ending in an at-rule remainder', () => {
      const src = tagged`${() => 'color: blue;'} ${() => ''} ${() => '@media (min-width: 1px)'} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(
        legacy('color: blue; @media (min-width: 1px) { color: red; }')
      );
    });

    it('splits the built selector on top-level commas', () => {
      const src = tagged`${() => '.x, .y'} h2 { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('.x, .y h2 { color: red; }'));
    });

    it('keeps a static styled component reference in the selector', () => {
      const src = tagged`${Other} & { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('.sc-other & { color: red; }'));
    });

    it('drops the rule for a client reference that cannot be resolved', () => {
      const clientRef = { $$typeof: Symbol.for('react.client.reference'), $$id: 'x#Child' };
      const src = tagged`color: blue; ${clientRef} h2 { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: blue;'));
    });
  });

  describe('block-level string interpolations', () => {
    it('splits an object value in a declaration into declarations at its `;`', () => {
      // The object converts to `raw:red;`; its `;` splits the realized
      // `color:raw:red;` into one declaration, `color` with `raw:red`.
      const src = tagged`color: ${{ raw: 'red' } as unknown};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
        '.a{color:raw:red;}',
      ]);
    });

    it('joins an array value in a declaration', () => {
      const src = tagged`color: ${['red', 'blue'] as unknown};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
        '.a{color:redblue;}',
      ]);
    });

    it('parses block-level string interpolations containing CSS structure (Phase D)', () => {
      // Fragments returning structural CSS go through `parseStringFragment`
      // (cached per-string) and splice the resulting nodes into the parent.
      const src = tagged`color: red; ${() => '&:hover { background: blue; }'} margin: 0;`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; &:hover { background: blue; } margin: 0;')
      );
    });

    it('parses block-level string interpolations with @media (Phase D)', () => {
      const src = tagged`color: red; ${() => '@media (min-width: 600px) { color: blue; }'}`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; @media (min-width: 600px) { color: blue; }')
      );
    });

    it('handles flat-decl block-level interpolations inline', () => {
      // Fragments with no `{` / `}` are pure declaration sequences. The fast
      // path parses just the fragment and splices the resulting Decls in as
      // siblings, eliminating the full string→AST round-trip.
      const src = tagged`color: red; ${() => 'background: blue;'} margin: 0;`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; background: blue; margin: 0;', 'a')
      );
    });
  });

  /**
   * A Standalone value, and the statements part of a Head, is a mixin: its
   * text is comment-stripped and parsed as CSS, with an at-rule name ending
   * at whitespace, `;`, `{`, `}`, or `(`.
   */
  describe('mixin text', () => {
    const opts = { selfRefSelector: '.a', componentId: 'a' };
    const out = (src: ReturnType<typeof tagged>) => compileWeb(src, {}, '.a', opts);

    it('strips comments from a Standalone string before parsing it', () => {
      const src = tagged`
        ${'color: red; /* } */ padding: 0;'}
        margin: 0;`;
      expect(out(src)).toEqual(['.a{color:red;padding:0;margin:0;}']);
    });

    it('strips comments from a Standalone string a function returns', () => {
      const src = tagged`
        ${() => 'color: red; /* { */ padding: 0;'}
        margin: 0;`;
      expect(out(src)).toEqual(['.a{color:red;padding:0;margin:0;}']);
    });

    it('drops a statement holding a stray `}` from a Standalone string, as in template text', () => {
      const src = tagged`
        ${'@x} y'}
        color: red;`;
      expect(out(src)).toEqual(['.a{color:red;}']);
      expect(compileWeb(tagged`@x} y; color: red;`, {}, '.a', opts)).toEqual(['.a{color:red;}']);
    });

    it('drops a statement holding a stray `}` from a Standalone string a function returns', () => {
      const src = tagged`
        ${() => 'a: b; @x} y'}
        color: red;`;
      expect(out(src)).toEqual(['.a{a:b;color:red;}']);
    });

    it('ends an at-rule name at `(` in a Standalone string', () => {
      const src = tagged`
        ${'@media(min-width: 1px) { color: blue; }'}
        color: red;`;
      expect(out(src)).toEqual(['.a{color:red;}', '@media (min-width: 1px){.a{color:blue;}}']);
    });

    it('drops an at-rule with an empty name from the statements part of a Head', () => {
      const src = tagged`${'@};'} & { color: red; }`;
      expect(out(src)).toEqual(['.a{color:red;}']);
    });

    it('drops an at-rule with an empty name from a Standalone string', () => {
      const src = tagged`
        ${'@(x);'}
        color: red;`;
      expect(out(src)).toEqual(['.a{color:red;}']);
    });
  });

  /**
   * Every Inside, Glued, Property, and Head-remainder value is read with CSS
   * Syntax 3 tokenization from the state at its position in the template. A
   * failing value drops its enclosing declaration, rule, at-rule, or frame;
   * the rest of the component renders.
   */
  describe('value checks (CSS Syntax 3 tokenization)', () => {
    const opts = { selfRefSelector: '.a', componentId: 'a' };
    let warn: jest.SpyInstance;

    beforeEach(() => {
      resetWarnOnce();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    const warnings = () => warn.mock.calls.map(call => String(call[0]));
    const out = (src: ReturnType<typeof tagged>) => compileWeb(src, {}, '.a', opts);

    it.each([
      ['a closing brace', 'red } body { background: red'],
      ['an opening brace', 'red { x'],
      ['a closing brace inside a string', '"}"'],
      ['an opening brace inside a comment', '/* { */ red'],
    ])('drops the declaration for %s, with a dev warning', (_, value) => {
      const src = tagged`color: ${value}; margin: 0;`;
      expect(out(src)).toEqual(legacy('margin: 0;'));
      expect(warnings()).toEqual([expect.stringContaining('`color`')]);
    });

    it.each([
      ['an unclosed string', '"abc'],
      ['an unclosed parenthesis', 'calc(1px'],
      ['a parenthesis it did not open', '1px) , x'],
      ['a bracket it did not open', 'a ] b'],
      ['an unclosed bracket', '[a'],
      ['an unclosed comment', 'red /* x'],
      ['a trailing backslash', 'red\\'],
    ])('drops the declaration for %s', (_, value) => {
      const src = tagged`color: ${value}; margin: 0;`;
      expect(out(src)).toEqual(legacy('margin: 0;'));
    });

    // CSS Syntax 3 §4.3.8 Check if two code points are a valid escape: "If the
    // first code point is not U+005C REVERSE SOLIDUS (\), return false.
    // Otherwise, if the second code point is a newline, return false.
    // Otherwise, return true." Substituted text is trimmed, so a backslash
    // left before trimmed whitespace escapes whatever the template writes next.
    describe('a value ending in an escaping backslash before whitespace', () => {
      it.each([
        ['a space', 'x\\ '],
        ['a tab', 'x\\\t'],
        ['a newline', 'x\\\n'],
        ['a space after an escaped backslash pair', 'x\\\\\\ '],
      ])('drops the declaration for %s', (_, value) => {
        const src = tagged`color: ${value}; padding: 0;`;
        expect(out(src)).toEqual(legacy('padding: 0;'));
        expect(warnings()).toEqual([expect.stringContaining('`color`')]);
      });

      it('keeps a value ending in an escaped backslash before whitespace', () => {
        const src = tagged`content: ${'x\\\\ '}; padding: 0;`;
        expect(out(src)).toEqual(['.a{content:x\\\\;padding:0;}']);
      });

      it('drops the declaration for a property value', () => {
        const src = tagged`${'x\\ '}: red; padding: 0;`;
        expect(out(src)).toEqual(legacy('padding: 0;'));
      });

      it.each([
        ['an Inside selector value', tagged`color: blue; & ${'x\\ '} { color: red; }`],
        ['a Glued selector value', tagged`color: blue; ${'x\\ '}:hover { color: red; }`],
        ['a later Head slot', tagged`color: blue; ${() => 'p'} ${'x\\ '} { color: red; }`],
        ['an at-rule prelude', tagged`color: blue; @media ${'x\\\n'} { color: red; }`],
        ['a statement at-rule prelude', tagged`color: blue; @import ${'url(a.css) x\\\n'};`],
      ])('drops the rule for %s', (_, src) => {
        expect(out(src)).toEqual(legacy('color: blue;'));
      });

      it.each([
        ['an Inside selector value', tagged`color: blue; & ${'x\\ ,'} { color: red; }`],
        [
          'an Inside selector value with a tab',
          tagged`color: blue; & ${'x\\\t, y'} { color: red; }`,
        ],
        ['a Head value', tagged`color: blue; ${() => 'x\\ , y'} { color: red; }`],
      ])('drops the rule when a comma split leaves a part ending in an escape: %s', (_, src) => {
        expect(out(src)).toEqual(legacy('color: blue;'));
      });

      it.each([
        ['a stop Head', tagged`@keyframes k { ${'\\\t,, '} { opacity: 0; } to { opacity: 1; } }`],
        [
          'an Inside stop',
          tagged`@keyframes k { from, ${'x\\ '} { opacity: 0; } to { opacity: 1; } }`,
        ],
        [
          'an Inside stop split by a comma',
          tagged`@keyframes k { from, ${'x\\ , 50%'} { opacity: 0; } to { opacity: 1; } }`,
        ],
      ])('drops the frame for %s', (_, src) => {
        expect(out(src)).toEqual(['@keyframes k{to{opacity:1;}}']);
      });
    });

    // CSS Syntax 3 §4.3.5 Consume a string token: "U+005C REVERSE SOLIDUS (\):
    // If the next input code point is EOF, do nothing. Otherwise, if the next
    // input code point is a newline, consume it." Outside a string a backslash
    // before a newline is a <delim-token>, and §4.3.6 Consume a url token:
    // "U+005C REVERSE SOLIDUS (\): If the stream starts with a valid escape,
    // consume an escaped code point ... Otherwise, this is a parse error.
    // Consume the remnants of a bad url".
    describe('a backslash before a newline in the middle of a value', () => {
      it('continues a string', () => {
        const src = tagged`content: "${'a\\\nb'}";`;
        expect(out(src)).toEqual(['.a{content:"a\\\nb";}']);
      });

      it('reads as a delimiter outside strings', () => {
        const src = tagged`color: ${'a\\\nb'};`;
        expect(out(src)).toEqual(['.a{color:a\\\nb;}']);
      });

      it('turns an unquoted url( into a bad url, which the value cannot leave open', () => {
        const src = tagged`background: url(${'a\\\nb'}); margin: 0;`;
        expect(out(src)).toEqual(legacy('margin: 0;'));
      });
    });

    // CSS Syntax 3 §4.3.5 Consume a string token: "newline: This is a parse
    // error. Reconsume the current input code point, create a
    // <bad-string-token>, and return it."
    it('drops the declaration for a raw newline inside a string', () => {
      // Read by the tokenizer, `"a` ends at the newline and `"c"` is a whole
      // string, so the value ends outside any string; the newline rule still
      // drops it, since readers that let a string span the newline disagree.
      const src = tagged`content: ${'"a\nb"c"'}; margin: 0;`;
      expect(out(src)).toEqual(legacy('margin: 0;'));
    });

    // CSS Syntax 3 §4.3.2 Consume comments: "If the next two input code point
    // are U+002F SOLIDUS (/) followed by a U+002A ASTERISK (*), consume them
    // and all following code points up to and including the first U+002A
    // ASTERISK (*) followed by a U+002F SOLIDUS (/), or up to an EOF code
    // point."
    it('reads a quote inside a comment as comment text', () => {
      const src = tagged`color: ${'/* " */ red'}; margin: 0;`;
      expect(out(src)).toEqual(['.a{color:/* " */ red;margin:0;}']);
    });

    it('does not split at a `;` inside a comment', () => {
      const src = tagged`color: ${'red /* ; */'};`;
      expect(out(src)).toEqual(['.a{color:red /* ; */;}']);
    });

    it('splits at a `;` after a comment holding a quote', () => {
      const src = tagged`color: ${'red /* " */; margin: 0'};`;
      expect(out(src)).toEqual(['.a{color:red /* " */;margin:0;}']);
    });

    it.each([
      ['a slash before the slot', tagged`font: 12px/${'* x'};`],
      ['a slash ending the value', tagged`width: calc(${'10px/'}*2);`],
      ['two adjacent values', tagged`color: ${'/'}${'* x'};`],
      ['an empty value between a slash and an asterisk', tagged`font: 12px/${''}*2;`],
    ])('drops the declaration when %s opens a comment', (_, src) => {
      expect(out(src)).toEqual([]);
    });

    // CSS Syntax 3 §4.3.6 Consume a url token: "U+0022 QUOTATION MARK (")
    // U+0027 APOSTROPHE (') U+0028 LEFT PARENTHESIS (() non-printable code
    // point: This is a parse error. Consume the remnants of a bad url, create
    // a <bad-url-token>, and return it." §4.3.15 Consume the remnants of a bad
    // url: "U+0029 RIGHT PARENTHESIS ()) EOF: Return."
    it('reads a quote inside an unquoted url( as a bad url that ends at `)`', () => {
      const src = tagged`background: ${'url(a"b) ; x: y'};`;
      expect(out(src)).toEqual(['.a{background:url(a"b);x:y;}']);
    });

    it('drops a bad url payload carrying braces', () => {
      const src = tagged`background: ${'url(a"b) } body{background:red} x"'}; margin: 0;`;
      expect(out(src)).toEqual(legacy('margin: 0;'));
    });

    // CSS Syntax 3 §4.3.4 Consume an ident-like token: "If string’s value is
    // an ASCII case-insensitive match for "url", and the next input code point
    // is U+0028 LEFT PARENTHESIS ((), consume it." The identifier is read
    // across the slot boundary, so text before the slot decides whether `(`
    // opens a url.
    it('reads url( across the slot boundary', () => {
      const src = tagged`background: u${'rl(a"b)'};`;
      expect(out(src)).toEqual(['.a{background:url(a"b);}']);
    });

    it('reads `url(` extended by an identifier before the slot as a function', () => {
      const src = tagged`background: x${'url(a"b)'}; margin: 0;`;
      expect(out(src)).toEqual(legacy('margin: 0;'));
    });

    it('drops the declaration when an identifier value turns the following `(` into url(', () => {
      const src = tagged`background: ${'ur'}l(a); margin: 0;`;
      expect(out(src)).toEqual(legacy('margin: 0;'));
    });

    it('keeps a data URI with `;` in an unquoted url( as one declaration', () => {
      const src = tagged`background: ${'url(data:image/png;base64,AAAA)'};`;
      expect(out(src)).toEqual(['.a{background:url(data:image/png;base64,AAAA);}']);
    });

    it('keeps a data URI value inside an authored url( as one declaration', () => {
      const src = tagged`src: url(${'data:font/woff2;base64,AAAA'});`;
      expect(out(src)).toEqual(['.a{src:url(data:font/woff2;base64,AAAA);}']);
    });

    it('keeps a quoted `;` in content as one declaration', () => {
      const src = tagged`content: ${'"a;b"'};`;
      expect(out(src)).toEqual(['.a{content:"a;b";}']);
    });

    it('drops a value closing the url( it sits in', () => {
      const src = tagged`background: url(${'a) ; x: y ; z: url(b'}); margin: 0;`;
      expect(out(src)).toEqual(legacy('margin: 0;'));
    });

    // CSS Syntax 3 §4.3.5 Consume a string token: "U+005C REVERSE SOLIDUS (\):
    // If the next input code point is EOF, do nothing. Otherwise, if the next
    // input code point is a newline, consume it. Otherwise, (the stream starts
    // with a valid escape) consume an escaped code point".
    it('substitutes a value after a backslash inside a string', () => {
      const src = tagged`content: "\\${'f101'}";`;
      expect(out(src)).toEqual(['.a{content:"\\f101";}']);
    });

    it('drops the declaration when an empty value leaves a backslash escaping the closing quote', () => {
      const src = tagged`content: "\\${''}"; margin: 0;`;
      expect(out(src)).toEqual(legacy('margin: 0;'));
    });

    it('splits a declaration at a `;` in a value', () => {
      const src = tagged`color: ${'red; position: fixed'};`;
      expect(out(src)).toEqual(['.a{color:red;position:fixed;}']);
    });

    it('keeps only declarations when a value `;` is followed by an at-rule', () => {
      const src = tagged`color: ${'red; @import url(x)'};`;
      expect(out(src)).toEqual(['.a{color:red;}']);
    });

    it('splits after a value closes the string it sits in', () => {
      const src = tagged`content: "${'a"; b: "c'}";`;
      expect(out(src)).toEqual(['.a{content:"a";b:"c";}']);
    });

    it('splits a property value at its `;`', () => {
      const src = tagged`${'x; position'}: fixed;`;
      expect(out(src)).toEqual(['.a{position:fixed;}']);
    });

    // CSS Syntax 3 §5.5.5 Consume a block's contents: "consume a qualified rule
    // from input, with nested set to true, and <semicolon-token> as the stop
    // token." A `;` in a selector ends the rule inside a conditional group
    // rule, and what follows reads as a new rule.
    it('drops a rule whose selector value holds a `;`, with a dev warning', () => {
      const src = tagged`color: blue; & ${'h1; body'} { color: red; }`;
      expect(out(src)).toEqual(legacy('color: blue;'));
      expect(warnings()).toEqual([expect.stringContaining('& ${…}')]);
    });

    // CSS Syntax 3 §5.5.2 Consume an at-rule: "<semicolon-token> <EOF-token>
    // Discard a token from input. If rule is valid in the current context,
    // return it". A `;` in a prelude ends the at-rule.
    it.each([
      ['a `;`', 'screen; body'],
      ['a brace', 'screen { } body {'],
    ])('drops an at-rule whose prelude value holds %s', (_, value) => {
      const src = tagged`color: blue; @media ${value} { color: red; }`;
      expect(out(src)).toEqual(legacy('color: blue;'));
    });

    it('drops a rule whose Head remainder holds a brace, keeping the rest', () => {
      const src = tagged`color: blue; ${() => 'a { b'} h2 { color: red; } margin: 0;`;
      expect(out(src)).toEqual(legacy('color: blue; margin: 0;'));
      expect(warnings()).toEqual([expect.stringContaining('a { b')]);
    });

    it('drops a rule whose later Head slot holds a brace', () => {
      const src = tagged`${() => '.x'} ${() => '} body {'} h2 { color: red; } margin: 0;`;
      expect(out(src)).toEqual(legacy('margin: 0;'));
    });
  });

  /**
   * After substitution a selector list or keyframe stop list is split on
   * top-level commas again, so every selector a value adds stays scoped.
   */
  describe('comma re-split after substitution', () => {
    const opts = { selfRefSelector: '.a', componentId: 'a' };

    it('scopes every selector an Inside value adds', () => {
      const src = tagged`& ${'h1, h2, h3'} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(['.a h1,.a h2,.a h3{color:red;}']);
    });

    it('scopes every selector a Glued value adds', () => {
      const src = tagged`${'h1, h2'}:hover { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(['.a h1,.a h2:hover{color:red;}']);
    });

    it('scopes an unscoped selector smuggled into an Inside value', () => {
      const src = tagged`& ${'a, body'} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(['.a a,.a body{color:red;}']);
    });

    it('scopes every selector a Head value adds', () => {
      const src = tagged`${() => 'h1, body'} { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(['.a h1,.a body{color:red;}']);
    });

    /**
     * In a list holding a slot, a part stays as written only when it holds
     * `&` outside parentheses and brackets; every other part is nested under
     * the parent, so `&` inside `:not()` or `:has()` cannot unscope it.
     */
    describe('anchoring each part on the parent', () => {
      it.each([
        ['`&:hover`', tagged`& > ${'p, &:hover'} { color: red; }`, '.a>p,.a:hover'],
        ['`html &`', tagged`& ${'p, html &'} { color: red; }`, '.a p,html .a'],
        ['`html :not(&)`', tagged`& ${'x, html :not(&)'} { color: red; }`, '.a x,.a html :not(.a)'],
        [
          '`body:has(&) *`',
          tagged`&:hover ${'x, body:has(&) *'} { color: red; }`,
          '.a:hover x,.a body:has(.a) *',
        ],
        ['`:is(&) x`', tagged`& ${'p, :is(&) x'} { color: red; }`, '.a p,.a :is(.a) x'],
      ])('in an Inside value: %s', (_, src, selector) => {
        expect(compileWeb(src, {}, '.a', opts)).toEqual([selector + '{color:red;}']);
      });

      it.each([
        ['inside brackets', '[data-x="&"]'],
        ['inside a string', '"&"'],
        ['escaped', '.x\\&y'],
      ])('nests a part whose only `&` is %s', (_, part) => {
        const src = tagged`${'p, ' + part} { color: red; }`;
        expect(fillSource(src, src.staticValues, null)).toEqual([
          {
            kind: NodeKind.Rule,
            selectors: ['p', '& ' + part],
            children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
          },
        ]);
      });

      it('nests a part a value comma makes next to authored `:not(&)` text', () => {
        const src = tagged`&:hover, ${'x, html'} :not(&) { color: red; }`;
        expect(compileWeb(src, {}, '.a', opts)).toEqual([
          '.a:hover,.a x,.a html :not(.a){color:red;}',
        ]);
      });

      it('nests an authored part without a top-level `&` in a list holding a slot', () => {
        const src = tagged`html :not(&), & ${'p'} { color: red; }`;
        expect(compileWeb(src, {}, '.a', opts)).toEqual(['.a html :not(.a),.a p{color:red;}']);
      });

      it.each([
        [
          '`html :not(&)`',
          tagged`${() => 'x, html :not(&)'} { color: red; }`,
          '.a x,.a html :not(.a)',
        ],
        ['`:is(&) x`', tagged`${() => ':is(&) x'} { color: red; }`, '.a :is(.a) x'],
        ['`html &`', tagged`${() => 'html &, x'} { color: red; }`, 'html .a,.a x'],
        [
          'authored `:not(&)` after a value comma',
          tagged`${() => 'x, html'} :not(&) { color: red; }`,
          '.a x,.a html :not(.a)',
        ],
      ])('in a Head value: %s', (_, src, selector) => {
        expect(compileWeb(src, {}, '.a', opts)).toEqual([selector + '{color:red;}']);
      });

      it('leaves a list at the top level of a global style as written, with no parent to nest under', () => {
        const src = tagged`${'p, :not(&)'} { color: red; }`;
        expect(fillSource(src, src.staticValues, null, true)).toEqual([
          {
            kind: NodeKind.Rule,
            selectors: ['p', ':not(&)'],
            children: [{ kind: NodeKind.Decl, prop: 'color', value: 'red' }],
          },
        ]);
      });

      it('leaves a list without a slot as written', () => {
        const src = tagged`html :not(&) { color: red; }`;
        expect(compileWeb(src, {}, '.a', opts)).toEqual(['html :not(.a){color:red;}']);
      });
    });

    it('splits a stop list an Inside value adds into stops', () => {
      const src = tagged`@keyframes k { from, ${'50%, 60%'} { opacity: 0; } }`;
      const filled = fillSource(src, src.staticValues, null);
      expect(filled).toEqual([
        {
          kind: NodeKind.Keyframes,
          name: 'keyframes',
          prelude: 'k',
          frames: [
            {
              stops: ['from', '50%', '60%'],
              children: [{ kind: NodeKind.Decl, prop: 'opacity', value: '0' }],
            },
          ],
        },
      ]);
    });
  });

  describe('value shapes', () => {
    const opts = { selfRefSelector: '.a', componentId: 'a' };
    let warn: jest.SpyInstance;

    beforeEach(() => {
      resetWarnOnce();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    const warnings = () => warn.mock.calls.map(call => String(call[0]));

    it('splices a static array in order', () => {
      const src = tagged`${['color: red', css`margin: 0;`]}`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: red; margin: 0;'));
    });

    it('splices an array a function returns in order', () => {
      const src = tagged`${() => ['color: red', 'margin: 0']} padding: 0;`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: red; margin: 0; padding: 0;'));
    });

    it('splices an array of css fragments a function returns', () => {
      const src = tagged`${() => [css`color: red;`, css`margin: 0;`]}`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: red; margin: 0;'));
    });

    it('joins an array in a Head as selector text', () => {
      const Other = Object.assign(function FakeComponent() {}, { styledComponentId: 'sc-other' });
      const src = tagged`${() => [Other, ':hover']} & { color: red; }`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('.sc-other:hover & { color: red; }'));
    });

    it('reads `true` as empty', () => {
      const src = tagged`color: red; ${() => true} margin: 0${true};`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: red; margin: 0;'));
    });

    it('calls a function of two parameters with the render context', () => {
      const src = tagged`color: ${(p: { fg: string }, _unused?: unknown) => p.fg};`;
      expect(compileWeb(src, { fg: 'tomato' }, '.a', opts)).toEqual(legacy('color: tomato;'));
    });

    it('stringifies a css fragment inside a plain object value', () => {
      const src = tagged`${() => ({ color: css`red` })}`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: red;'));
    });

    it('drops the rule a non-styled component heads, with a dev warning', () => {
      function Plain() {
        return React.createElement('div');
      }
      const src = tagged`color: blue; ${Plain} h2 { color: red; } margin: 0;`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(legacy('color: blue; margin: 0;'));
      expect(warnings()).toEqual([expect.stringContaining('Plain is not a styled component')]);
    });

    it('drops only the value slot of a non-styled component', () => {
      const Forwarded = { $$typeof: Symbol.for('react.forward_ref'), displayName: 'Forwarded' };
      const src = tagged`color: blue; content: "${() => Forwarded}"; margin: 0;`;
      expect(compileWeb(src, {}, '.a', opts)).toEqual(
        legacy('color: blue; content: ""; margin: 0;')
      );
      expect(warnings()).toEqual([expect.stringContaining('Forwarded is not a styled component')]);
    });
  });

  describe('plugins', () => {
    it('respects the rw selector transform', () => {
      const src = parseSource(['& > :first-child { color: red; }'], []);
      const upper = (sel: string) => sel.toUpperCase();
      expect(
        compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a', rw: upper })
      ).toEqual(
        legacy('& > :first-child { color: red; }', 'a').map(s =>
          s.replace(/^([^{]+)\{/, (_, sel) => sel.toUpperCase() + '{')
        )
      );
    });

    it('respects the decl transform', () => {
      const src = parseSource(['color: red;'], []);
      const swap = (prop: string, value: string) =>
        prop === 'color' ? { prop: 'background', value } : undefined;
      expect(
        compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a', decl: swap })
      ).toEqual(legacy('background: red;'));
    });

    it('expands a multi-result decl transform', () => {
      const src = parseSource(['appearance: none;'], []);
      const dual = (prop: string, value: string) =>
        prop === 'appearance'
          ? [
              { prop: '-webkit-appearance', value },
              { prop: 'appearance', value },
            ]
          : undefined;
      expect(
        compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a', decl: dual })
      ).toEqual(legacy('-webkit-appearance: none; appearance: none;'));
    });

    it('expands a multi-result rw transform into one rule per selector', () => {
      const src = parseSource(['color: gray;'], []);
      const multi = (sel: string) => [sel + '::-webkit-input-placeholder', sel + '::placeholder'];
      expect(
        compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a', rw: multi })
      ).toEqual(['.a::-webkit-input-placeholder{color:gray;}', '.a::placeholder{color:gray;}']);
    });
  });
});
