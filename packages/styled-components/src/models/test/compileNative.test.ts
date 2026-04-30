/**
 * Direct unit tests on the native style compiler.
 *
 * Exercises the AST walker's bucket output (`base` / `conditional` / `keyframes`)
 * in isolation from the render pipeline. Integration behavior lives in
 * `src/native/test/modern-css.test.tsx`.
 */
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

    it('returns empty base for comment-only input', () => {
      const r = compile('/* just a comment */');
      expect(r.base).toEqual({});
      expect(r.conditional).toEqual([]);
    });

    it('preserves custom-property declarations', () => {
      const r = compile('--brand: hotpink;');
      expect(r.base).toEqual({ '--brand': 'hotpink' });
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
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Complex selectors'));
    });

    it('drops unknown pseudos with a warning', () => {
      const r = compile('&:unknown { color: red; }');
      expect(r.conditional).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Complex selectors'));
    });

    it('ignores pseudo rules with empty bodies', () => {
      const r = compile('&:hover { }');
      expect(r.conditional).toEqual([]);
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
  });

  describe('web-only at-rules', () => {
    it('warns and drops @font-face', () => {
      compile('@font-face { font-family: Foo; src: url(foo.woff); }');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@font-face'));
    });

    it('warns and drops @property', () => {
      compile('@property --foo { syntax: "<color>"; inherits: false; initial-value: red; }');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@property'));
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
      // Original entry may have been evicted — re-compile to confirm cache still functions.
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

    it('top-level comma fanout falls through when any selector is not a known pseudo', () => {
      const r = compile(`
        &:hover, .child {
          opacity: 0.5;
        }
      `);
      expect(r.conditional).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Complex selectors'));
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
    it('extracts theme sentinels from @keyframes frame decls into per-frame resolvers', () => {
      const r = compile(
        '@keyframes fade { 0% { opacity: 0; } 100% { opacity: \0sc:opacity.end:1; } }'
      );
      expect(r.keyframes.length).toBe(1);
      const kf = r.keyframes[0];
      expect(kf.name).toBe('fade');
      expect(kf.frames.length).toBe(2);
      // 0% frame is fully static
      expect(kf.frames[0].stops).toEqual(['0%']);
      expect(kf.frames[0].decls).toEqual({ opacity: 0 });
      expect(kf.frames[0].resolvers).toBeUndefined();
      // 100% frame has a sentinel that landed in resolvers
      expect(kf.frames[1].stops).toEqual(['100%']);
      expect(kf.frames[1].decls).toEqual({});
      expect(kf.frames[1].resolvers).toBeDefined();
      expect(kf.frames[1].resolvers!.length).toBe(1);
      expect(kf.frames[1].resolvers![0][0]).toBe('opacity');
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

  describe('@starting-style with dynamic values', () => {
    it('extracts theme sentinels from @starting-style into resolvers', () => {
      const r = compile('@starting-style { opacity: \0sc:opacity.start:0; }');
      // The static portion of starting-style strips out resolver-bearing
      // values; the resolvers go into startingStyleResolvers.
      expect(r.startingStyle).toEqual({});
      expect(r.startingStyleResolvers).toBeDefined();
      expect(r.startingStyleResolvers!.length).toBe(1);
      expect(r.startingStyleResolvers![0][0]).toBe('opacity');
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

  describe('sentinel-leak detection (dev-time)', () => {
    it('warns when a sentinel is concatenated with a leading number', () => {
      // Simulates `${p => 47 + t.space.xl}px` after JS evaluation: the
      // sentinel `\0sc:space.xl:55` got coerced to a string and glued to
      // the `47` literal.
      compile('padding-top: 47\0sc:space.xl:55px;');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('createTheme token leaked'));
    });

    it('does NOT warn for clean single-sentinel values', () => {
      compile('color: \0sc:colors.fg:#000;');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does NOT warn for properly-separated multi-sentinel values', () => {
      compile('border: \0sc:borderWidth.hairline:1px solid \0sc:colors.ink:#000;');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
