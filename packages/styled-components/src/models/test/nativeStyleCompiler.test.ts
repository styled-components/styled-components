/**
 * Direct unit tests on the native style compiler.
 *
 * Exercises the AST walker's bucket output (`base` / `conditional` / `keyframes`)
 * in isolation from the render pipeline. Integration behavior lives in
 * `src/native/test/modern-css.test.tsx`.
 */
import {
  compileNativeStyles,
  CompiledNativeStyles,
  resetNativeStyleCache,
} from '../nativeStyleCompiler';

const stubStyleSheet = {
  create: <T extends object>(styles: T) => styles,
} as any;

function compile(css: string): CompiledNativeStyles {
  return compileNativeStyles(css, stubStyleSheet);
}

describe('compileNativeStyles', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetNativeStyleCache();
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
    it('collects keyframe frames as [stops, decl-pairs]', () => {
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
            { stops: ['0%'], decls: [['opacity', '0']] },
            { stops: ['50%', '75%'], decls: [['opacity', '0.5']] },
            { stops: ['100%'], decls: [['opacity', '1']] },
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
});
