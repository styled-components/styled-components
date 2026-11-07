import React from 'react';
import css from '../constructors/css';
import Keyframes from '../models/Keyframes';
import StyleSheet from '../sheet';
import createCompiler from '../utils/compiler';
import { resetWarnOnce } from '../utils/warnOnce';
import { REFERENCE_MARKER } from '../utils/serverReference';
import { compileWeb, dropMarked } from './compile';
import { parse } from './parser';
import { getSource, parseSource } from './source';

const compiler = createCompiler();

const tagged = (strings: ReadonlyArray<string>, ...interps: unknown[]) =>
  parseSource(strings, interps);

/**
 * The rules `compiler.compile()` emits for a pre-resolved CSS string, the text a
 * template reads as once its values are in. Filling the construction-time AST
 * with the same values must emit the same rules.
 */
function legacy(rawCSS: string, componentId = 'a'): string[] {
  return compiler.compile(rawCSS, `.${componentId}`, undefined, componentId);
}

describe('compileWeb', () => {
  describe('static templates (no interpolations)', () => {
    it('emits a simple decl as compiled text does', () => {
      const src = parseSource(['color: red;'], []);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red;')
      );
    });

    it('emits multiple decls as compiled text does', () => {
      const src = parseSource(['color: red; background: blue; padding: 8px;'], []);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; background: blue; padding: 8px;')
      );
    });

    it('emits a nested rule as compiled text does', () => {
      const css = 'color: red; &:hover { color: blue; }';
      const src = parseSource([css], []);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy(css)
      );
    });

    it('emits a media query as compiled text does', () => {
      const css = 'color: red; @media (min-width: 600px) { color: blue; }';
      const src = parseSource([css], []);
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy(css)
      );
    });

    it('emits keyframes as compiled text does', () => {
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
      // the canonical resolved value while siblings are alternates. The object
      // reads as that text, not as one declaration per key.
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

  // Multi-slot decl-value patterns. The trailing slot is part of the value, never a
  // standalone block-level interpolation, and no `J<n>` sentinel reaches the CSS.
  describe('multi-slot value shorthands', () => {
    const id = '.a';
    const opts = { selfRefSelector: '.a', componentId: 'a' };

    it('padding 2-value', () => {
      const src = tagged`padding: ${'8px'} ${'16px'};`;
      const out = compileWeb(src, {}, id, opts);
      expect(out).toEqual(legacy('padding: 8px 16px;'));
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

    it.each<[string, unknown]>([
      ['an empty string', ''],
      ['false', false],
      ['a function returning false', () => false],
    ])('leaves no extra space when the slot holds %s', (_title, slot) => {
      const src = tagged`${slot} h2 { color: red; }`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('h2 { color: red; }')
      );
    });

    it.each<[string, () => ReturnType<typeof tagged>]>([
      ['before it', () => tagged`${false} & + & { color: red; }`],
      ['before it, from a function', () => tagged`${() => false} & + & { color: red; }`],
      ['after it', () => tagged`& + & ${false} { color: red; }`],
      ['after it, from a function', () => tagged`& + & ${() => false} { color: red; }`],
    ])('leaves no space around a selector with an empty value %s', (_title, build) => {
      expect(compileWeb(build(), {}, '.a')).toEqual(['.a+.a{color:red;}']);
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

    it('bails when sheet/compiler are not supplied', () => {
      // A caller that provides no sheet and compiler can't register keyframes,
      // so the template renders no styles.
      const kf = new Keyframes('fade', '@keyframes fade {}');
      const src = tagged`animation-name: ${kf};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toBeNull();
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

  describe('at-rule name interpolation', () => {
    // A slot in the at-rule name position can change the at-rule's identity
    // (`@${'-webkit-'}keyframes` reads as keyframes once it has its value).
    const id = '.a';
    const opts = { selfRefSelector: '.a', componentId: 'a' };

    it('reads a dynamic at-rule name with its body', () => {
      const src = tagged`@${'media'} (min-width: 600px) { padding: 8px; }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('@media (min-width: 600px) { padding: 8px; }')
      );
    });

    it('reads a vendor prefix on @keyframes as keyframes', () => {
      const src = tagged`@${'-webkit-'}keyframes anim { from { opacity: 0; } to { opacity: 1; } }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('@-webkit-keyframes anim { from { opacity: 0; } to { opacity: 1; } }')
      );
    });

    it('does not read the head again when the slot lives in the prelude (e.g. @keyframes ${name})', () => {
      const src = tagged`@keyframes ${'spin'} { from { opacity: 0; } to { opacity: 1; } }`;
      expect(compileWeb(src, {}, id, opts)).toEqual(
        legacy('@keyframes spin { from { opacity: 0; } to { opacity: 1; } }')
      );
    });
  });

  describe('styled-component refs', () => {
    // Synthetic styled-component shape: the resolver checks for the
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

    describe('a block-style fragment with no `;` before it', () => {
      // A `css` fragment carrying statements (`;` or a nested block) that
      // follows a declaration with no `;` between them is part of that
      // declaration's value: the author's `margin: 0 ${10}px ${block};` reads
      // as `margin: 0 10px <block text>`. The library does not repair the
      // template; it warns in development and compiles the swallowed value as
      // written.
      it.each([
        [
          'declarations',
          css`
            color: red;
          `,
        ],
        [
          'a nested rule',
          css`
            &:hover {
              color: blue;
            }
          `,
        ],
        [
          'a `;` inside a quoted string',
          css`
            content: 'hi;there';
          `,
        ],
      ])('warns and keeps the fragment inside the preceding value (%s)', (_label, block) => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        // The warning quotes only the unterminated declaration (the text after
        // the chunk's last top-level `;`, `{` or `}`), so `content: ';'` and
        // the `margin` declaration before it are not part of the quote.
        const src = parseSource(
          ['margin: 0 ', "px; content: ';'; padding: 0 1px\n", ';'],
          [10, block]
        );
        expect(warn.mock.calls).toEqual([
          [
            "[sc] a css fragment is interpolated inside the `padding` declaration with no `;` before it, so the fragment text becomes part of that declaration's value. Add a `;` before the `${...}` interpolation.",
          ],
        ]);
        warn.mockRestore();
        // The fragment text lands in `padding`, and that statement reads on its own,
        // as the same text would written by hand.
        const blockText = getSource(block)?.strings[0].trim();
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
          legacy(`margin: 0 10px; content: ';'; padding:0 1px\n${blockText};`)
        );
      });

      it('names the declaration past a comment holding a paren', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const block = css`
          color: red;
        `;
        parseSource(['width: calc(1px /* ( */); inset: 0 ', ';'], [block]);
        expect(warn.mock.calls).toEqual([
          [
            "[sc] a css fragment is interpolated inside the `inset` declaration with no `;` before it, so the fragment text becomes part of that declaration's value. Add a `;` before the `${...}` interpolation.",
          ],
        ]);
        warn.mockRestore();
      });

      it('names the declaration across earlier slots and warns once per site, not once per chunk tail', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const block = css`
          color: red;
        `;
        // Both sites end in `px` before the fragment; only the declaration differs.
        parseSource(['margin: 0 ', 'px ', ';'], [10, block]);
        parseSource(['padding: 0 ', 'px ', ';'], [10, block]);
        expect(warn.mock.calls).toEqual([
          [
            "[sc] a css fragment is interpolated inside the `margin` declaration with no `;` before it, so the fragment text becomes part of that declaration's value. Add a `;` before the `${...}` interpolation.",
          ],
          [
            "[sc] a css fragment is interpolated inside the `padding` declaration with no `;` before it, so the fragment text becomes part of that declaration's value. Add a `;` before the `${...}` interpolation.",
          ],
        ]);
        warn.mockRestore();
      });

      it('does not warn when the fragment sits at a statement boundary', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const block = css`
          color: red;
        `;
        const src = parseSource(['margin: 0 ', 'px;\n', ';'], [10, block]);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
          legacy('margin: 0 10px; color: red;')
        );
      });

      it('does not warn for a value-position fragment after `:`', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const frag = css`
          1px solid red;
        `;
        const src = parseSource(['border: ', ''], [frag]);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
      });
    });

    it('keeps both fragments standalone when two block-style fragments are adjacent', () => {
      // Author wrote `${first}${second}` with no separator. The first slot
      // starts the template (a statement boundary) and the second inherits
      // that classification through the empty gap between them.
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

    it('handles a fragment whose only braces live inside a comment', () => {
      // The slot is at a statement boundary, so the comment's braces have
      // no bearing on classification. Lock that the comment is stripped and
      // the surrounding decls compile.
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

  describe('interpolated values of every shape', () => {
    it('reads an object interpolation in a value position as text', () => {
      const src = tagged`color: ${{ raw: 'red' } as unknown};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
        '.a{color:raw:red;}',
      ]);
    });

    describe('a value with a text form', () => {
      class Color {
        toString() {
          return 'red';
        }
      }

      class Epoch extends Date {
        toString() {
          return 'epoch';
        }
      }

      // The tail differs per row, since a value read on its own is cached by its text.
      class Breakout {
        constructor(private readonly tail: string) {}

        toString() {
          return `red}html{display:none}a{b:${this.tail}`;
        }
      }

      it.each<[string, () => ReturnType<typeof tagged>, string]>([
        [
          'an instance with its own toString',
          () => tagged`color: ${new Color()}; top: 0;`,
          '.a{color:red;top:0;}',
        ],
        [
          'an instance with its own toString, from a function',
          () => tagged`color: ${() => new Color()}; top: 0;`,
          '.a{color:red;top:0;}',
        ],
        [
          'a date, from a function',
          () => tagged`color: ${() => new Epoch(0)}; top: 0;`,
          '.a{color:epoch;top:0;}',
        ],
        ['a bigint', () => tagged`z-index: ${BigInt(7)}; top: 0;`, '.a{z-index:7;top:0;}'],
        [
          'a bigint, from a function',
          () => tagged`z-index: ${() => BigInt(7)}; top: 0;`,
          '.a{z-index:7;top:0;}',
        ],
      ])('reads %s as its text', (_label, build, rule) => {
        expect(compileWeb(build(), {}, '.a')).toEqual([rule]);
      });

      it.each<[string, string, () => ReturnType<typeof tagged>]>([
        ['directly', 'c', () => tagged`color: ${new Breakout('c')}; top: 0;`],
        ['from a function', 'd', () => tagged`color: ${() => new Breakout('d')}; top: 0;`],
      ])('keeps text that closes the block inside its statement, %s', (_label, tail, build) => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        resetWarnOnce();
        expect(compileWeb(build(), {}, '.a')).toEqual(['.a{top:0;}']);
        expect(warn.mock.calls).toEqual([
          [
            `[sc] An interpolated value holds an unmatched brace or leaves a string, paren, or bracket open, so "color:red}html{display:none}a{b:${tail}" was dropped. Write a value as \`property: value;\` declarations or whole \`selector { ... }\` rules.`,
          ],
        ]);
        warn.mockRestore();
      });
    });

    describe('a value with no text form', () => {
      class Plain {}

      const element = { $$typeof: Symbol.for('react.element'), props: {} };

      it.each<[string, () => ReturnType<typeof tagged>]>([
        ['an instance with the default toString', () => tagged`color: ${new Plain()}; top: 0;`],
        ['a React element', () => tagged`color: ${element}; top: 0;`],
      ])('renders no styles for %s', (_label, build) => {
        expect(compileWeb(build(), {}, '.a')).toBeNull();
      });

      describe('an object with no prototype', () => {
        const noPrototype = (styles: object) => Object.assign(Object.create(null), styles);

        it.each<[string, unknown]>([
          ['directly', noPrototype({})],
          ['from a function', () => noPrototype({})],
        ])('holds nothing in a value, %s', (_label, value) => {
          expect(compileWeb(tagged`color: ${value}; top: 0;`, {}, '.a')).toEqual(['.a{top:0;}']);
        });

        it.each<[string, unknown]>([
          ['directly', noPrototype({ color: 'red' })],
          ['from a function', () => noPrototype({ color: 'red' })],
        ])('reads as a style object at the start of a statement, %s', (_label, value) => {
          expect(compileWeb(tagged`${value} top: 0;`, {}, '.a')).toEqual(['.a{color:red;top:0;}']);
        });

        it('reads as a style object when passed to css()', () => {
          const src = getSource(css(noPrototype({ color: 'red' }) as never));
          expect(src && compileWeb(src, {}, '.a')).toEqual(['.a{color:red;}']);
        });
      });

      it.each<[string, unknown]>([
        ['an instance with the default toString', new Plain()],
        ['a React element', element],
      ])('warns once, naming the function, for %s returned by a function', (_label, value) => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        resetWarnOnce();
        function returnsNoTextForm() {
          return value;
        }
        const src = tagged`color: ${returnsNoTextForm}; top: 0;`;
        expect(compileWeb(src, {}, '.a')).toBeNull();
        expect(warn.mock.calls).toEqual([
          [
            '[sc] returnsNoTextForm is not a styled component and cannot be referred to via component selector. Wrap it with styled() first. See https://styled-components.com/docs/advanced#referring-to-other-components for more details.',
          ],
        ]);
        warn.mockRestore();
      });

      describe('a React component object that is not styled', () => {
        const shapes: [string, unknown][] = [
          ['forwardRef', React.forwardRef(() => null)],
          ['memo', React.memo(() => null)],
          ['lazy', React.lazy(() => new Promise<never>(() => {}))],
        ];
        const positions: [string, (value: unknown) => ReturnType<typeof tagged>][] = [
          ['a value', value => tagged`color: ${value}; top: 0;`],
          ['a selector', value => tagged`${value} { top: 0; }`],
        ];

        describe.each(shapes)('%s', (_shape, shape) => {
          it.each(positions)('renders no styles in %s', (_position, build) => {
            expect(compileWeb(build(shape), {}, '.a')).toBeNull();
          });

          it.each(positions)('warns once, naming the function, in %s', (_position, build) => {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
            resetWarnOnce();
            const returnsComponent = () => shape;
            expect(compileWeb(build(returnsComponent), {}, '.a')).toBeNull();
            expect(warn.mock.calls).toEqual([
              [
                '[sc] returnsComponent is not a styled component and cannot be referred to via component selector. Wrap it with styled() first. See https://styled-components.com/docs/advanced#referring-to-other-components for more details.',
              ],
            ]);
            warn.mockRestore();
          });
        });
      });
    });

    describe('a value reads on its own', () => {
      let warn: jest.SpyInstance;

      beforeEach(() => {
        warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      });

      afterEach(() => {
        warn.mockRestore();
      });

      // The template's own text is unbalanced, so it is dropped from where it opens,
      // whatever the value would have closed.
      it.each([
        ['paren', () => tagged`width: calc(${'1px)'}; top: 0;`, []],
        [
          'paren closed by a function value',
          () => tagged`width: calc(${() => '1px)'}; top: 0;`,
          [],
        ],
        ['string', () => tagged`content: "${'a"'}; top: 0;`, []],
        ['bracket', () => tagged`grid-template-columns: [a ${'b]'} 1fr; top: 0;`, []],
        ['bracket in a selector', () => tagged`&[a=${'b]'} { top: 0; }`, []],
        ['string holding a newline', () => tagged`content: "a\n${'b'}"; top: 0;`, []],
        ['paren inside a block', () => tagged`&:hover { width: calc(${'1px)'}; top: 0; }`, []],
        ['paren in an at-rule prelude', () => tagged`@media (min-width: ${'1px)'} { top: 0; }`, []],
        ['bracket split from its paren', () => tagged`width: f(${'['}${')'}; top: 0;`, []],
        [
          'paren in a keyframes selector',
          () => tagged`@keyframes k { from { top: 0; } a(${'1)'} { left: 0; } } right: 0;`,
          ['@keyframes k{from{top:0;}}'],
        ],
      ])('drops a template %s left open, past the value', (_label, build, expected) => {
        expect(compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
          expected
        );
      });

      // Only the statement holding the value is lost; what the template wrote after it stays.
      it.each([
        ['a paren', () => tagged`width: ${'calc(1px'}; top: 0;`, '.a{top:0;}'],
        ['a string', () => tagged`content: ${'"a'}; top: 0;`, '.a{top:0;}'],
        ['a comment', () => tagged`width: ${'1px /*'}; top: 0;`, '.a{width:1px;top:0;}'],
        [
          'a closed comment',
          () => tagged`width: ${'1px /* c */'}; top: 0;`,
          '.a{width:1px;top:0;}',
        ],
        [
          'a comment split across two values',
          () => tagged`width: ${'/'}${'*'} 1px; top: 0;`,
          '.a{top:0;}',
        ],
        [
          'a comment split across text and a value',
          () => tagged`width: /${'*'} 1px; top: 0;`,
          '.a{top:0;}',
        ],
        ['a bracket', () => tagged`grid-template-columns: ${'[a'} 1fr; top: 0;`, '.a{top:0;}'],
        ['a string holding a newline', () => tagged`content: "${'a\nb'}"; top: 0;`, '.a{top:0;}'],
        [
          'a function a form feed keeps from being a url',
          () => tagged`top: ${'url(\f")""'}; left: 0;`,
          '.a{left:0;}',
        ],
        ['a form feed before a quote', () => tagged`top: url(${'\f"a'}); left: 0;`, '.a{left:0;}'],
        [
          'a function with a non-ASCII name',
          () => tagged`top: ${'éurl(a")""'}; left: 0;`,
          '.a{left:0;}',
        ],
        [
          'a function after an escape',
          () => tagged`top: ${'\\41 bar(a")""'}; left: 0;`,
          '.a{left:0;}',
        ],
        [
          'a url name extended by an escape',
          () => tagged`top: ${'\\61url(a")""'}; left: 0;`,
          '.a{left:0;}',
        ],
        ['a final backslash', () => tagged`color: ${'\\'}; top: 0;`, '.a{top:0;}'],
        ['a function after a NUL', () => tagged`top: ${'\0url(a")""'}; left: 0;`, '.a{left:0;}'],
      ])('keeps the statements after %s opened by a value', (_label, build, rule) => {
        expect(compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          rule,
        ]);
      });

      // A rule head that a value leaves unreadable takes the rule with it, never the rule's
      // contents up into the block around it.
      it.each([
        ['a paren in a selector', () => tagged`a ${'b:not('} { top: 0; }`],
        ['a bracket in a selector', () => tagged`&${'[a'} { top: 0; }`],
        ['a paren in an at-rule prelude', () => tagged`@media ${'(min-width:1px'} { top: 0; }`],
        ['a final backslash in a selector', () => tagged`&${'\\'} { top: 0; }`],
        ['a final backslash in a prelude', () => tagged`@media ${'x\\'} { top: 0; }`],
        ['a stray close in a selector', () => tagged`&${' } x'} { top: 0; }`],
        ['a stray close in a prelude', () => tagged`@media ${'print } x'} { top: 0; }`],
        ['a statement end in a selector', () => tagged`&${';'} { top: 0; }`],
        ['nothing but a rule of its own', () => tagged`${'x{}'} { top: 0; }`],
        ['a statement end in a prelude', () => tagged`@media ${'x;'} { top: 0; }`],
        ['a statement end before more prelude', () => tagged`@media ${'x;'} and (a:b) { top: 0; }`],
        ['a rule before more prelude', () => tagged`@media ${'x{}'} and (a:b) { top: 0; }`],
        ['a rule before the end of a prelude', () => tagged`@media ${'x{}@1x'} { top: 0; }`],
        ['a statement end before more selector', () => tagged`.y ${'x;'} .z { top: 0; }`],
        ['a rule before more selector', () => tagged`.y ${'x{}'} .z { top: 0; }`],
        ['a rule before the end of a selector', () => tagged`.y ${'x{}z'} { top: 0; }`],
      ])('drops the whole rule for %s', (_label, build) => {
        expect(compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
          []
        );
      });

      it.each([
        [
          'declarations before an ampersand',
          () => tagged`${'top:0;'} &:hover { left: 0; }`,
          ['.a{top:0;}', '.a:hover{left:0;}'],
        ],
        [
          'a whole rule before a combinator',
          () => tagged`${'x{top:0}'} > y { left: 0; }`,
          ['.a x{top:0;}', '.a>y{left:0;}'],
        ],
        [
          'an invalid statement before an ampersand',
          () => tagged`${'x;'} &:hover { left: 0; }`,
          ['.a:hover{left:0;}'],
        ],
      ])(
        'keeps the authored rule after a value opening its head with %s',
        (_label, build, rules) => {
          expect(
            compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })
          ).toEqual(rules);
          expect(warn).not.toHaveBeenCalled();
        }
      );

      it.each([
        ['more selector', () => tagged`${'x{top:0}y'} &:hover { left: 0; }`],
        ['an open paren', () => tagged`${'x{top:0}y('} &:hover { left: 0; }`],
        ['an open block', () => tagged`${'x{top:0}y{'} &:hover { left: 0; }`],
      ])('drops the authored rule after a value that leaves %s', (_label, build) => {
        expect(compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          '.a x{top:0;}',
        ]);
      });

      it('warns about a value that ends a selector before its block', () => {
        const src = tagged`.y ${'warn-ended;'} .z { top: 0; }`;
        compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' });
        expect(warn.mock.calls).toEqual([
          [
            '[sc] An interpolated value leaves ".y warn-ended; .z" with no selector or condition for the block after it, so that block was dropped. Write the selector or condition whole, with no `;`, before the `{`.',
          ],
        ]);
      });

      it('warns about a value that ends a condition before its block', () => {
        const src = tagged`@media ${'warn-ended{}@1x'} { top: 0; }`;
        compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' });
        expect(warn.mock.calls).toEqual([
          [
            '[sc] An interpolated value leaves "@media warn-ended{}@1x" with no selector or condition for the block after it, so that block was dropped. Write the selector or condition whole, with no `;`, before the `{`.',
          ],
        ]);
      });

      // A head's own text can end early and still look whole: only the leading `x{}` survives
      // the cut, and the template's block must not attach to it.
      it.each([
        ['a block it never closes', () => tagged`${'x{}y{'} { color: red; }`],
        ['a stray close', () => tagged`${'x{}}'} { color: red; }`],
        ['a block it never closes in a prelude', () => tagged`@media ${'print{}y{'} { top: 0; }`],
      ])('keeps the template block out of a rule cut short by %s', (_label, build) => {
        expect(compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
          []
        );
      });

      it.each([
        ['a block it never closes', () => tagged`${'x{top:0}y{'} { color: red; }`],
        ['a selector of its own', () => tagged`${'x{top:0}y'} { color: red; }`],
        ['a statement end', () => tagged`${'x{top:0}y;'} { color: red; }`],
      ])(
        'keeps a whole rule a value wrote ahead of a head it cut short with %s',
        (_label, build) => {
          expect(
            compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })
          ).toEqual(['.a x{top:0;}']);
        }
      );

      it('keeps a selector value holding only a comment, since it still reads as one head', () => {
        const src = tagged`.y ${'x /* ; */'} { top: 0; }`;
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          '.a .y x{top:0;}',
        ]);
      });

      // https://drafts.csswg.org/css-syntax/#consume-comment and #consume-url-token: joining
      // a parent to a child can spell a comment or a url the two parts never held alone.
      it.each([
        [
          'a comment, from a value',
          () => tagged`color: ${'red;/{&*{content:"*/{}html{display:none}/*"}}'};`,
          ['.a{color:red;}'],
        ],
        [
          'a comment, from a value before an authored child',
          () => tagged`${'/'} { &* { content: "*/{}html{display:none}/*"; } }`,
          [],
        ],
        [
          'a url around a parent, from a value',
          () => tagged`color: ${'red;[c=") {} html{display:none} [d="]{url(&){x:y}}'};`,
          ['.a{color:red;}'],
        ],
        [
          'a url after a parent, from a value',
          () => tagged`color: ${'red;url{&(x"){}html{display:none}"){y:z}}'};`,
          ['.a{color:red;}'],
        ],
      ])('drops a rule whose composed selector opens %s', (_label, build, expected) => {
        expect(compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
          expected
        );
      });

      it('drops a comment composed under no parent, in a global style', () => {
        const src = tagged`${'/{&*{content:"*/{}html{display:none}/*"}}'}`;
        expect(compileWeb(src, {}, '')).toEqual([]);
      });

      // One url token to a browser, so it stays one field; the sheet escapes the text that
      // reads as its rule separator when it writes the rule out.
      it('warns with the rule it dropped', () => {
        const src = tagged`color: ${'red;/{&*{left:"warn-composed"}}'};`;
        compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' });
        expect(warn.mock.calls).toEqual([
          [
            '[sc] The rule ".a /*" holds an unmatched brace, leaves a comment, string, paren, or bracket open, or holds text reserved for server rendering, so it was dropped. Check the interpolated values and plugins that write it.',
          ],
        ]);
      });

      // Server-rendered text splits on the separator and reads a part starting with a group
      // marker as bookkeeping, so a rule holding either would come back as something else.
      it.each<[string, () => ReturnType<typeof tagged>]>([
        [
          'the text that separates rules',
          () => tagged`background: url(${'/*!sc*/\nhtml{display:none}/*!sc*/\n'});`,
        ],
        [
          'the text that separates rules, closing a string once removed',
          () => tagged`background: ${"url(/*!sc*/\n')')} html{display:none} a{b:'"};`,
        ],
        // An HTML parser turns CR and CRLF into a line feed before the text is read back.
        [
          'the text that separates rules, ending in a carriage return',
          () => tagged`background: url(${'/*!sc*/\rhtml{display:none}/*!sc*/\rx'});`,
        ],
        [
          'the text that separates rules, ending in CRLF',
          () => tagged`background: url(${'/*!sc*/\r\nhtml{display:none}/*!sc*/\r\nx'});`,
        ],
        [
          'the text that separates rules, in a selector value',
          () => tagged`${'url(/*!sc*/\rhtml{display:none}/*!sc*/\rx)'} { top: 0; }`,
        ],
        [
          'a group marker at its start',
          () => tagged`${'data-styled.g1073741824[id="victim"]'} & { content: "z"; }`,
        ],
        // Reading server-rendered text back trims more than CSS calls whitespace.
        ...['\f', '\v', ' ', '﻿', ' '].map((space): [string, () => ReturnType<typeof tagged>] => [
          `a group marker after U+${space.charCodeAt(0).toString(16).padStart(4, '0')}`,
          () => tagged`${`${space}data-styled.g77[id="victim"] &{content:"z"}`}`,
        ]),
      ])('drops a rule holding %s', (_label, build) => {
        resetWarnOnce();
        expect(compileWeb(build(), {}, '.a')).toEqual([]);
        expect(warn).toHaveBeenCalledTimes(1);
      });

      it('keeps a parent ending in an escaped space from losing it', () => {
        const src = tagged`@media print { ${'a\\ {&{x:y}}'} b { color: red; } } d { color: red; }`;
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          '@media print{.a a\\ {x:y;}.a b{color:red;}}',
          '.a d{color:red;}',
        ]);
      });

      // Each level of a selector list multiplies the one under it.
      it.each([
        ['nested lists', `${'a,b{'.repeat(40)}x:y${'}'.repeat(40)}`],
        ['a repeated parent reference', `a,b,c,d{${'&'.repeat(4000)}{${'&'.repeat(4000)}{x:y}}}`],
      ])('drops %s that would compose past the size limit', (_label, value) => {
        const src = tagged`color: ${`red;${value}`};`;
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          '.a{color:red;}',
        ]);
      });

      it('keeps selector lists nested as deep as a real stylesheet goes', () => {
        const src = tagged`color: ${`red;${'a,b{'.repeat(8)}x:y${'}'.repeat(8)}`};`;
        const rules = compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' });
        expect(rules?.[0]).toBe('.a{color:red;}');
        expect(rules?.[1].split(',').length).toBe(256);
      });

      it.each([
        [
          'cannot read another value through text shaped like a slot',
          { left: (p: { c: string }) => p.c, top: '\0I0\0' },
          '.a{left:red;top:\0I0\0;}',
        ],
        ['keeps text shaped like a missing slot', { top: '\0I5\0' }, '.a{top:\0I5\0;}'],
        [
          'keeps `//` from hiding what follows',
          { top: 'x //y', left: '1' },
          '.a{top:x //y;left:1;}',
        ],
      ])('a style object value %s', (_label, styles, rule) => {
        const src = getSource(css(styles as never));
        expect(src && compileWeb(src, { c: 'red' }, '.a')).toEqual([rule]);
      });

      it('a function returning a style object keeps `//` from hiding what follows', () => {
        const src = tagged`${() => ({ top: 'x //y', left: '1' })}`;
        expect(compileWeb(src, {}, '.a')).toEqual(['.a{top:x;left:1;}']);
      });

      it.each([
        ['a `;`', () => tagged`${'a[title="x;y"]'} .x { top: 0; }`, '.a a[title="x;y"] .x{top:0;}'],
        [
          'a `//`',
          () => tagged`${'a[href^="https://x"]'} .x { top: 0; }`,
          '.a a[href^="https://x"] .x{top:0;}',
        ],
        ['a brace', () => tagged`${'a[title="{"]'} .x { top: 0; }`, '.a a[title="{"] .x{top:0;}'],
      ])('keeps a selector value holding %s in a string', (_label, build, rule) => {
        expect(compileWeb(build(), {}, '.a')).toEqual([rule]);
      });

      it.each([
        ['a:hover', '.a a:hover .x{top:0;}'],
        ['button:not(.y)', '.a button:not(.y) .x{top:0;}'],
        ['li:first-child', '.a li:first-child .x{top:0;}'],
        ['input[type=text]:focus', '.a input[type=text]:focus .x{top:0;}'],
        ['a:hover, b:hover', '.a a:hover,.a b:hover .x{top:0;}'],
      ])('reads `%s` before a rule as a selector', (value, rule) => {
        expect(compileWeb(tagged`${value} .x { top: 0; }`, {}, '.a')).toEqual([rule]);
        expect(compileWeb(tagged`${() => value} .x { top: 0; }`, {}, '.a')).toEqual([rule]);
      });

      it.each([
        ['&:hover', css`&:hover`, '.a:hover .y{top:0;}'],
        ['.x:hover', css`.x:hover`, '.a .x:hover .y{top:0;}'],
        ['a:hover', css`a:hover`, '.a a:hover .y{top:0;}'],
        ['a:not(.b)', css`a:not(.b)`, '.a a:not(.b) .y{top:0;}'],
        ['> a:hover', css`> a:hover`, '.a>a:hover .y{top:0;}'],
        ['a:hover, b:focus', css`a:hover, b:focus`, '.a a:hover,.a b:focus .y{top:0;}'],
      ])('reads the fragment `%s` before a rule as a selector', (_text, fragment, rule) => {
        expect(compileWeb(tagged`${fragment} .y { top: 0; }`, {}, '.a')).toEqual([rule]);
        expect(compileWeb(tagged`${() => fragment} .y { top: 0; }`, {}, '.a')).toEqual([rule]);
      });

      it.each([
        ['color: red', css`color: red`, ['.a{color:red;}', '.a .y{top:0;}']],
        ['color: red;', css`color: red;`, ['.a{color:red;}', '.a .y{top:0;}']],
        [
          'color: red; left: 1px',
          css`color: red; left: 1px`,
          ['.a{color:red;left:1px;}', '.a .y{top:0;}'],
        ],
      ])('reads the fragment `%s` before a rule as declarations', (_text, fragment, rules) => {
        expect(compileWeb(tagged`${fragment} .y { top: 0; }`, {}, '.a')).toEqual(rules);
        expect(compileWeb(tagged`${() => fragment} .y { top: 0; }`, {}, '.a')).toEqual(rules);
      });

      // Babel's minifier writes `css\`top: 0\`` as `top:0`, so this shape reaches the library
      // from a mixin its author spaced.
      describe.each([
        ['a string', 'top:0'],
        ['a function returning a string', () => 'top:0'],
        ['a fragment', css`top:0`],
        ['a function returning a fragment', () => css`top:0`],
      ])('%s with no space after the colon', (_label, mixin) => {
        const declaration = '.a{top:0;}';

        it.each([
          ['a type selector', tagged`${mixin} h2 { left: 1px; }`, '.a h2{left:1px;}'],
          ['a value', tagged`${mixin} ${'.c'} { left: 1px; }`, '.a .c{left:1px;}'],
          [
            'a value and a selector',
            tagged`${mixin} ${'h2'} .c { left: 1px; }`,
            '.a h2 .c{left:1px;}',
          ],
        ])('applies as a declaration before %s', (_before, src, rule) => {
          expect(compileWeb(src, {}, '.a')).toEqual([declaration, rule]);
        });

        it.each([
          ['a class', tagged`${mixin} .c { left: 1px; }`, '.a top:0 .c{left:1px;}'],
          ['an id', tagged`${mixin} #c { left: 1px; }`, '.a top:0 #c{left:1px;}'],
          ['an attribute', tagged`${mixin} [c] { left: 1px; }`, '.a top:0 [c]{left:1px;}'],
          ['`*`', tagged`${mixin} * { left: 1px; }`, '.a top:0 *{left:1px;}'],
          [
            'a class holding a value',
            tagged`${mixin} .c${'d'} { left: 1px; }`,
            '.a top:0 .cd{left:1px;}',
          ],
        ])('reads as a selector before %s', (_before, src, rule) => {
          expect(compileWeb(src, {}, '.a')).toEqual([rule]);
        });
      });

      // CSS whitespace is space, tab, and line breaks; an escaped space and a no-break space
      // belong to the name, so the value reaches the selector whole.
      const NO_BREAK_SPACE = String.fromCharCode(0xa0);

      it.each([
        ['an escaped space at its end', 'a\\ ', '.a a\\  .x{top:0;}'],
        ['a no-break space at its start', `${NO_BREAK_SPACE}a`, `.a ${NO_BREAK_SPACE}a .x{top:0;}`],
      ])('keeps %s in a selector value read before a rule', (_label, value, rule) => {
        expect(compileWeb(tagged`${value} .x { top: 0; }`, {}, '.a')).toEqual([rule]);
        expect(compileWeb(tagged`${() => value} .x { top: 0; }`, {}, '.a')).toEqual([rule]);
      });

      it('reads a value spaced as a declaration before a rule as a declaration', () => {
        expect(compileWeb(tagged`${'color: red'} .x { top: 0; }`, {}, '.a')).toEqual([
          '.a{color:red;}',
          '.a .x{top:0;}',
        ]);
      });

      // `${count && mixin} h1` leaves a falsy number in the slot, the only numbers `&&` can
      // leave. Neither is a selector: an identifier cannot start with a digit
      // (https://drafts.csswg.org/css-syntax-3/#would-start-an-identifier), and `NaN` is what
      // the number prints as, not an element name anyone writes.
      describe.each([
        ['0', 0],
        ['NaN', Number.NaN],
      ])('the number %s before a rule', (_label, value) => {
        it.each([
          ['a type selector', 'h1', '.a h1{top:0;}'],
          ['a class', '.x', '.a .x{top:0;}'],
        ])('leaves %s alone', (_before, selector, rule) => {
          const strings = ['', ` ${selector} { top: 0; }`];
          expect(compileWeb(parseSource(strings, [value]), {}, '.a')).toEqual([rule]);
          expect(compileWeb(parseSource(strings, [() => value]), {}, '.a')).toEqual([rule]);
        });

        it('keeps the selector value before it, the same as `false`', () => {
          const strings = ['', ' ', ' .x { top: 0; }'];
          const expected = ['.a .y .x{top:0;}'];
          expect(compileWeb(parseSource(strings, ['.y', false]), {}, '.a')).toEqual(expected);
          expect(compileWeb(parseSource(strings, ['.y', value]), {}, '.a')).toEqual(expected);
        });
      });

      it('keeps a number `&&` cannot leave as written', () => {
        const strings = ['', ' h1 { top: 0; }'];
        expect(compileWeb(parseSource(strings, [3]), {}, '.a')).toEqual(['.a 3 h1{top:0;}']);
      });

      it.each([
        ['before another selector', ['', ', h2 { top: 0; }'], [0], ['.a h2{top:0;}']],
        ['after another selector', ['h2, ', ' { top: 0; }'], [0], ['.a h2{top:0;}']],
        ['from a function', ['', ', h2 { top: 0; }'], [() => 0], ['.a h2{top:0;}']],
        ['before an empty value', ['', ', ', ', h2 { top: 0; }'], [0, false], ['.a h2{top:0;}']],
        ['after an empty value', ['', ', ', ', h2 { top: 0; }'], [false, 0], ['.a h2{top:0;}']],
      ])('leaves a number out of a selector list, %s', (_label, strings, values, rules) => {
        expect(compileWeb(parseSource(strings, values), {}, '.a')).toEqual(rules);
      });

      it.each([
        ['numbers', [0, Number.NaN]],
        ['empty values', [false, null]],
        ['a number and an empty value', [0, false]],
      ])('writes a list of only %s quietly, as nothing', (_label, values) => {
        const strings = ['', ', ', ' { top: 0; }'];
        expect(compileWeb(parseSource(strings, values), {}, '.a')).toEqual([]);
        expect(warn.mock.calls).toEqual([]);
      });

      it.each([
        ['a class', ['.col-', ' { top: 0; }'], '.a .col-3{top:0;}'],
        ['a pseudo-class argument', ['&:nth-child(', ') { top: 0; }'], '.a:nth-child(3){top:0;}'],
        ['an attribute value', ['&[data-n="', '"] { top: 0; }'], '.a[data-n="3"]{top:0;}'],
      ])('keeps a number that is part of %s', (_label, strings, rule) => {
        expect(compileWeb(parseSource(strings, [3]), {}, '.a')).toEqual([rule]);
      });

      it.each([
        ['a media query with `and`', '@media screen', ' and (min-width: 1px)'],
        ['a supports query with `and`', '@supports (display: grid)', ' and (color: red)'],
        ['a supports query with `or`', '@supports (display: grid)', ' or (color: red)'],
        ['a container query with a condition', '@container sidebar', ' (min-width: 1px)'],
        ['a bare `@media`', '@media', ' print'],
        ['a bare `@media` before a condition', '@media', ' (min-width: 1px)'],
        ['a bare `@container`', '@container', ' sidebar (min-width: 1px)'],
        ['a bare `@layer`', '@layer', ' a'],
        ['a media query with `and not`', '@media screen', ' and not (color)'],
        ['a value ending in `and`', '@media screen and', ' not (color)'],
        ['a supports query with a function', '@supports not', ' selector(:has(a))'],
        ['a scope limit', '@scope (.a)', ' to (.b)'],
        ['a container style query', '@container side', ' style(--x: 1)'],
        ['a container scroll-state query', '@container side', ' scroll-state(stuck: top)'],
        ['a container query with `not`', '@container side', ' not (min-width: 1px)'],
      ])('keeps %s split across a value and its template', (_label, value, rest) => {
        const strings = ['', `${rest} { top: 0; }`];
        const rule = [`${value}${rest}{.a{top:0;}}`];
        expect(compileWeb(parseSource(strings, [value]), {}, '.a')).toEqual(rule);
        expect(compileWeb(parseSource(strings, [() => value]), {}, '.a')).toEqual(rule);
        expect(
          compileWeb(parseSource(['.x { ', `${rest} { top: 0; } }`], [value]), {}, '.a')
        ).toEqual([`${value}${rest}{.a .x{top:0;}}`]);
      });

      it('keeps a media query split across two values', () => {
        const src = parseSource(
          ['', ' ', ' { top: 0; }'],
          ['@media screen', 'and (min-width: 1px)']
        );
        expect(compileWeb(src, {}, '.a')).toEqual([
          '@media screen and (min-width: 1px){.a{top:0;}}',
        ]);
      });

      it('keeps a media query before a value that comes out empty', () => {
        const src = parseSource(['', ' ', ' { top: 0; }'], ['@media screen', false]);
        expect(compileWeb(src, {}, '.a')).toEqual(['@media screen{.a{top:0;}}']);
      });

      it.each([
        ['an empty value and a type selector', ['', ' ', ' body { top: 0; }'], [false], '.a body'],
        ['an empty value and a class', ['', ' ', ' .x { top: 0; }'], [false], '.a .x'],
        ['a falsy number and a type selector', ['', ' ', ' body { top: 0; }'], [0], '.a body'],
        ['a pseudo-class', ['', ' :root { top: 0; }'], [], '.a :root'],
        ['a nested pseudo-class', ['', ' &:hover { top: 0; }'], [], '.a:hover'],
        ['a child combinator', ['', ' > b { top: 0; }'], [], '.a>b'],
      ])('reads an at-rule with a prelude before %s on its own', (_label, strings, rest, head) => {
        const rule = `${head}{top:0;}`;
        expect(compileWeb(parseSource(strings, ['@layer a', ...rest]), {}, '.a')).toEqual([
          '@layer a;',
          rule,
        ]);
        expect(
          compileWeb(parseSource(strings, ["@import url('x.css')", ...rest]), {}, '.a')
        ).toEqual(["@import url('x.css');", rule]);
      });

      it('keeps every rule after an at-rule before a pseudo-class in a global style', () => {
        expect(
          compileWeb(tagged`${'@layer a'} :root { top: 0; } body { top: 1px; }`, {}, '')
        ).toEqual(['@layer a;', ':root{top:0;}', 'body{top:1px;}']);
      });

      it('reads an `@import` before a component value on its own', () => {
        const src = parseSource(['', ' ', ' { top: 0; }'], ["@import url('x.css')", '.c']);
        expect(compileWeb(src, {}, '.a')).toEqual(["@import url('x.css');", '.a .c{top:0;}']);
      });

      it('keeps a media query list split across a value and its template', () => {
        const src = parseSource(['', ', print { top: 0; }'], [() => '@media screen']);
        expect(compileWeb(src, {}, '.a')).toEqual(['@media screen,print{.a{top:0;}}']);
      });

      it('reads a selector holding a function after an at-rule on its own', () => {
        const src = parseSource(['', ' h1:not(.x) { top: 0; }'], ['@layer a']);
        expect(compileWeb(src, {}, '.a')).toEqual(['@layer a;', '.a h1:not(.x){top:0;}']);
      });

      // An at-rule with a prelude starts its own statement, so it does not join a selector.
      describe.each(['@layer a', '@media print', "@import url('x.css')"])(
        'the at-rule `%s` with no `;` before a rule',
        value => {
          it.each([
            ['a type selector', 'h1', '.a h1{top:0;}'],
            ['a class', '.x', '.a .x{top:0;}'],
          ])('reads on its own and leaves %s alone', (_before, selector, rule) => {
            const strings = ['', ` ${selector} { top: 0; }`];
            const expected = [`${value};`, rule];
            expect(compileWeb(parseSource(strings, [value]), {}, '.a')).toEqual(expected);
            expect(compileWeb(parseSource(strings, [() => value]), {}, '.a')).toEqual(expected);
          });

          it('keeps the rule after it in a global style', () => {
            expect(compileWeb(tagged`${value} body { top: 0; }`, {}, '')).toEqual([
              `${value};`,
              'body{top:0;}',
            ]);
          });
        }
      );

      it.each([
        ['a custom property value', { '--cdn': '//cdn.example.com/x.png', color: 'red' }],
        ['a url', { background: 'url(https://x.com/a.png)' }],
      ])('reads `//` in %s of a style object as part of it', (_label, styles) => {
        const expected = Object.entries(styles)
          .map(([key, value]) => `${key}:${value};`)
          .join('');
        const src = getSource(css(styles as never));
        expect(src?.interpolations).toEqual([]);
        expect(src && compileWeb(src, {}, '.a')).toEqual([`.a{${expected}}`]);
        expect(compileWeb(tagged`${() => styles}`, {}, '.a')).toEqual([`.a{${expected}}`]);
      });

      it.each([
        ['a declaration before it', () => tagged`${'color:red;'} { top: 0; }`, ['.a{color:red;}']],
        ['nothing but a statement end', () => tagged`${'a;'} { top: 0; }`, []],
        ['an ended condition', () => tagged`@media ${'print;'} { top: 0; }`, []],
        ['a comment that takes the block', () => tagged`${'x{}/*'} { color: red; }`, []],
      ])('warns when a value leaves a rule no head for its block: %s', (_label, build, rules) => {
        resetWarnOnce();
        expect(compileWeb(build(), {}, '.a')).toEqual(rules);
        expect(warn).toHaveBeenCalledTimes(1);
      });

      it('keeps the rules after a rule a value dropped', () => {
        const src = tagged`&${'\\'} { top: 0; } y { color: red; }`;
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          '.a y{color:red;}',
        ]);
      });

      // Each `}` here sits inside a string, paren, or bracket only for a parser that reads
      // template text alone; with the value in place it is real, and it stays out.
      it.each([
        [
          'a bracket',
          () => tagged`top: [b ${'c]'}; } x { color: red; } d: e]; left: 0;`,
          '.a{top:[b c];left:0;}',
        ],
        [
          'a lone closer',
          () => tagged`--a: [${']'}; } x { color: red; } ]; left: 0;`,
          '.a{--a:[];left:0;}',
        ],
        [
          'a paren',
          () => tagged`top: f(b ${'c)'}; } x { color: red; } d: e); left: 0;`,
          '.a{top:f(b c);left:0;}',
        ],
        [
          'a string',
          () => tagged`content: "${'"'}; } x { color: red; } z ${'"'}"; left: 0;`,
          '.a{content:"";left:0;}',
        ],
      ])(
        'keeps template text in its block when %s in a value closes around it',
        (_label, build, rule) => {
          expect(
            compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })
          ).toEqual([rule]);
        }
      );

      it.each([
        ['after the scope', () => tagged`&${', b'} { color: red; }`, '.a,.a b{color:red;}'],
        ['in a descendant', () => tagged`& ${'b, c'} { color: red; }`, '.a b,.a c{color:red;}'],
        [
          'closing a bracket',
          () => tagged`&[a=${'b],c,[d'}] { color: red; }`,
          '.a[a=b],.a c,.a [d]{color:red;}',
        ],
      ])('reads a selector value adding a list item %s', (_label, build, rule) => {
        expect(compileWeb(build(), {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          rule,
        ]);
      });

      it('keeps the tokens of a keyframe declaration a value splits', () => {
        const src = tagged`@keyframes k { to { top: ${'0; left: 1px'}; } }`;
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          '@keyframes k{to{top:0;left:1px;}}',
        ]);
      });

      it('keeps only declarations from a keyframe value', () => {
        const src = tagged`@keyframes k { to { top: ${'0; a { b: c }'}; left: 1px; } }`;
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          '@keyframes k{to{top:0;left:1px;}}',
        ]);
      });

      it('drops a keyframe whose stop a value leaves unreadable', () => {
        const src = tagged`@keyframes k { ${'50%} x'} { top: 0; } to { left: 0; } }`;
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
          '@keyframes k{to{left:0;}}',
        ]);
      });

      it('drops keyframes whose name a value leaves unreadable', () => {
        const src = tagged`@keyframes ${'a } x'} { to { top: 0; } }`;
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([]);
      });

      it('reads a bodiless at-rule a value splits on its own', () => {
        const src = tagged`@import ${'"a.css"; top: 0'};`;
        expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
          legacy('@import "a.css"; top: 0;')
        );
      });
    });

    it.each([
      ['a closed function', tagged`width: ${'calc(1px + 2px)'};`, '.a{width:calc(1px + 2px);}'],
      ['a closed string', tagged`content: ${'"a)"'};`, '.a{content:"a)";}'],
      ['a slash', tagged`aspect-ratio: ${'1 / 2'};`, '.a{aspect-ratio:1 / 2;}'],
      [
        'a value inside a function',
        tagged`width: calc(${'1px'} + 2px);`,
        '.a{width:calc(1px + 2px);}',
      ],
      ['a value inside a string', tagged`content: "${'a'}";`, '.a{content:"a";}'],
      ['a closed bracket', tagged`grid-area: ${'[a]'};`, '.a{grid-area:[a];}'],
      ['a value inside a bracket', tagged`grid-area: [${'a'}] 1;`, '.a{grid-area:[a] 1;}'],
      ['a value in a selector bracket', tagged`&[a=${'b'}] { top: 0; }`, '.a[a=b]{top:0;}'],
      ['a comma in a selector function', tagged`&:is(${'a,b'}) { top: 0; }`, '.a:is(a,b){top:0;}'],
      ['a value after a semicolon in a bracket', tagged`--a: [b; ${'c'}];`, '.a{--a:[b; c];}'],
      ['a value in a brace in a bracket', tagged`--a: [{${'c'}}];`, '.a{--a:[{c}];}'],
      ['a value in a brace in a function', tagged`--a: f({${'c'}});`, '.a{--a:f({c});}'],
      ['a value after a semicolon in a string', tagged`content: "a;${'c'}";`, '.a{content:"a;c";}'],
    ])('emits %s', (_label, src, rule) => {
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
        rule,
      ]);
    });

    it.each([
      ['after a value', tagged`color: rgb(${'0'}/**/51/**/255);`],
      ['before and after a value', tagged`color: rgb(0/**/${'51'}/**/255);`],
      ['between values', tagged`color: rgb(${'0'}/**/${'51'}/**/${'255'});`],
    ])('keeps the tokens apart around a comment %s in a function call', (_label, src) => {
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
        '.a{color:rgb(0 51 255);}',
      ]);
    });

    it('drops a statement left open when no value is interpolated into it', () => {
      const src = tagged`color: ${'red'}; width: calc(1px; top: 0;`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
        '.a{color:red;}',
      ]);
    });

    it('joins the items of an array interpolation', () => {
      const src = tagged`color: ${['re', 'd'] as unknown};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red;')
      );
    });

    it('joins a fragment among the items of an array interpolation as text', () => {
      const frag = css`
        spin 1s
      `;
      const src = tagged`animation: ${[frag, ' linear'] as unknown};`;
      expect(compileWeb(src, {}, '.a')).toEqual(['.a{animation:spin 1s linear;}']);
    });

    it('parses block-level string interpolations containing CSS structure', () => {
      // Fragments returning structural CSS go through `parseValue`
      // (cached per-string) and splice the resulting nodes into the parent.
      const src = tagged`color: red; ${() => '&:hover { background: blue; }'} margin: 0;`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; &:hover { background: blue; } margin: 0;')
      );
    });

    it.each([
      ['beside a declaration', () => `/* don't */ background: blue;`, 'background:blue;'],
      [
        'inside a function call',
        () => `width: calc(1px /* don't */ + 2px);`,
        'width:calc(1px + 2px);',
      ],
    ])('strips a comment %s in a block-level string interpolation', (_label, fragment, decl) => {
      const src = tagged`color: red; ${fragment} margin: 0;`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual([
        `.a{color:red;${decl}margin:0;}`,
      ]);
    });

    it('parses block-level string interpolations with @media', () => {
      const src = tagged`color: red; ${() => '@media (min-width: 600px) { color: blue; }'}`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; @media (min-width: 600px) { color: blue; }')
      );
    });

    it('handles flat-decl block-level interpolations inline', () => {
      // A value with no `{` / `}` is a pure declaration sequence; it parses on its
      // own and its declarations splice in as siblings.
      const src = tagged`color: red; ${() => 'background: blue;'} margin: 0;`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toEqual(
        legacy('color: red; background: blue; margin: 0;', 'a')
      );
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

describe('dropMarked', () => {
  const M = REFERENCE_MARKER;

  it('drops the declaration, selector item, at-rule and keyframes stop holding the marker', () => {
    const root = parse(
      `color: ${M}; width: 1px; .a, .${M} { margin: 0; } .${M} { top: 0; } @media (${M}) { .c { top: 0; } } @keyframes k { from, ${M} { top: 0; left: ${M}; } ${M} { top: 1px; } }`
    );
    const kept = parse('width: 1px; .a { margin: 0; } @keyframes k { from { top: 0; } }');

    expect(dropMarked(root)).toEqual(kept);
  });

  it('never changes its input', () => {
    const root = parse(`color: ${M}; .a, .${M} { top: 0; }`);
    const before = JSON.stringify(root);

    dropMarked(root);

    expect(JSON.stringify(root)).toBe(before);
  });
});
