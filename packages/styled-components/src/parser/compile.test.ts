import css from '../constructors/css';
import Keyframes from '../models/Keyframes';
import StyleSheet from '../sheet';
import createCompiler from '../utils/cssCompile';
import { compileWeb } from './compile';
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
      expect(out!.join('')).not.toMatch(/[\0J]/);
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

    it('bails when sheet/compiler are not supplied', () => {
      // Native and test paths that don't provide sheet+compiler can't
      // register keyframes; fast path falls through to legacy.
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

  describe('bailout cases', () => {
    it('returns null for object interpolation', () => {
      const src = tagged`color: ${{ raw: 'red' } as unknown};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toBeNull();
    });

    it('returns null for array interpolation', () => {
      const src = tagged`color: ${['red', 'blue'] as unknown};`;
      expect(compileWeb(src, {}, '.a', { selfRefSelector: '.a', componentId: 'a' })).toBeNull();
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
  });
});
