import { applyResolvers, buildResolver, escapeSentinelFallback, ResolveEnv } from '../resolvers';

const baseEnv: ResolveEnv = {
  media: {
    width: 400,
    height: 800,
    colorScheme: 'light',
    reduceMotion: false,
    fontScale: 1,
    pixelRatio: 1,
  },
  container: { width: 200, height: 100 },
  theme: {},
  insets: { top: 44, right: 0, bottom: 34, left: 0 },
  rootFontSize: 16,
};

describe('runtime resolvers', () => {
  it('resolves viewport width units', () => {
    const r = buildResolver('50vw')!;
    expect(r(baseEnv)).toBe(200);
  });

  it('resolves viewport height units', () => {
    const r = buildResolver('100vh')!;
    expect(r(baseEnv)).toBe(800);
  });

  it('resolves vmin / vmax', () => {
    expect(buildResolver('10vmin')!(baseEnv)).toBe(40);
    expect(buildResolver('10vmax')!(baseEnv)).toBe(80);
  });

  it('treats dvh/svh/lvh the same as vh on native (no dynamic viewport)', () => {
    expect(buildResolver('100dvh')!(baseEnv)).toBe(800);
    expect(buildResolver('100svh')!(baseEnv)).toBe(800);
    expect(buildResolver('100lvh')!(baseEnv)).toBe(800);
  });

  it('resolves container units against the nearest registered container', () => {
    expect(buildResolver('50cqw')!(baseEnv)).toBe(100);
    expect(buildResolver('50cqh')!(baseEnv)).toBe(50);
    expect(buildResolver('50cqmin')!(baseEnv)).toBe(50);
    expect(buildResolver('50cqmax')!(baseEnv)).toBe(100);
  });

  it('falls back to the bare number when no container is registered', () => {
    expect(buildResolver('50cqw')!({ ...baseEnv, container: null })).toBe(50);
  });

  it('resolves light-dark() against Appearance', () => {
    const r = buildResolver('light-dark(#333, #eee)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe('#333');
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe('#eee');
  });

  it('resolves env(safe-area-inset-*)', () => {
    expect(buildResolver('env(safe-area-inset-top)')!(baseEnv)).toBe(44);
    expect(buildResolver('env(safe-area-inset-bottom)')!(baseEnv)).toBe(34);
  });

  it('env() with fallback returns the fallback for unknown names', () => {
    const r = buildResolver('env(keyboard-inset-top, 0px)')!;
    expect(r(baseEnv)).toBe(0);
  });

  it('returns null for non-resolvable strings', () => {
    expect(buildResolver('red')).toBeNull();
    expect(buildResolver('#fff')).toBeNull();
    expect(buildResolver('10px')).toBeNull();
    expect(buildResolver(50)).toBeNull();
  });

  it('resolves createTheme sentinel tokens against theme', () => {
    const r = buildResolver('\0sc:colors.bg:#fff')!;
    expect(r({ ...baseEnv, theme: { colors: { bg: '#111' } } })).toBe('#111');
    // Falls back when path missing
    expect(r(baseEnv)).toBe('#fff');
  });

  it('theme resolver walks nested paths safely', () => {
    const r = buildResolver('\0sc:spacing.md.desktop:16px')!;
    expect(r({ ...baseEnv, theme: { spacing: { md: { desktop: 24 } } } })).toBe(24);
    expect(r({ ...baseEnv, theme: { spacing: null } })).toBe('16px');
  });

  it('rejects theme paths that would walk the prototype chain', () => {
    expect(buildResolver('\0sc:__proto__.toString:fb')).toBeNull();
    expect(buildResolver('\0sc:constructor.name:fb')).toBeNull();
    expect(buildResolver('\0sc:colors.__proto__:fb')).toBeNull();
    expect(buildResolver('\0sc:prototype:fb')).toBeNull();
  });

  describe('escaped sentinel fallbacks (round-trip composite leaves)', () => {
    it('round-trips a comma-bearing fallback (rgba color)', () => {
      const escaped = escapeSentinelFallback('rgba(0,0,0,0.4)');
      // No literal commas; the tokenizer's terminator scan won't cut it.
      expect(escaped.indexOf(',')).toBe(-1);
      const r = buildResolver('\0sc:colors.shadow:' + escaped)!;
      // When theme is missing the path, the resolver returns the unescaped fallback
      expect(r({ ...baseEnv, theme: {} })).toBe('rgba(0,0,0,0.4)');
    });

    it('round-trips a slash-bearing fallback', () => {
      const escaped = escapeSentinelFallback('2px / 4px');
      expect(escaped.indexOf('/')).toBe(-1);
      expect(escaped.indexOf(' ')).toBe(-1);
      const r = buildResolver('\0sc:radius.composite:' + escaped)!;
      expect(r({ ...baseEnv, theme: {} })).toBe('2px / 4px');
    });

    it('round-trips a whitespace-bearing fallback (linear-gradient)', () => {
      const escaped = escapeSentinelFallback('linear-gradient(to right, red, blue)');
      const r = buildResolver('\0sc:gradients.brand:' + escaped)!;
      expect(r({ ...baseEnv, theme: {} })).toBe('linear-gradient(to right, red, blue)');
    });

    it('escape lead char `\\x01` itself round-trips when it appears in input', () => {
      const escaped = escapeSentinelFallback('a\x01b');
      const r = buildResolver('\0sc:weird:' + escaped)!;
      expect(r({ ...baseEnv, theme: {} })).toBe('a\x01b');
    });

    it('does NOT alter atomic fallbacks (no escape lead present)', () => {
      // Numbers, hex colors, idents — common case — pass through untouched.
      expect(escapeSentinelFallback('55px')).toBe('55px');
      expect(escapeSentinelFallback('#fafafa')).toBe('#fafafa');
      expect(escapeSentinelFallback('inherit')).toBe('inherit');
    });

    it('does NOT alter the resolved value when the theme provides the path', () => {
      const escaped = escapeSentinelFallback('rgba(0,0,0,0.4)');
      const r = buildResolver('\0sc:colors.shadow:' + escaped)!;
      // Theme provides actual value; escape is irrelevant.
      expect(r({ ...baseEnv, theme: { colors: { shadow: '#fff' } } })).toBe('#fff');
    });
  });
});

describe('applyResolvers', () => {
  it('overlays resolved values onto base', () => {
    const base = { color: 'red', padding: 10 };
    const r = [
      ['width', buildResolver('50vw')!],
      ['height', buildResolver('100vh')!],
    ] as const;
    const out = applyResolvers(base, r as any, baseEnv);
    expect(out).toEqual({ color: 'red', padding: 10, width: 200, height: 800 });
    // Does not mutate the base
    expect(base).toEqual({ color: 'red', padding: 10 });
  });

  it('drops keys when resolver returns null', () => {
    const r = [['keyboard', buildResolver('env(keyboard-inset-top)')!]] as const;
    const out = applyResolvers({ keyboard: 'env(...)' }, r as any, baseEnv);
    expect(out).toEqual({});
  });

  it('returns same ref for empty resolvers (no allocation)', () => {
    const base = { color: 'red' };
    const out = applyResolvers(base, [], baseEnv);
    expect(out).toBe(base);
  });
});

describe('dynamic math fn resolver — calc()', () => {
  it('resolves calc() with one sentinel arm + static', () => {
    const r = buildResolver('calc(\0sc:space.xl:55 + 47px)')!;
    expect(r({ ...baseEnv, theme: { space: { xl: 55 } } })).toBe(102);
  });

  it('honors theme override for the sentinel arm', () => {
    const r = buildResolver('calc(\0sc:space.xl:55 + 47px)')!;
    expect(r({ ...baseEnv, theme: { space: { xl: 100 } } })).toBe(147);
  });

  it('falls back to the sentinel fallback when path is missing', () => {
    const r = buildResolver('calc(\0sc:space.xl:55 + 47px)')!;
    expect(r({ ...baseEnv, theme: {} })).toBe(102);
  });

  it('resolves calc() with env() arm + static', () => {
    const r = buildResolver('calc(env(safe-area-inset-top) + 10px)')!;
    expect(r({ ...baseEnv, insets: { top: 47, right: 0, bottom: 0, left: 0 } })).toBe(57);
  });

  it('resolves calc() with viewport unit arm + static', () => {
    const r = buildResolver('calc(50vw + 10px)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, width: 400 } })).toBe(210);
  });

  it('resolves calc() with container unit arm + static', () => {
    const r = buildResolver('calc(50cqw + 10px)')!;
    expect(r({ ...baseEnv, container: { width: 200, height: 100 } })).toBe(110);
  });

  it('resolves calc() with two sentinel arms', () => {
    const r = buildResolver('calc(\0sc:a:1 + \0sc:b:2)')!;
    expect(r({ ...baseEnv, theme: { a: 5, b: 10 } })).toBe(15);
  });

  it('resolves calc() with subtraction', () => {
    const r = buildResolver('calc(\0sc:x:50 - 10px)')!;
    expect(r({ ...baseEnv, theme: { x: 30 } })).toBe(20);
  });

  it('resolves calc() with multiplication (sentinel × scalar)', () => {
    const r = buildResolver('calc(\0sc:x:10 * 3)')!;
    expect(r({ ...baseEnv, theme: { x: 7 } })).toBe(21);
  });

  it('resolves calc() with division', () => {
    const r = buildResolver('calc(\0sc:x:60 / 4)')!;
    expect(r({ ...baseEnv, theme: { x: 80 } })).toBe(20);
  });

  it('honors operator precedence (* over +)', () => {
    const r = buildResolver('calc(\0sc:x:10 + 2 * 5)')!;
    expect(r({ ...baseEnv, theme: { x: 10 } })).toBe(20);
  });

  it('resolves nested calc() with sentinel inner arm', () => {
    const r = buildResolver('calc(calc(\0sc:x:10 + 5px) + 3px)')!;
    expect(r({ ...baseEnv, theme: { x: 20 } })).toBe(28);
  });

  it('returns null for divide-by-zero', () => {
    const r = buildResolver('calc(\0sc:x:10 / 0)')!;
    expect(r({ ...baseEnv, theme: { x: 5 } })).toBeNull();
  });

  it('returns null for malformed calc() (missing operand)', () => {
    expect(buildResolver('calc(10px +)')).toBeNull();
  });

  it('mirrors static-fold leniency: unitless + % treats unitless as 0%', () => {
    // calc(10 + 50%) folds to '60%' in the static path because unifyUnits
    // allows mixing when one side is unit-less. Sentinels resolved to bare
    // numbers behave the same — caller should attach px/% explicitly when
    // they want a strict-unit check.
    const r = buildResolver('calc(\0sc:x:10 + 50%)')!;
    expect(r({ ...baseEnv, theme: { x: 10 } })).toBe('60%');
  });

  it('emits a percent-string when arms unify on %', () => {
    const r = buildResolver('calc(\0sc:x:10 + 5%)')!;
    expect(r({ ...baseEnv, theme: { x: '10%' } })).toBe('15%');
  });
});

describe('dynamic math fn resolver — min / max / clamp', () => {
  it('resolves min() with sentinel + static', () => {
    const r = buildResolver('min(\0sc:x:100, 50px)')!;
    expect(r({ ...baseEnv, theme: { x: 200 } })).toBe(50);
    expect(r({ ...baseEnv, theme: { x: 30 } })).toBe(30);
  });

  it('resolves max() with sentinel + static', () => {
    const r = buildResolver('max(\0sc:x:10, 50px)')!;
    expect(r({ ...baseEnv, theme: { x: 100 } })).toBe(100);
    expect(r({ ...baseEnv, theme: { x: 5 } })).toBe(50);
  });

  it('resolves clamp() with three resolvable arms', () => {
    const r = buildResolver('clamp(10px, \0sc:x:50, 100px)')!;
    expect(r({ ...baseEnv, theme: { x: 30 } })).toBe(30);
    expect(r({ ...baseEnv, theme: { x: 5 } })).toBe(10);
    expect(r({ ...baseEnv, theme: { x: 200 } })).toBe(100);
  });

  it('clamp() rejects malformed arity', () => {
    expect(buildResolver('clamp(10px, 50px)')).toBeNull();
    expect(buildResolver('clamp(10px, 50px, 100px, 150px)')).toBeNull();
  });

  it('min/max with viewport units', () => {
    const r = buildResolver('min(50vw, 150px)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, width: 200 } })).toBe(100);
    expect(r({ ...baseEnv, media: { ...baseEnv.media, width: 400 } })).toBe(150);
  });

  it('min/max with unitless sentinel + % follow static-fold leniency', () => {
    // Same rationale as calc(): unifyUnits allows '' to mix with a typed
    // unit. Result inherits the typed unit.
    const r = buildResolver('min(\0sc:x:50, 10%)')!;
    expect(r({ ...baseEnv, theme: { x: 30 } })).toBe('10%');
  });
});

describe('light-dark with sentinel branches', () => {
  it('resolves sentinel inside light branch', () => {
    const r = buildResolver('light-dark(\0sc:colors.bg:#fff, #111)')!;
    expect(
      r({
        ...baseEnv,
        theme: { colors: { bg: '#fafafa' } },
        media: { ...baseEnv.media, colorScheme: 'light' },
      })
    ).toBe('#fafafa');
  });

  it('resolves sentinel inside dark branch', () => {
    const r = buildResolver('light-dark(#fff, \0sc:colors.bg:#111)')!;
    expect(
      r({
        ...baseEnv,
        theme: { colors: { bg: '#222' } },
        media: { ...baseEnv.media, colorScheme: 'dark' },
      })
    ).toBe('#222');
  });

  it('falls back to fallback string when sentinel path is missing', () => {
    const r = buildResolver('light-dark(\0sc:colors.bg:#fff, #000)')!;
    expect(r({ ...baseEnv, theme: {}, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      '#fff'
    );
  });

  it('keeps literal strings working unchanged', () => {
    const r = buildResolver('light-dark(red, blue)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe('red');
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe('blue');
  });
});

describe('env() with resolvable fallback', () => {
  it('returns sentinel-resolved fallback when name is unknown', () => {
    const r = buildResolver('env(keyboard-inset-top, \0sc:space.md:16)')!;
    expect(r({ ...baseEnv, theme: { space: { md: 24 } } })).toBe(24);
  });

  it('returns sentinel fallback default when path missing', () => {
    const r = buildResolver('env(keyboard-inset-top, \0sc:space.md:16)')!;
    expect(r({ ...baseEnv, theme: {} })).toBe('16');
  });

  it('static fallback path still works for unknown names', () => {
    const r = buildResolver('env(keyboard-inset-top, 12px)')!;
    expect(r(baseEnv)).toBe(12);
  });

  it('safe-area-inset-* names ignore the fallback when env supplies a value', () => {
    const r = buildResolver('env(safe-area-inset-top, \0sc:fallback:99)')!;
    expect(r({ ...baseEnv, insets: { top: 47, right: 0, bottom: 0, left: 0 } })).toBe(47);
  });
});

describe('cross-feature integrations', () => {
  it('calc(env() + sentinel) — the showcase Header pattern', () => {
    const r = buildResolver('calc(env(safe-area-inset-top) + \0sc:space.xl:55)')!;
    const env = {
      ...baseEnv,
      insets: { top: 47, right: 0, bottom: 0, left: 0 },
      theme: { space: { xl: 55 } },
    };
    expect(r(env)).toBe(102);
  });

  it('calc(viewport + sentinel)', () => {
    const r = buildResolver('calc(10vw + \0sc:space.md:16)')!;
    expect(
      r({ ...baseEnv, media: { ...baseEnv.media, width: 500 }, theme: { space: { md: 8 } } })
    ).toBe(58);
  });

  it('clamp(sentinel, viewport, sentinel)', () => {
    const r = buildResolver('clamp(\0sc:min:100, 50vw, \0sc:max:300)')!;
    const env = (w: number, theme: any) => ({
      ...baseEnv,
      media: { ...baseEnv.media, width: w },
      theme,
    });
    expect(r(env(400, { min: 100, max: 300 }))).toBe(200); // 50vw of 400 = 200
    expect(r(env(100, { min: 100, max: 300 }))).toBe(100); // clamped low
    expect(r(env(800, { min: 100, max: 300 }))).toBe(300); // clamped high
  });

  it('boxShadow with embedded sentinel resolves to assembled string', () => {
    const r = buildResolver('0 1px 2px \0sc:colors.shadow:#000')!;
    expect(r({ ...baseEnv, theme: { colors: { shadow: 'rgba(0,0,0,0.4)' } } })).toBe(
      '0 1px 2px rgba(0,0,0,0.4)'
    );
  });

  it('boxShadow falls back to fallback when sentinel path is missing', () => {
    const r = buildResolver('0 1px 2px \0sc:colors.shadow:#000')!;
    expect(r({ ...baseEnv, theme: {} })).toBe('0 1px 2px #000');
  });

  it('transform with sentinel inside translateY()', () => {
    const r = buildResolver('translateY(\0sc:space.xl:55px)')!;
    expect(r({ ...baseEnv, theme: { space: { xl: 55 } } })).toBe('translateY(55px)');
  });

  it('multi-sentinel value (transform with two arms)', () => {
    const r = buildResolver('translateY(\0sc:y:10px) rotate(\0sc:angle:45deg)')!;
    expect(r({ ...baseEnv, theme: { y: '20px', angle: '90deg' } })).toBe(
      'translateY(20px) rotate(90deg)'
    );
  });

  it('backgroundImage linear-gradient with sentinel color stops', () => {
    const r = buildResolver('linear-gradient(\0sc:from:red, \0sc:to:blue)')!;
    expect(r({ ...baseEnv, theme: { from: '#fafafa', to: '#111111' } })).toBe(
      'linear-gradient(#fafafa, #111111)'
    );
  });

  it('templateResolver bails on JS-concat leak (47\\0sc:...) so warn fires downstream', () => {
    expect(buildResolver('47\0sc:space.xl:55')).toBeNull();
  });

  it('full-value single sentinel still uses themeResolver (preserves native return type)', () => {
    const r = buildResolver('\0sc:space.xl:55')!;
    // themeResolver returns the value directly, not a string
    expect(r({ ...baseEnv, theme: { space: { xl: 55 } } })).toBe(55);
    // typeof check confirms native type preservation
    const v = r({ ...baseEnv, theme: { space: { xl: 55 } } });
    expect(typeof v).toBe('number');
  });

  it('multi-token starting with sentinel routes to templateResolver', () => {
    // border shorthand normally splits these into 3 props, but if a
    // pass-through-like value lands here, templateResolver assembles it.
    const r = buildResolver('\0sc:borderWidth:1px solid \0sc:colors.ink:#000')!;
    expect(r({ ...baseEnv, theme: { borderWidth: '2px', colors: { ink: '#222' } } })).toBe(
      '2px solid #222'
    );
  });

  describe('color functions with sentinel channel arms', () => {
    it('oklch with sentinel L channel resolves to hex via static converter', () => {
      const r = buildResolver('oklch(\0sc:lightness:0.5 0.1 200)')!;
      const result = r({ ...baseEnv, theme: { lightness: 0.7 } });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^#[0-9a-f]{6,8}$/);
      // Different lightness yields different hex
      const result2 = r({ ...baseEnv, theme: { lightness: 0.3 } });
      expect(result2).not.toBe(result);
    });

    it('oklab with all sentinel channels', () => {
      const r = buildResolver('oklab(\0sc:l:0.5 \0sc:a:0.1 \0sc:b:-0.1)')!;
      const result = r({ ...baseEnv, theme: { l: 0.6, a: 0.05, b: -0.05 } });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('lch with sentinel chroma + hue', () => {
      const r = buildResolver('lch(50% \0sc:chroma:30 \0sc:hue:240)')!;
      expect(r({ ...baseEnv, theme: { chroma: 30, hue: 240 } })).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('lab with mixed sentinel + literal channels', () => {
      const r = buildResolver('lab(\0sc:l:50 25 -25)')!;
      expect(r({ ...baseEnv, theme: { l: 70 } })).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('oklch with sentinel values uses fallback when theme is missing the path', () => {
      const r = buildResolver('oklch(\0sc:lightness:0.6 0.1 200)')!;
      const result = r({ ...baseEnv, theme: {} });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('color-mix with sentinel color args resolves to hex', () => {
      const r = buildResolver('color-mix(in srgb, \0sc:colors.fg:#000 50%, \0sc:colors.bg:#fff)')!;
      const result = r({ ...baseEnv, theme: { colors: { fg: '#ff0000', bg: '#00ff00' } } });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('color-mix with one sentinel color and one static color', () => {
      const r = buildResolver('color-mix(in srgb, \0sc:colors.fg:#000 30%, white)')!;
      expect(r({ ...baseEnv, theme: { colors: { fg: '#0000ff' } } })).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('static-only color fns are NOT routed through the runtime path', () => {
      // Without sentinels, templateResolver returns null because there are
      // no segments to substitute, and colorFnResolver bails accordingly.
      // The static fold in transformDecl handles this case.
      expect(buildResolver('oklch(0.5 0.1 200)')).toBeNull();
    });

    it('color fn with malformed sentinel position still bails (defends against leaks)', () => {
      // Concatenated sentinel — same leak guard as templateResolver.
      expect(buildResolver('oklch(0.5\0sc:bad:0.1 200)')).toBeNull();
    });

    it('oklch with calc() arm containing a sentinel resolves end-to-end', () => {
      // `oklch(calc(${t.l} + 0.1) 0.2 240)` after fill becomes
      // `oklch(calc(\0sc:l:0.5 + 0.1) 0.2 240)`. templateResolver
      // substitutes the sentinel inside the calc(); readChannels then
      // folds the calc() statically.
      const r = buildResolver('oklch(calc(\0sc:l:0.5 + 0.1) 0.2 240)')!;
      const result = r({ ...baseEnv, theme: { l: 0.5 } });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('oklab with min() and max() in the a/b channels', () => {
      const r = buildResolver('oklab(\0sc:l:0.5 min(0.1, \0sc:cap:0.05) max(0, -0.05))')!;
      const result = r({ ...baseEnv, theme: { l: 0.6, cap: 0.04 } });
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('lch with clamp() bounding the chroma channel', () => {
      const r = buildResolver('lch(60% clamp(0, \0sc:c:50, 100) 200)')!;
      expect(r({ ...baseEnv, theme: { c: 50 } })).toMatch(/^#[0-9a-f]{6,8}$/);
    });

    it('color-mix with calc() percentage on the first color', () => {
      const r = buildResolver('color-mix(in srgb, \0sc:colors.fg:#000 calc(100% - 30%), white)')!;
      expect(r({ ...baseEnv, theme: { colors: { fg: '#0000ff' } } })).toMatch(/^#[0-9a-f]{6,8}$/);
    });
  });

  it('light-dark with calc inner is not supported (calc returns numeric, light-dark expects string output)', () => {
    // light-dark inner is treated as a value; calc inside is a viable arm
    // because buildResolver-> mathFnResolver returns a number. The dispatch
    // works because calcResolverFromFn yields numericToCss output which
    // is a number for px-units, valid for color-position contexts only if
    // RN accepts it. This test asserts no crash and a real number returns
    // for the chosen branch.
    const r = buildResolver('light-dark(calc(\0sc:x:10 + 5), 999)')!;
    expect(
      r({ ...baseEnv, theme: { x: 20 }, media: { ...baseEnv.media, colorScheme: 'light' } })
    ).toBe(25);
  });
});
