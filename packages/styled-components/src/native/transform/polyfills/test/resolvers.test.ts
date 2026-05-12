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
  fontSize: 16,
  lineHeight: 24,
  direction: 'ltr',
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

  // CSS Values 4 §6.1.1 — https://drafts.csswg.org/css-values-4/#rem
  describe('rem (CSS Values 4 §6.1.1)', () => {
    // "Equal to the computed value of font-size on the root element."
    it('resolves to rootFontSize × n', () => {
      expect(buildResolver('1rem')!(baseEnv)).toBe(16);
      expect(buildResolver('2rem')!(baseEnv)).toBe(32);
      expect(buildResolver('0.5rem')!(baseEnv)).toBe(8);
    });

    it('honors a custom rootFontSize from the env', () => {
      const env: ResolveEnv = { ...baseEnv, rootFontSize: 20 };
      expect(buildResolver('1rem')!(env)).toBe(20);
      expect(buildResolver('1.5rem')!(env)).toBe(30);
    });

    it('handles negative rem values', () => {
      expect(buildResolver('-1rem')!(baseEnv)).toBe(-16);
      expect(buildResolver('-0.25rem')!(baseEnv)).toBe(-4);
    });

    it('handles zero rem', () => {
      expect(buildResolver('0rem')!(baseEnv)).toBe(0);
    });

    it('rem regex does not absorb the trailing characters of similar units', () => {
      // `rem` and `em` share a suffix; the unit regex must match the
      // longer form first so `12rem` doesn't accidentally fold to
      // `12r` + `em`. Verified by checking that `1em` resolves
      // against fontSize, not rootFontSize.
      const env: ResolveEnv = { ...baseEnv, fontSize: 24, rootFontSize: 16 };
      expect(buildResolver('1em')!(env)).toBe(24);
      expect(buildResolver('1rem')!(env)).toBe(16);
    });
  });

  // CSS Values 4 §6.1.1 — https://drafts.csswg.org/css-values-4/#em
  describe('em / lh / rlh (CSS Values 4 §6.1.1)', () => {
    // "Equal to the computed value of the font-size property of the
    // element on which it is used."
    it('em resolves against env.fontSize', () => {
      const env: ResolveEnv = { ...baseEnv, fontSize: 20 };
      expect(buildResolver('1em')!(env)).toBe(20);
      expect(buildResolver('1.5em')!(env)).toBe(30);
      expect(buildResolver('-0.5em')!(env)).toBe(-10);
    });

    // "Equal to the computed value of the line-height property of
    // the element on which it is used."
    it('lh resolves against env.lineHeight', () => {
      const env: ResolveEnv = { ...baseEnv, lineHeight: 28 };
      expect(buildResolver('1lh')!(env)).toBe(28);
      expect(buildResolver('0.5lh')!(env)).toBe(14);
    });

    // "Equal to the computed value of the line-height property on
    // the root element." v7 today tracks one cascade.lineHeight
    // (parent-anchored); rlh matches lh until a future split tracks
    // root-only.
    it('rlh resolves against env.lineHeight', () => {
      const env: ResolveEnv = { ...baseEnv, lineHeight: 24 };
      expect(buildResolver('1rlh')!(env)).toBe(24);
      expect(buildResolver('2rlh')!(env)).toBe(48);
    });
  });

  // https://drafts.csswg.org/css-text-4/#text-align-property
  describe('text-align direction-aware sentinel (CSS Text 4 §7.1)', () => {
    // "start: aligns to the inline start edge of the line box."
    it('text-align: start resolves to `left` under ltr', () => {
      const env: ResolveEnv = { ...baseEnv, direction: 'ltr' };
      expect(buildResolver('\0scta:start')!(env)).toBe('left');
    });

    it('text-align: start resolves to `right` under rtl', () => {
      const env: ResolveEnv = { ...baseEnv, direction: 'rtl' };
      expect(buildResolver('\0scta:start')!(env)).toBe('right');
    });

    // "end: aligns to the inline end edge."
    it('text-align: end resolves to `right` under ltr', () => {
      const env: ResolveEnv = { ...baseEnv, direction: 'ltr' };
      expect(buildResolver('\0scta:end')!(env)).toBe('right');
    });

    it('text-align: end resolves to `left` under rtl', () => {
      const env: ResolveEnv = { ...baseEnv, direction: 'rtl' };
      expect(buildResolver('\0scta:end')!(env)).toBe('left');
    });

    // match-parent collapses to start in horizontal-tb (Yoga's only mode).
    it('text-align: match-parent resolves like start', () => {
      const env: ResolveEnv = { ...baseEnv, direction: 'ltr' };
      expect(buildResolver('\0scta:match-parent')!(env)).toBe('left');
      const rtl: ResolveEnv = { ...baseEnv, direction: 'rtl' };
      expect(buildResolver('\0scta:match-parent')!(rtl)).toBe('right');
    });
  });

  // Native runtimes do not have a "URL bar collapses" surface, so the
  // dynamic / smallest / largest variants of viewport units defined for
  // browsers all collapse to the same numeric result on this platform.
  // The collapse is enforced here so a future "split out smallest using
  // safe-area" refactor must update the test suite explicitly.
  it('treats vh / dvh / svh / lvh as identical on native', () => {
    expect(buildResolver('100vh')!(baseEnv)).toBe(800);
    expect(buildResolver('100dvh')!(baseEnv)).toBe(800);
    expect(buildResolver('100svh')!(baseEnv)).toBe(800);
    expect(buildResolver('100lvh')!(baseEnv)).toBe(800);
  });

  it('treats vw / dvw / svw / lvw as identical on native', () => {
    expect(buildResolver('50vw')!(baseEnv)).toBe(200);
    expect(buildResolver('50dvw')!(baseEnv)).toBe(200);
    expect(buildResolver('50svw')!(baseEnv)).toBe(200);
    expect(buildResolver('50lvw')!(baseEnv)).toBe(200);
  });

  it('handles negative viewport units (e.g. negative translate offsets)', () => {
    expect(buildResolver('-10vh')!(baseEnv)).toBe(-80);
    expect(buildResolver('-50vw')!(baseEnv)).toBe(-200);
    expect(buildResolver('-25vmin')!(baseEnv)).toBe(-100);
  });

  it('handles zero viewport units', () => {
    expect(buildResolver('0vh')!(baseEnv)).toBe(0);
    expect(buildResolver('0vw')!(baseEnv)).toBe(0);
    expect(buildResolver('0dvh')!(baseEnv)).toBe(0);
  });

  it('handles fractional viewport units', () => {
    expect(buildResolver('12.5vh')!(baseEnv)).toBe(100); // 12.5% of 800
    expect(buildResolver('.5vw')!(baseEnv)).toBe(2); // 0.5% of 400
    expect(buildResolver('33.333vw')!(baseEnv)).toBeCloseTo(133.332, 3);
  });

  it('is case-insensitive (CSS allows uppercase units)', () => {
    expect(buildResolver('100VH')!(baseEnv)).toBe(800);
    expect(buildResolver('50Vw')!(baseEnv)).toBe(200);
    expect(buildResolver('25DVH')!(baseEnv)).toBe(200);
    expect(buildResolver('10VMIN')!(baseEnv)).toBe(40);
  });

  it('updates when env.media.width / height change', () => {
    const r = buildResolver('100vh')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, height: 800 } })).toBe(800);
    expect(r({ ...baseEnv, media: { ...baseEnv.media, height: 1000 } })).toBe(1000);
    expect(r({ ...baseEnv, media: { ...baseEnv.media, height: 0 } })).toBe(0);

    const w = buildResolver('50vw')!;
    expect(w({ ...baseEnv, media: { ...baseEnv.media, width: 400 } })).toBe(200);
    expect(w({ ...baseEnv, media: { ...baseEnv.media, width: 1024 } })).toBe(512);
  });

  it('vmin / vmax pick the correct axis when orientation flips', () => {
    // Portrait: width < height
    const portrait = { ...baseEnv, media: { ...baseEnv.media, width: 400, height: 800 } };
    expect(buildResolver('100vmin')!(portrait)).toBe(400);
    expect(buildResolver('100vmax')!(portrait)).toBe(800);
    // Landscape: width > height
    const landscape = { ...baseEnv, media: { ...baseEnv.media, width: 1000, height: 600 } };
    expect(buildResolver('100vmin')!(landscape)).toBe(600);
    expect(buildResolver('100vmax')!(landscape)).toBe(1000);
    // Square
    const square = { ...baseEnv, media: { ...baseEnv.media, width: 500, height: 500 } };
    expect(buildResolver('100vmin')!(square)).toBe(500);
    expect(buildResolver('100vmax')!(square)).toBe(500);
  });

  it('does not match malformed viewport-unit strings', () => {
    // Bare unit (no number) is not a valid CSS dimension.
    expect(buildResolver('vh')).toBeNull();
    // Trailing junk after the unit suffix bails the regex.
    expect(buildResolver('100vhh')).toBeNull();
    expect(buildResolver('100vh ')).toBeNull();
    // Plus sign is not in the regex's number alternation; treated as junk.
    expect(buildResolver('+50vw')).toBeNull();
    // Number alone (no unit);would be a flat number, not a unit string.
    expect(buildResolver('100')).toBeNull();
  });

  it('resolves container units against the nearest registered container', () => {
    expect(buildResolver('50cqw')!(baseEnv)).toBe(100);
    expect(buildResolver('50cqh')!(baseEnv)).toBe(50);
    expect(buildResolver('50cqmin')!(baseEnv)).toBe(50);
    expect(buildResolver('50cqmax')!(baseEnv)).toBe(100);
  });

  it('falls back to the small viewport when no container is registered (Conditional 5 §7)', () => {
    // Spec: "If no eligible query container is available, then use the
    // small viewport size for that axis."
    expect(buildResolver('50cqw')!({ ...baseEnv, container: null })).toBe(200);
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
      // Numbers, hex colors, idents;common case;pass through untouched.
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

describe('dynamic math fn resolver;calc()', () => {
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

  it('resolves calc() with rem arm + static (Values 4 §6.1.1)', () => {
    const r = buildResolver('calc(2rem + 4px)')!;
    expect(r(baseEnv)).toBe(36);
  });

  it('resolves calc() rem against custom rootFontSize', () => {
    const r = buildResolver('calc(1.5rem - 2px)')!;
    expect(r({ ...baseEnv, rootFontSize: 20 })).toBe(28);
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

  it('static-mixed-unit calc resolves on native against container / viewport', () => {
    // Yoga can't parse calc strings. On native we evaluate the math
    // ourselves, with `%` operands resolved against the nearest
    // container's width (or viewport as fallback). Tests run with
    // `Platform.OS === 'ios'` per the RN jest preset, so this is the
    // native branch. baseEnv.container.width = 200.
    const calc = buildResolver('calc(33% - 5px)')!;
    // 33% of 200 = 66; 66 - 5 = 61.
    expect(calc(baseEnv)).toBe(61);

    const clamp = buildResolver('clamp(10px, 50%, 100px)')!;
    // 50% of 200 = 100; clamp(10, 100, 100) = 100.
    expect(clamp(baseEnv)).toBe(100);

    const min = buildResolver('min(50%, 200px)')!;
    // 50% of 200 = 100; min(100, 200) = 100.
    expect(min(baseEnv)).toBe(100);

    // Pure-px math also evaluates fine through this path.
    const allPx = buildResolver('calc(50px - 10px)')!;
    expect(allPx(baseEnv)).toBe(40);
  });

  it('static-mixed-unit calc falls back to viewport when no container is published', () => {
    // Without `container-type` on an ancestor, env.container is null
    // and the `%` base falls back to env.media.width (viewport). Useful
    // for top-level layouts where the screen is the implicit container.
    const calc = buildResolver('calc(50% - 4px)')!;
    // viewport = 400 → 50% of 400 = 200; 200 - 4 = 196.
    expect(calc({ ...baseEnv, container: null })).toBe(196);
  });

  it('static-mixed-unit calc returns null when neither container nor viewport are available', () => {
    // Pre-Dimensions hydration or torn-down environment. Drop the decl
    // rather than ship a value computed against bogus zero base.
    const calc = buildResolver('calc(33% - 5px)')!;
    expect(
      calc({
        ...baseEnv,
        container: null,
        media: { ...baseEnv.media, width: 0 },
      })
    ).toBeNull();
  });

  it('still emits a runtime resolver when a calc arm is dynamic', () => {
    // Sentinels (theme tokens), env(), light-dark(), and viewport /
    // container units all keep the runtime resolver path because the
    // value depends on render-time inputs that the layout engine alone
    // can't see (theme + safe-area + viewport / container metrics).
    expect(buildResolver('calc(\0sc:x:10px + 50%)')).not.toBeNull();
    expect(buildResolver('calc(env(safe-area-inset-top) + 10px)')).not.toBeNull();
    expect(buildResolver('calc(50vw - 10px)')).not.toBeNull();
    expect(buildResolver('calc(50cqw + 10px)')).not.toBeNull();
  });

  it('resolves unitless + % by converting % to px against the container', () => {
    // On native, every `%` operand (literal or surfaced from a
    // sentinel) converts to px against env.container.width or
    // env.media.width. baseEnv.container.width = 200, so 50% = 100;
    // adding the unitless sentinel value `10` gives 110px.
    const r = buildResolver('calc(\0sc:x:10 + 50%)')!;
    expect(r({ ...baseEnv, theme: { x: 10 } })).toBe(110);
  });

  it('resolves sentinel-derived % consistently with literal %', () => {
    // Sentinel that resolves to '10%' is a Percent operand in disguise;
    // it converts to px the same way as a literal Percent token.
    // x='10%' → 10% of 200 = 20px; plus 5% of 200 = 10px → 30px.
    const r = buildResolver('calc(\0sc:x:10 + 5%)')!;
    expect(r({ ...baseEnv, theme: { x: '10%' } })).toBe(30);
  });
});

describe('dynamic math fn resolver;min / max / clamp', () => {
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

  it('min/max % operands convert to px against the container width', () => {
    // On native, % converts to px before unifyUnits runs, so the typed
    // unit reduces to px. baseEnv.container.width = 200; 10% = 20px;
    // min(30, 20) = 20.
    const r = buildResolver('min(\0sc:x:50, 10%)')!;
    expect(r({ ...baseEnv, theme: { x: 30 } })).toBe(20);
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

  it('substitutes embedded light-dark inside compound values (box-shadow)', () => {
    // `box-shadow: 0 4px 8px light-dark(...)`;the call is embedded
    // inside a multi-token value so the top-level dispatch in
    // buildResolver can't catch it. The compound resolver substitutes
    // each call in place so the assembled string reaches RN with a
    // concrete color.
    const r = buildResolver(
      '0 4px 8px light-dark(rgba(14, 14, 16, 0.18), rgba(245, 243, 238, 0.08))'
    )!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      '0 4px 8px rgba(14, 14, 16, 0.18)'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      '0 4px 8px rgba(245, 243, 238, 0.08)'
    );
  });

  it('substitutes multiple embedded light-dark calls (multi-stop box-shadow)', () => {
    const r = buildResolver(
      '0 1px 1px light-dark(red, blue), 0 16px 28px light-dark(green, white)'
    )!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      '0 1px 1px red, 0 16px 28px green'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      '0 1px 1px blue, 0 16px 28px white'
    );
  });

  it('rejects identifier substrings ending in light-dark', () => {
    // `mylight-dark(...)` looks like a function call but isn't;the
    // boundary check (preceding char must be space / comma / paren /
    // slash / start-of-string) keeps it out.
    expect(buildResolver('1px solid mylight-dark(red, blue)')).toBeNull();
  });

  // ── CSS Color Module Level 5 spec compliance ──

  it('rejects light-dark with zero args (spec requires exactly two)', () => {
    expect(buildResolver('light-dark()')).toBeNull();
  });

  it('rejects light-dark with one arg', () => {
    expect(buildResolver('light-dark(red)')).toBeNull();
  });

  it('rejects light-dark with three or more args', () => {
    // Spec: light-dark( <color>, <color> );exactly two arguments.
    // Earlier behavior silently folded extras into the dark branch.
    expect(buildResolver('light-dark(red, blue, green)')).toBeNull();
    expect(buildResolver('light-dark(red, blue, green, yellow)')).toBeNull();
  });

  it('rejects light-dark with empty branches', () => {
    expect(buildResolver('light-dark(, blue)')).toBeNull();
    expect(buildResolver('light-dark(red, )')).toBeNull();
    expect(buildResolver('light-dark(,)')).toBeNull();
  });

  it('handles colors with internal commas (rgb / rgba) inside branches', () => {
    // The arg-comma vs. function-comma distinction relies on top-level
    // comma counting (parens nested inside an arg increment depth).
    const r = buildResolver('light-dark(rgb(255, 0, 0), rgb(0, 0, 255))')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      'rgb(255, 0, 0)'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      'rgb(0, 0, 255)'
    );
  });

  it('handles recursive light-dark (nested call inside a branch)', () => {
    // Per spec, light-dark args are <color>, which can itself contain
    // a light-dark call. Outer + inner both honor the active scheme,
    // and since both pick the same branch on a given scheme, the
    // result resolves to the leaf literal.
    const r = buildResolver('light-dark(light-dark(red, blue), green)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe('red');
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe('green');
  });

  it('substitutes light-dark embedded inside another function (gradient)', () => {
    const r = buildResolver(
      'linear-gradient(45deg, light-dark(red, blue), light-dark(green, yellow))'
    )!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      'linear-gradient(45deg, red, green)'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      'linear-gradient(45deg, blue, yellow)'
    );
  });

  it('resolves light-dark inside calc() to its branch numeric', () => {
    // Spec: light-dark args can be any computed-value-compatible
    // expression. Inside calc, our math evaluator delegates the
    // light-dark token to buildResolver, parses the literal length
    // result back to numeric, and continues arithmetic.
    const r = buildResolver('calc(light-dark(10px, 20px) + 5px)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(15);
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(25);
  });

  it('handles whitespace variations between args', () => {
    expect(
      buildResolver('light-dark(red,blue)')!({
        ...baseEnv,
        media: { ...baseEnv.media, colorScheme: 'light' },
      })
    ).toBe('red');
    expect(
      buildResolver('light-dark(red ,  blue)')!({
        ...baseEnv,
        media: { ...baseEnv.media, colorScheme: 'dark' },
      })
    ).toBe('blue');
  });
});

// ──────────────────────────────────────────────────────────────────────
// CSS Color Module Level 5 §7;`light-dark()` spec compliance.
// Drafts source: https://drafts.csswg.org/css-color-5/#light-dark
//
// Verbatim grammar from the spec:
//   light-dark() = <light-dark-color> | <light-dark-image>
//   <light-dark-color> = light-dark(<color>, <color>)
//   <light-dark-image> = light-dark( [ <image> | none ] , [ <image> | none ] )
//
// Spec quotes that drove these tests:
// - "Attempting to use one image and one color will result in a parse-time
//   error."
// - "computes to the computed value of the first color, if the used color
//   scheme is light or unknown, or to the computed value of the second
//   color, if the used color scheme is dark."
// - For images: "The none keyword produces a fully transparent image with
//   no natural size. It is equivalent to a single-stop gradient whose stop
//   color is transparent: linear-gradient(transparent)."
// ──────────────────────────────────────────────────────────────────────

describe('light-dark() spec compliance (CSS Color Module Level 5 §7)', () => {
  //;Form: <light-dark-color> ;

  it('color form: both branches are colors, returns first when light, second when dark', () => {
    const r = buildResolver('light-dark(red, blue)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe('red');
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe('blue');
  });

  //;Form: <light-dark-image> ;

  it('image form: url() in both branches resolves per scheme', () => {
    const r = buildResolver('light-dark(url("a.png"), url("b.png"))')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      'url("a.png")'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      'url("b.png")'
    );
  });

  it('image form: gradient functions in both branches resolve per scheme', () => {
    const r = buildResolver(
      'light-dark(linear-gradient(red, white), linear-gradient(black, blue))'
    )!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      'linear-gradient(red, white)'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      'linear-gradient(black, blue)'
    );
  });

  it('image form: `none` keyword in dark branch (transparent image fallback)', () => {
    const r = buildResolver('light-dark(url("a.png"), none)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      'url("a.png")'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe('none');
  });

  it('image form: both branches `none` is allowed', () => {
    const r = buildResolver('light-dark(none, none)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe('none');
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe('none');
  });

  //;Mixed form rejection (parse-time error per spec) ;

  it('rejects mixed form: image in light branch, color in dark branch', () => {
    expect(buildResolver('light-dark(url("a.png"), red)')).toBeNull();
    expect(buildResolver('light-dark(linear-gradient(red, blue), black)')).toBeNull();
  });

  it('rejects mixed form: color in light branch, image in dark branch', () => {
    expect(buildResolver('light-dark(red, url("a.png"))')).toBeNull();
    expect(buildResolver('light-dark(black, linear-gradient(red, blue))')).toBeNull();
  });

  it('rejects mixed form: `none` (image keyword) paired with a color', () => {
    // `none` is image-form syntax; pairing with a color is mixed.
    expect(buildResolver('light-dark(none, red)')).toBeNull();
    expect(buildResolver('light-dark(red, none)')).toBeNull();
  });

  //;Used color scheme determination ;

  it('used color scheme `light` selects the first branch', () => {
    const r = buildResolver('light-dark(red, blue)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe('red');
  });

  it('used color scheme `dark` selects the second branch', () => {
    const r = buildResolver('light-dark(red, blue)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe('blue');
  });

  it('used color scheme `unknown` selects the first branch (per spec: "light or unknown")', () => {
    // Spec: "if the used color scheme is light or unknown" → first arg.
    // We model "unknown" as any non-`dark` value: undefined, null, or
    // anything else from a misconfigured Appearance API.
    const r = buildResolver('light-dark(red, blue)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: undefined as any } })).toBe(
      'red'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: null as any } })).toBe('red');
  });

  //;Argument count (grammar enforces exactly two) ;

  it('grammar: rejects zero arguments', () => {
    expect(buildResolver('light-dark()')).toBeNull();
  });

  it('grammar: rejects one argument', () => {
    expect(buildResolver('light-dark(red)')).toBeNull();
  });

  it('grammar: rejects three or more arguments', () => {
    expect(buildResolver('light-dark(red, blue, green)')).toBeNull();
    expect(buildResolver('light-dark(red, blue, green, yellow)')).toBeNull();
  });

  it('grammar: rejects empty branches', () => {
    expect(buildResolver('light-dark(, blue)')).toBeNull();
    expect(buildResolver('light-dark(red, )')).toBeNull();
    expect(buildResolver('light-dark(,)')).toBeNull();
  });

  //;Color value forms allowed in branches (any <color>) ;

  it('accepts named colors in branches', () => {
    expect(
      buildResolver('light-dark(red, blue)')!({
        ...baseEnv,
        media: { ...baseEnv.media, colorScheme: 'light' },
      })
    ).toBe('red');
  });

  it('accepts hex colors in branches', () => {
    expect(
      buildResolver('light-dark(#fff, #000)')!({
        ...baseEnv,
        media: { ...baseEnv.media, colorScheme: 'light' },
      })
    ).toBe('#fff');
  });

  it('accepts rgb / rgba (with internal commas) in branches', () => {
    const r = buildResolver('light-dark(rgba(255, 0, 0, 0.5), rgb(0, 0, 255))')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      'rgba(255, 0, 0, 0.5)'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      'rgb(0, 0, 255)'
    );
  });

  it('accepts theme-token sentinels in branches', () => {
    const r = buildResolver('light-dark(\0sc:colors.bg:#fff, \0sc:colors.fg:#000)')!;
    expect(
      r({
        ...baseEnv,
        theme: { colors: { bg: '#fafafa', fg: '#1a1a1a' } },
        media: { ...baseEnv.media, colorScheme: 'light' },
      })
    ).toBe('#fafafa');
    expect(
      r({
        ...baseEnv,
        theme: { colors: { bg: '#fafafa', fg: '#1a1a1a' } },
        media: { ...baseEnv.media, colorScheme: 'dark' },
      })
    ).toBe('#1a1a1a');
  });

  //;Composition / nesting ;

  it('accepts nested light-dark in a branch (recursive)', () => {
    // Spec implication: <color> in a branch can itself be a light-dark()
    // call, since light-dark() resolves to a <color>.
    const r = buildResolver('light-dark(light-dark(red, orange), blue)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe('red');
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe('blue');
  });

  it('substitutes embedded light-dark inside a compound value (box-shadow)', () => {
    const r = buildResolver(
      '0 4px 8px light-dark(rgba(14, 14, 16, 0.18), rgba(245, 243, 238, 0.08))'
    )!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      '0 4px 8px rgba(14, 14, 16, 0.18)'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      '0 4px 8px rgba(245, 243, 238, 0.08)'
    );
  });

  it('substitutes multiple embedded light-dark calls (multi-stop box-shadow)', () => {
    const r = buildResolver(
      '0 1px 1px light-dark(red, blue), 0 16px 28px light-dark(green, white)'
    )!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      '0 1px 1px red, 0 16px 28px green'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      '0 1px 1px blue, 0 16px 28px white'
    );
  });

  it('substitutes light-dark embedded inside another function (gradient)', () => {
    const r = buildResolver(
      'linear-gradient(45deg, light-dark(red, blue), light-dark(green, yellow))'
    )!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(
      'linear-gradient(45deg, red, green)'
    );
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(
      'linear-gradient(45deg, blue, yellow)'
    );
  });

  it('resolves light-dark inside calc() to its branch numeric', () => {
    const r = buildResolver('calc(light-dark(10px, 20px) + 5px)')!;
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'light' } })).toBe(15);
    expect(r({ ...baseEnv, media: { ...baseEnv.media, colorScheme: 'dark' } })).toBe(25);
  });

  //;Identifier-substring / boundary behavior ;

  it('rejects identifier substrings ending in light-dark (no boundary before paren)', () => {
    expect(buildResolver('1px solid mylight-dark(red, blue)')).toBeNull();
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
  it('calc(env() + sentinel);the showcase Header pattern', () => {
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
      // Concatenated sentinel;same leak guard as templateResolver.
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

describe('math functions spec compliance (CSS Values Level 4 §10)', () => {
  // Spec source: https://drafts.csswg.org/css-values-4/#math
  // The polyfill scope covers calc / min / max / clamp over <length>,
  // <percentage>, and <number>. Other math functions (round, mod, rem,
  // sin, cos, etc.) and other dimension types (<angle>, <time>,
  // <frequency>, <resolution>, <flex>) are out of scope and assumed
  // invalid (resolver returns null, declaration is dropped).

  describe('§10.1 calc()', () => {
    // Spec: "The calc() function ... allows basic arithmetic to be
    // performed on numerical values, using addition (+), subtraction (-),
    // multiplication (*), division (/), and parentheses."

    it('addition: calc(10px + 5px) = 15px', () => {
      const r = buildResolver('calc(10px + 5px)')!;
      expect(r(baseEnv)).toBe(15);
    });

    it('subtraction: calc(10px - 3px) = 7px', () => {
      const r = buildResolver('calc(10px - 3px)')!;
      expect(r(baseEnv)).toBe(7);
    });

    it('multiplication (length × number): calc(2 * 5px) = 10px', () => {
      const r = buildResolver('calc(2 * 5px)')!;
      expect(r(baseEnv)).toBe(10);
    });

    it('division (length / number): calc(20px / 4) = 5px', () => {
      const r = buildResolver('calc(20px / 4)')!;
      expect(r(baseEnv)).toBe(5);
    });

    // Spec: "standard operator precedence rules (* and / bind tighter than
    // + and -, and operators are otherwise evaluated left-to-right)."
    it('precedence: calc(2 + 3 * 4) = 14', () => {
      const r = buildResolver('calc(2 + 3 * 4)')!;
      // calc resolves to a number; numericToCss returns it as a number.
      expect(r(baseEnv)).toBe(14);
    });

    it('left-to-right within +/-: calc(20 - 5 - 3) = 12', () => {
      const r = buildResolver('calc(20 - 5 - 3)')!;
      expect(r(baseEnv)).toBe(12);
    });

    it('left-to-right within * and /: calc(20 / 4 / 5) = 1', () => {
      const r = buildResolver('calc(20 / 4 / 5)')!;
      expect(r(baseEnv)).toBe(1);
    });

    // Spec: "Parentheses can be used to manipulate precedence: calc((2 +
    // 3) * 4) is instead equal to 20."
    it('parenthesized grouping: calc((2 + 3) * 4) = 20', () => {
      const r = buildResolver('calc((2 + 3) * 4)')!;
      expect(r(baseEnv)).toBe(20);
    });

    it('parenthesized grouping with mixed units: calc((10px + 5px) * 2) = 30px', () => {
      const r = buildResolver('calc((10px + 5px) * 2)')!;
      expect(r(baseEnv)).toBe(30);
    });

    it('parenthesized grouping in divisor: calc(2 / (3 + 1)) = 0.5', () => {
      const r = buildResolver('calc(2 / (3 + 1))')!;
      expect(r(baseEnv)).toBe(0.5);
    });

    // Spec: "Parentheses and nesting additional calc() functions are
    // equivalent; the preceding expression could equivalently have been
    // written as calc(calc(2 + 3) * 4)."
    it('nested calc() equivalent to parens: calc(calc(2 + 3) * 4) = 20', () => {
      const r = buildResolver('calc(calc(2 + 3) * 4)')!;
      expect(r(baseEnv)).toBe(20);
    });

    // Spec §10.8: "whitespace is required on both sides of the + and -
    // operators."
    it('rejects calc(10px+5px);whitespace required around + and -', () => {
      // CSS tokenizer reads `10px-5px` as two adjacent dimensions
      // (`10px` and `-5px`), not as subtraction. Same logic for `+`.
      // Without surrounding whitespace, the polyfill must reject.
      expect(buildResolver('calc(10px+5px)')).toBeNull();
      expect(buildResolver('calc(10px-5px)')).toBeNull();
    });

    // Spec §10.8: "The * and / operators can be used without white space
    // around them."
    it('accepts * and / flush against operands: calc(2*5px) = 10px', () => {
      const r = buildResolver('calc(2*5px)')!;
      expect(r(baseEnv)).toBe(10);
      const r2 = buildResolver('calc(20px/4)')!;
      expect(r2(baseEnv)).toBe(5);
    });

    it('rejects calc with no calculation: calc()', () => {
      expect(buildResolver('calc()')).toBeNull();
    });

    // Spec §10.1: "A calc() function contains a single calculation"
    it('rejects calc() with multiple comma-separated arguments', () => {
      expect(buildResolver('calc(100px, 50px)')).toBeNull();
    });

    it('rejects malformed calc with trailing operator: calc(10px +)', () => {
      expect(buildResolver('calc(10px +)')).toBeNull();
    });
  });

  describe('§10.2 min(), max(), clamp()', () => {
    // Spec: "The min() or max() functions contain one or more
    // comma-separated calculations, and represent the smallest (most
    // negative) or largest (most positive) of them, respectively."

    it('min returns the smallest operand: min(10px, 20px, 5px) = 5px', () => {
      const r = buildResolver('min(10px, 20px, 5px)')!;
      expect(r(baseEnv)).toBe(5);
    });

    it('max returns the largest operand: max(10px, 20px, 5px) = 20px', () => {
      const r = buildResolver('max(10px, 20px, 5px)')!;
      expect(r(baseEnv)).toBe(20);
    });

    it('min with a single argument acts as identity: min(10px) = 10px', () => {
      const r = buildResolver('min(10px)')!;
      expect(r(baseEnv)).toBe(10);
    });

    it('max with a single argument acts as identity: max(10px) = 10px', () => {
      const r = buildResolver('max(10px)')!;
      expect(r(baseEnv)).toBe(10);
    });

    // Spec: "the argument calculations can resolve to any <number>,
    // <dimension>, or <percentage>, but must have a consistent type or
    // else the function is invalid"
    it('mixes px with em now that em resolves against cascade.fontSize', () => {
      // em is a font-relative length (CSS Values 4 §6.1.1) — same
      // "length" type as px, so min() / max() accept the mix once
      // the cascade is plumbed.
      const env: ResolveEnv = { ...baseEnv, fontSize: 12 };
      // min(10px, 5em) = min(10, 60) = 10
      expect(buildResolver('min(10px, 5em)')!(env)).toBe(10);
      // max(10px, 5em) = max(10, 60) = 60
      expect(buildResolver('max(10px, 5em)')!(env)).toBe(60);
    });

    it('rejects empty min(): min()', () => {
      expect(buildResolver('min()')).toBeNull();
    });

    it('rejects empty max(): max()', () => {
      expect(buildResolver('max()')).toBeNull();
    });

    // Spec: "The clamp() function takes three calculations;a minimum
    // value, a central value, and a maximum value;and represents its
    // central calculation, clamped according to its min and max
    // calculations"
    it('clamp returns VAL when in range: clamp(5px, 10px, 20px) = 10px', () => {
      const r = buildResolver('clamp(5px, 10px, 20px)')!;
      expect(r(baseEnv)).toBe(10);
    });

    it('clamp returns MIN when VAL is below MIN: clamp(10px, 5px, 20px) = 10px', () => {
      const r = buildResolver('clamp(10px, 5px, 20px)')!;
      expect(r(baseEnv)).toBe(10);
    });

    it('clamp returns MAX when VAL is above MAX: clamp(10px, 30px, 20px) = 20px', () => {
      const r = buildResolver('clamp(10px, 30px, 20px)')!;
      expect(r(baseEnv)).toBe(20);
    });

    // Spec: "given clamp(MIN, VAL, MAX), it represents exactly the same
    // value as max(MIN, min(VAL, MAX))"
    it('clamp matches max(MIN, min(VAL, MAX)): clamp(0, 10, 20) = 10', () => {
      const r = buildResolver('clamp(0px, 10px, 20px)')!;
      expect(r(baseEnv)).toBe(10);
    });

    // Spec: "matching CSS conventions elsewhere, has its minimum value
    // 'win' over its maximum value if the two are in the 'wrong order'.
    // That is, clamp(100px, ..., 50px) will resolve to 100px"
    it('MIN wins over MAX when out of order: clamp(100px, 200px, 50px) = 100px', () => {
      const r = buildResolver('clamp(100px, 200px, 50px)')!;
      expect(r(baseEnv)).toBe(100);
    });

    it('MIN wins when MIN >= MAX even with VAL between: clamp(100px, 75px, 50px) = 100px', () => {
      const r = buildResolver('clamp(100px, 75px, 50px)')!;
      expect(r(baseEnv)).toBe(100);
    });

    it('rejects clamp with 0 args', () => {
      expect(buildResolver('clamp()')).toBeNull();
    });

    it('rejects clamp with 1 arg', () => {
      expect(buildResolver('clamp(10px)')).toBeNull();
    });

    it('rejects clamp with 2 args', () => {
      expect(buildResolver('clamp(10px, 50px)')).toBeNull();
    });

    it('rejects clamp with 4+ args', () => {
      expect(buildResolver('clamp(10px, 50px, 100px, 150px)')).toBeNull();
    });

    // Spec: "Either the min or max calculations (or even both) can
    // instead be the keyword none, which indicates the value is not
    // clamped from that side."
    it('clamp(none, VAL, MAX) is equivalent to min(VAL, MAX)', () => {
      const r = buildResolver('clamp(none, 30px, 20px)')!;
      expect(r(baseEnv)).toBe(20);
      const r2 = buildResolver('clamp(none, 5px, 20px)')!;
      expect(r2(baseEnv)).toBe(5);
    });

    it('clamp(MIN, VAL, none) is equivalent to max(MIN, VAL)', () => {
      const r = buildResolver('clamp(10px, 5px, none)')!;
      expect(r(baseEnv)).toBe(10);
      const r2 = buildResolver('clamp(10px, 30px, none)')!;
      expect(r2(baseEnv)).toBe(30);
    });

    it('clamp(none, VAL, none) is equivalent to calc(VAL)', () => {
      const r = buildResolver('clamp(none, 42px, none)')!;
      expect(r(baseEnv)).toBe(42);
    });
  });

  describe('§10.7.1 numeric constants e, pi', () => {
    // Spec: "Both of these keywords are <number>s, and resolve at parse
    // time. ASCII case-insensitive."

    it('pi resolves to the mathematical constant', () => {
      const r = buildResolver('calc(pi * 1)')!;
      const v = r(baseEnv) as number;
      expect(v).toBeCloseTo(Math.PI, 10);
    });

    it('e resolves to the mathematical constant', () => {
      const r = buildResolver('calc(e * 1)')!;
      const v = r(baseEnv) as number;
      expect(v).toBeCloseTo(Math.E, 10);
    });

    it('keywords are ASCII case-insensitive: PI, Pi, pI all resolve', () => {
      const a = buildResolver('calc(PI * 1)')!;
      const b = buildResolver('calc(Pi * 1)')!;
      const c = buildResolver('calc(pI * 1)')!;
      expect(a(baseEnv)).toBeCloseTo(Math.PI, 10);
      expect(b(baseEnv)).toBeCloseTo(Math.PI, 10);
      expect(c(baseEnv)).toBeCloseTo(Math.PI, 10);
    });

    it('combines with arithmetic: calc(pi * 2)', () => {
      const r = buildResolver('calc(pi * 2)')!;
      expect(r(baseEnv) as number).toBeCloseTo(Math.PI * 2, 10);
    });

    // Deviation from spec: bare `e` / `pi` are <number>s, so
    // `calc(pi * 1px)` is the canonical idiom for "π pixels".
    it('multiplied by a length yields a length: calc(pi * 1px)', () => {
      const r = buildResolver('calc(pi * 1px)')!;
      expect(r(baseEnv) as number).toBeCloseTo(Math.PI, 10);
    });
  });

  describe('§10.7.2 degenerate constants infinity, -infinity, NaN', () => {
    // RN's layout engine has no concept of an infinite or NaN dimension;
    // RN clamps unknown numerics to 0 silently. Per AGENTS.md polyfill
    // procedure, we warnOnce + drop the declaration so the developer
    // hears about the attempt instead of debugging a silent layout
    // collapse.

    it('infinity inside calc bails to null and warns', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        expect(buildResolver('calc(infinity * 1px)')).toBeNull();
        expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^\[sc\] `infinity`/));
      } finally {
        warn.mockRestore();
      }
    });

    it('-infinity inside calc bails to null and warns', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        expect(buildResolver('calc(-infinity * 1px)')).toBeNull();
        expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^\[sc\] `-infinity`/));
      } finally {
        warn.mockRestore();
      }
    });

    it('NaN inside calc bails to null and warns', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        expect(buildResolver('calc(NaN * 1px)')).toBeNull();
        expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^\[sc\] `NaN`/));
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('§10.9 type checking', () => {
    // Spec: '"unitless 0" <length>s aren\'t supported in math functions.
    // That is, width: calc(0 + 5px); is invalid, because it\'s trying to
    // add a <number> to a <length>'.
    it('rejects <number> + <length> at top level: calc(0 + 5px)', () => {
      expect(buildResolver('calc(0 + 5px)')).toBeNull();
    });

    it('accepts 0px + 5px (both <length>): calc(0px + 5px) = 5px', () => {
      const r = buildResolver('calc(0px + 5px)')!;
      expect(r(baseEnv)).toBe(5);
    });

    // Spec: "Algebraic simplifications do not affect the validity of a
    // math function or its resolved type. For example, calc(5px - 5px +
    // 10s) ... [is] invalid due to the attempt to add a length and a
    // time."
    it('rejects mixing <length> and <time>: calc(5px - 5px + 10s)', () => {
      // <time> is not in our polyfill scope; the resolver bails to null.
      expect(buildResolver('calc(5px - 5px + 10s)')).toBeNull();
    });

    // Spec §10.9: "Math functions that resolve to <number> can be used
    // anywhere that only accepts <integer>; the value is rounded to the
    // nearest integer as it resolves." We surface raw numerics; whoever
    // consumes them (transformDecl) handles integer rounding per prop.
    it('<number> result preserves precision: calc(20 / 4)', () => {
      const r = buildResolver('calc(20 / 4)')!;
      expect(r(baseEnv)).toBe(5);
    });
  });

  describe('§10.9.2 IEEE-754 corners (RN deviations)', () => {
    // Spec describes IEEE-754 ∞ and NaN propagation inside the
    // calculation tree, with top-level censoring (∞ → range-clamped, NaN
    // → 0). RN can't represent ∞ in dimensions, so the sensible
    // user-visible outcome is to drop the declaration. We do not warn
    // for division-by-zero / 0/0 because the source code already shows
    // the developer intent (a literal `/ 0`); a runtime warn would only
    // add noise.

    it('division by zero drops the declaration: calc(1 / 0)', () => {
      const r = buildResolver('calc(1 / 0)')!;
      expect(r(baseEnv)).toBeNull();
    });

    it('0 / 0 drops the declaration: calc(0 / 0)', () => {
      const r = buildResolver('calc(0 / 0)')!;
      expect(r(baseEnv)).toBeNull();
    });
  });

  describe('§10.9.1 percentage-bearing context (Native fallback)', () => {
    // Spec: "in top: calc(25% + 50px), the <percentage> is resolved as
    // normal for top, as if top: 25% were specified". RN can't compute
    // percentages against the containing block at layout time when the
    // expression involves mixed units, so the polyfill resolves % against
    // the nearest registered container, falling back to the viewport.
    // This is a documented native deviation: web takes the spec path
    // (% resolved against the actual containing block at paint time).

    it('static-mixed-unit calc resolves % against the container: calc(50% + 5px)', () => {
      // 50% of container width 200 = 100; +5 = 105.
      const r = buildResolver('calc(50% + 5px)')!;
      expect(r(baseEnv)).toBe(105);
    });

    it('falls back to viewport when no container is registered', () => {
      // 50% of viewport width 400 = 200; -10 = 190.
      const r = buildResolver('calc(50% - 10px)')!;
      expect(r({ ...baseEnv, container: null })).toBe(190);
    });

    it('drops the declaration when neither container nor viewport are available', () => {
      const r = buildResolver('calc(33% - 5px)')!;
      expect(
        r({
          ...baseEnv,
          container: null,
          media: { ...baseEnv.media, width: 0 },
        })
      ).toBeNull();
    });
  });
});

describe('env() spec compliance (CSS Environment Variables Level 1 §3)', () => {
  // Spec source: https://drafts.csswg.org/css-env-1/
  // Grammar: env() = env( <custom-ident> <integer [0,∞]>*, <declaration-value>? )
  // Polyfill scope on RN: safe-area-inset-{top,right,bottom,left} from
  // SafeAreaProvider. Other UA-defined names (safe-area-max-inset-*,
  // viewport-segment-*, preferred-text-scale) and any user-defined
  // (`--*`) names fall through to the fallback per §3 substitution
  // step 2; without a fallback the property drops per step 3.

  describe('§3 substitution algorithm', () => {
    // Spec: "If the name provided by the first argument of the env()
    // function is a recognized environment variable name ... replace
    // the env() function by the value of the named environment variable."
    it('safe-area-inset-top resolves against env.insets.top', () => {
      const r = buildResolver('env(safe-area-inset-top)')!;
      expect(r(baseEnv)).toBe(44);
      expect(r({ ...baseEnv, insets: { top: 60, right: 0, bottom: 0, left: 0 } })).toBe(60);
    });

    it('safe-area-inset-right / -bottom / -left also resolve', () => {
      const right = buildResolver('env(safe-area-inset-right)')!;
      const bottom = buildResolver('env(safe-area-inset-bottom)')!;
      const left = buildResolver('env(safe-area-inset-left)')!;
      const insets = { top: 1, right: 2, bottom: 3, left: 4 };
      expect(right({ ...baseEnv, insets })).toBe(2);
      expect(bottom({ ...baseEnv, insets })).toBe(3);
      expect(left({ ...baseEnv, insets })).toBe(4);
    });

    // Spec: "if the env() function has a fallback value as its second
    // argument, replace the env() function by the fallback value."
    it('unrecognised name with fallback returns the fallback', () => {
      const r = buildResolver('env(unknown-name, 5px)')!;
      expect(r(baseEnv)).toBe(5);
    });

    // Spec: "Otherwise, the property or descriptor containing the env()
    // function is invalid at computed-value time."
    it('unrecognised name without fallback drops the declaration', () => {
      const r = buildResolver('env(unknown-name)')!;
      expect(r(baseEnv)).toBeNull();
    });

    // Spec: "If there are any env() references in the fallback,
    // substitute them as well."
    it('recursive fallback substitutes nested env() calls', () => {
      const r = buildResolver('env(unknown-name, env(safe-area-inset-top))')!;
      expect(r(baseEnv)).toBe(44);
    });

    it('recursive fallback also drops when nested env is unresolvable', () => {
      const r = buildResolver('env(unknown-name, env(another-unknown))')!;
      expect(r(baseEnv)).toBeNull();
    });

    // Recognised names ignore their fallback per spec;substitution is
    // by the variable's value, not the fallback.
    it('recognised name ignores fallback', () => {
      const r = buildResolver('env(safe-area-inset-top, 999px)')!;
      expect(r(baseEnv)).toBe(44);
    });
  });

  describe('§3 fallback grammar', () => {
    // Spec: "The syntax of the fallback, like that of custom properties,
    // allows commas. For example, env(foo, red, blue) defines a fallback
    // of red, blue; that is, anything between the first comma and the
    // end of the function is considered a fallback value."
    it('multi-comma fallback preserves the entire post-first-comma slice', () => {
      const r = buildResolver('env(unknown-name, red, blue)')!;
      expect(r(baseEnv)).toBe('red, blue');
    });

    // Spec: "Like var(), a bare comma can be used with nothing
    // following it, indicating that the second <declaration-value> was
    // passed, just as an empty sequence." Empty value at computed time
    // makes the declaration invalid → drop.
    it('bare-comma empty fallback drops the declaration', () => {
      const r = buildResolver('env(unknown-name,)')!;
      expect(r(baseEnv)).toBeNull();
    });

    it('whitespace-only fallback drops the declaration', () => {
      const r = buildResolver('env(unknown-name,   )')!;
      expect(r(baseEnv)).toBeNull();
    });
  });

  describe('§3 indexed names + dimension matching', () => {
    // Spec grammar: "env() = env( <custom-ident> <integer [0,∞]>*, ...)".
    // Indices follow the name; dimension count must match. Polyfill
    // scope: 0-dim safe-area-inset-*;extra indices make the variable
    // unmatched, falling through to the fallback (or drop).
    it('extra index on a 0-dim variable falls through to fallback', () => {
      const r = buildResolver('env(safe-area-inset-top 0, 5px)')!;
      expect(r(baseEnv)).toBe(5);
    });

    it('extra index on a 0-dim variable without fallback drops', () => {
      const r = buildResolver('env(safe-area-inset-top 0)')!;
      expect(r(baseEnv)).toBeNull();
    });

    // viewport-segment-* are 2-dim per spec but unsupported on RN
    // (no folding-display API); always falls through.
    it('viewport-segment with two indices falls through to fallback', () => {
      const r = buildResolver('env(viewport-segment-width 0 0, 300px)')!;
      expect(r(baseEnv)).toBe(300);
    });
  });

  describe('§3 user-defined variables (custom properties)', () => {
    // Custom env vars are user-defined `--name`. The polyfill has no
    // user-var registry, so all `--*` names always fall through.
    it('custom property with fallback returns the fallback', () => {
      const r = buildResolver('env(--my-token, 12px)')!;
      expect(r(baseEnv)).toBe(12);
    });

    it('custom property without fallback drops', () => {
      const r = buildResolver('env(--my-token)')!;
      expect(r(baseEnv)).toBeNull();
    });
  });
});

describe('container units spec compliance (CSS Conditional 5 §7)', () => {
  // Spec source: https://www.w3.org/TR/css-conditional-5/#container-lengths
  // Polyfill scope: cqw, cqh, cqi, cqb, cqmin, cqmax. RN runs in
  // `horizontal-tb` writing-mode (Yoga's only supported mode), so
  // inline = horizontal and block = vertical.

  // Spec table:
  //   cqw   1% of a query container's width
  //   cqh   1% of a query container's height
  //   cqi   1% of a query container's inline size
  //   cqb   1% of a query container's block size
  //   cqmin smaller of cqi or cqb
  //   cqmax larger of cqi or cqb

  describe('§7 unit resolution against the registered container', () => {
    // Container is 200×100 in baseEnv; viewport is 400×800.
    it('cqw resolves to 1% of container width', () => {
      const r = buildResolver('50cqw')!;
      expect(r(baseEnv)).toBe(100);
    });

    it('cqh resolves to 1% of container height', () => {
      const r = buildResolver('50cqh')!;
      expect(r(baseEnv)).toBe(50);
    });

    it('cqi (inline axis) resolves to width in horizontal-tb', () => {
      const r = buildResolver('50cqi')!;
      expect(r(baseEnv)).toBe(100);
    });

    it('cqb (block axis) resolves to height in horizontal-tb', () => {
      const r = buildResolver('50cqb')!;
      expect(r(baseEnv)).toBe(50);
    });

    // Spec §7: "cqmin and cqmax units represent the larger or smaller
    // of the cqi and cqb units"
    it('cqmin resolves to the smaller of cqi or cqb', () => {
      const r = buildResolver('100cqmin')!;
      // cqi = 200, cqb = 100 → min = 100
      expect(r(baseEnv)).toBe(100);
    });

    it('cqmax resolves to the larger of cqi or cqb', () => {
      const r = buildResolver('100cqmax')!;
      // cqi = 200, cqb = 100 → max = 200
      expect(r(baseEnv)).toBe(200);
    });
  });

  describe('§7 no-container fallback', () => {
    // Spec: "If no eligible query container is available, then use the
    // small viewport size for that axis." On RN we treat env.media as
    // both the layout and small viewport (no chrome surface to differ).
    it('cqw with no container uses the viewport width (small viewport)', () => {
      const r = buildResolver('50cqw')!;
      expect(r({ ...baseEnv, container: null })).toBe(200); // 50% × 400
    });

    it('cqh with no container uses the viewport height', () => {
      const r = buildResolver('25cqh')!;
      expect(r({ ...baseEnv, container: null })).toBe(200); // 25% × 800
    });

    it('cqi with no container uses the viewport inline-axis (width)', () => {
      const r = buildResolver('50cqi')!;
      expect(r({ ...baseEnv, container: null })).toBe(200);
    });

    it('cqb with no container uses the viewport block-axis (height)', () => {
      const r = buildResolver('25cqb')!;
      expect(r({ ...baseEnv, container: null })).toBe(200);
    });

    it('cqmin with no container resolves against the viewport min axis', () => {
      const r = buildResolver('25cqmin')!;
      expect(r({ ...baseEnv, container: null })).toBe(100); // 25% × min(400, 800) = 100
    });

    it('cqmax with no container resolves against the viewport max axis', () => {
      const r = buildResolver('25cqmax')!;
      expect(r({ ...baseEnv, container: null })).toBe(200); // 25% × max(400, 800) = 200
    });
  });

  describe('numeric forms', () => {
    it('zero', () => {
      expect(buildResolver('0cqw')!(baseEnv)).toBe(0);
    });

    it('fractional', () => {
      // 50.5% × 200 = 101
      expect(buildResolver('50.5cqw')!(baseEnv)).toBe(101);
    });

    it('negative (e.g. negative offset)', () => {
      expect(buildResolver('-25cqw')!(baseEnv)).toBe(-50);
    });

    it('case-insensitive (CSS allows uppercase units)', () => {
      expect(buildResolver('50CQW')!(baseEnv)).toBe(100);
      // 50CqMaX = 50% × max(width=200, height=100) = 50% × 200 = 100
      expect(buildResolver('50CqMaX')!(baseEnv)).toBe(100);
    });
  });

  describe('inside math functions', () => {
    it('cqw inside calc resolves at evaluation time', () => {
      // 50cqw = 100, + 5 = 105
      const r = buildResolver('calc(50cqw + 5px)')!;
      expect(r(baseEnv)).toBe(105);
    });

    it('cqi inside clamp', () => {
      // clamp(50, 50cqi=100, 200) = 100
      const r = buildResolver('clamp(50px, 50cqi, 200px)')!;
      expect(r(baseEnv)).toBe(100);
    });

    it('cqmin inside min()', () => {
      // min(150, 100cqmin=100) = 100
      const r = buildResolver('min(150px, 100cqmin)')!;
      expect(r(baseEnv)).toBe(100);
    });
  });
});

describe('viewport units spec compliance (CSS Values Level 4 §6.1.2)', () => {
  // Spec source: https://drafts.csswg.org/css-values-4/#viewport-relative-lengths
  // Polyfill scope: vw / vh / vmin / vmax (default → large viewport)
  // plus all four variants (sv*, lv*, dv*) and the inline/block forms
  // (*vi, *vb). RN runs in horizontal-tb writing-mode, so inline axis =
  // width and block axis = height.

  // Spec §6.1.2.1: "the default viewport-percentage units (v*) are
  // defined with respect to the large viewport size." On RN there's no
  // URL-bar surface that retracts, so small / large / dynamic viewports
  // collapse to a single source;env.media. This is a UA-permitted
  // collapse per §6.1.2.1: "Whether the expansion/retraction of a
  // particular interface ... changes the sizes of all of the
  // viewport-percentage lengths simultaneously or contributes to the
  // differences ... is largely UA-dependent."

  // baseEnv viewport: 400 wide, 800 tall.

  describe('§6.1.2.2 width-axis units (vw / svw / lvw / dvw)', () => {
    it('vw resolves to 1% of viewport width', () => {
      expect(buildResolver('50vw')!(baseEnv)).toBe(200);
    });

    it('svw collapses to vw on RN (no chrome surface)', () => {
      expect(buildResolver('50svw')!(baseEnv)).toBe(200);
    });

    it('lvw collapses to vw on RN', () => {
      expect(buildResolver('50lvw')!(baseEnv)).toBe(200);
    });

    it('dvw collapses to vw on RN', () => {
      expect(buildResolver('50dvw')!(baseEnv)).toBe(200);
    });
  });

  describe('§6.1.2.2 height-axis units (vh / svh / lvh / dvh)', () => {
    it('vh resolves to 1% of viewport height', () => {
      expect(buildResolver('50vh')!(baseEnv)).toBe(400);
    });

    it('svh collapses to vh on RN', () => {
      expect(buildResolver('50svh')!(baseEnv)).toBe(400);
    });

    it('lvh collapses to vh on RN', () => {
      expect(buildResolver('50lvh')!(baseEnv)).toBe(400);
    });

    it('dvh collapses to vh on RN', () => {
      expect(buildResolver('50dvh')!(baseEnv)).toBe(400);
    });
  });

  describe('§6.1.2.2 inline-axis units (vi / svi / lvi / dvi)', () => {
    // Spec: "Equal to 1% of the size of the [...] viewport in the box's
    // inline axis." In horizontal-tb (RN's only mode), inline = width.
    it('vi resolves to 1% of viewport inline-axis (= width on RN)', () => {
      expect(buildResolver('50vi')!(baseEnv)).toBe(200);
    });

    it('svi / lvi / dvi all collapse to vi on RN', () => {
      expect(buildResolver('50svi')!(baseEnv)).toBe(200);
      expect(buildResolver('50lvi')!(baseEnv)).toBe(200);
      expect(buildResolver('50dvi')!(baseEnv)).toBe(200);
    });
  });

  describe('§6.1.2.2 block-axis units (vb / svb / lvb / dvb)', () => {
    // Spec: "Equal to 1% of the size of the [...] viewport in the box's
    // block axis." In horizontal-tb, block = height.
    it('vb resolves to 1% of viewport block-axis (= height on RN)', () => {
      expect(buildResolver('50vb')!(baseEnv)).toBe(400);
    });

    it('svb / lvb / dvb all collapse to vb on RN', () => {
      expect(buildResolver('50svb')!(baseEnv)).toBe(400);
      expect(buildResolver('50lvb')!(baseEnv)).toBe(400);
      expect(buildResolver('50dvb')!(baseEnv)).toBe(400);
    });
  });

  describe('§6.1.2.2 vmin / vmax', () => {
    // Spec: "Equal to the smaller of *vw or *vh" / "Equal to the larger".
    // baseEnv: width=400, height=800; min=400, max=800.
    it('vmin resolves to the smaller of vw or vh', () => {
      expect(buildResolver('50vmin')!(baseEnv)).toBe(200);
    });

    it('vmax resolves to the larger of vw or vh', () => {
      expect(buildResolver('50vmax')!(baseEnv)).toBe(400);
    });

    it('svmin / lvmin / dvmin all collapse to vmin on RN', () => {
      expect(buildResolver('50svmin')!(baseEnv)).toBe(200);
      expect(buildResolver('50lvmin')!(baseEnv)).toBe(200);
      expect(buildResolver('50dvmin')!(baseEnv)).toBe(200);
    });

    it('svmax / lvmax / dvmax all collapse to vmax on RN', () => {
      expect(buildResolver('50svmax')!(baseEnv)).toBe(400);
      expect(buildResolver('50lvmax')!(baseEnv)).toBe(400);
      expect(buildResolver('50dvmax')!(baseEnv)).toBe(400);
    });

    it('vmin / vmax pick the correct axis when orientation flips', () => {
      // Wide viewport: width=800, height=400. min=400, max=800.
      const wideEnv = { ...baseEnv, media: { ...baseEnv.media, width: 800, height: 400 } };
      expect(buildResolver('50vmin')!(wideEnv)).toBe(200);
      expect(buildResolver('50vmax')!(wideEnv)).toBe(400);
    });
  });

  describe('numeric forms', () => {
    it('zero', () => {
      expect(buildResolver('0vw')!(baseEnv)).toBe(0);
    });

    it('fractional', () => {
      expect(buildResolver('50.5vw')!(baseEnv)).toBe(202);
    });

    it('negative', () => {
      expect(buildResolver('-25vw')!(baseEnv)).toBe(-100);
    });

    it('case-insensitive (CSS allows uppercase units)', () => {
      expect(buildResolver('50VW')!(baseEnv)).toBe(200);
      expect(buildResolver('50DvHeIgHt'.replace(/eIgHt/, ''))!(baseEnv)).toBe(400);
    });
  });

  describe('inside math functions', () => {
    it('vw inside calc', () => {
      // 50vw=200, + 5 = 205
      expect(buildResolver('calc(50vw + 5px)')!(baseEnv)).toBe(205);
    });

    it('vh inside clamp', () => {
      // clamp(100, 50vh=400, 200) = 200
      expect(buildResolver('clamp(100px, 50vh, 200px)')!(baseEnv)).toBe(200);
    });

    it('vmin inside min', () => {
      // min(500, 50vmin=200) = 200
      expect(buildResolver('min(500px, 50vmin)')!(baseEnv)).toBe(200);
    });
  });
});

describe('rn-web bundle path (__NATIVE_WEB__ true)', () => {
  // `__NATIVE_WEB__` defaults to false in `src/test/globals.ts`. Flip it for
  // this block so the resolvers exercise the branch the rn-web bundle would
  // ship; restore in afterAll so subsequent suites stay on the native path.
  beforeAll(() => {
    (global as { __NATIVE_WEB__?: boolean }).__NATIVE_WEB__ = true;
  });
  afterAll(() => {
    (global as { __NATIVE_WEB__?: boolean }).__NATIVE_WEB__ = false;
  });

  describe('viewport units', () => {
    it('passes through static viewport values without a resolver', () => {
      // Returning null from buildResolver leaves the raw `<n><unit>` in
      // base so react-native-web forwards it to CSS unchanged. The browser
      // distinguishes dvh / svh / lvh per CSS Values 4 §6.1.2.2.
      expect(buildResolver('100vw')).toBeNull();
      expect(buildResolver('100vh')).toBeNull();
      expect(buildResolver('100dvh')).toBeNull();
      expect(buildResolver('100svh')).toBeNull();
      expect(buildResolver('100lvh')).toBeNull();
      expect(buildResolver('50vmin')).toBeNull();
      expect(buildResolver('50vmax')).toBeNull();
    });
  });

  describe('light-dark()', () => {
    // rn-web's `normalizeColor` (via `@react-native/normalize-colors`)
    // rejects `light-dark(...)` and would normalize to `undefined`
    // (transparent) before the browser sees it. To preserve native
    // browser theme reactivity, pure-static values bypass the resolver
    // entirely; `transformDecl` wraps them in a CSS custom-property
    // indirection so the browser does the work. Dynamic branches with
    // theme sentinels still resolve at render time.
    it('pure-static light-dark returns null so transformDecl can wrap it', () => {
      // null = no resolver; the literal `light-dark(...)` reaches the
      // DOM via the custom-property indirection.
      expect(buildResolver('light-dark(red, blue)')).toBeNull();
      expect(buildResolver('light-dark(#fafafa, #1a1a1a)')).toBeNull();
    });

    it('dynamic light-dark (sentinel branches) still resolves at render time', () => {
      // The browser doesn't know our theme tokens; we substitute them in
      // JS and pick the branch ourselves. Color-scheme changes still
      // re-render via the Appearance listener.
      const r = buildResolver('light-dark(\0sc:colors.bg:#fff, #111)')!;
      const env = { ...baseEnv, theme: { colors: { bg: '#fafafa' } } };
      expect(r(env)).toBe('#fafafa');
      expect(r({ ...env, media: { ...env.media, colorScheme: 'dark' } })).toBe('#111');
    });

    it('rejects mixed image + color forms regardless of host', () => {
      // Spec parse-time error; result must drop the declaration on both
      // hosts so styling stays predictable across iOS / Android / rn-web.
      expect(buildResolver('light-dark(red, linear-gradient(black, white))')).toBeNull();
    });
  });

  describe('color functions (oklch / oklab / lch / lab / color-mix)', () => {
    it('substitutes sentinels and emits the assembled function call', () => {
      // No conversion to sRGB hex on web; the browser handles wide gamut
      // (Display P3 / Rec. 2020) when the monitor supports it.
      const r = buildResolver('oklch(\0sc:c.l:.7 \0sc:c.c:.2 \0sc:c.h:200)')!;
      const env = { ...baseEnv, theme: { c: { l: '0.7', c: '0.2', h: '200' } } };
      expect(r(env)).toBe('oklch(0.7 0.2 200)');
    });
  });

  describe('calc() / clamp() / min() / max()', () => {
    it('passes through static-mixed-unit math expressions raw', () => {
      // The browser resolves `%` against the real containing block at
      // paint time, which is strictly more accurate than evaluating
      // against env.container.width on Yoga.
      const r = buildResolver('calc(33% - 5px)')!;
      expect(r(baseEnv)).toBe('calc(33% - 5px)');
      expect(buildResolver('clamp(10px, 50%, 100px)')!(baseEnv)).toBe('clamp(10px, 50%, 100px)');
    });

    it('still emits a runtime resolver when a calc arm needs substitution', () => {
      // Sentinels, env(), and viewport units have to be substituted
      // before the browser sees the value (the browser doesn't know
      // about our theme tokens or safe-area context). The resolver
      // substitutes and evaluates at render time.
      const r = buildResolver('calc(\0sc:gap:10 + 5px)')!;
      expect(r({ ...baseEnv, theme: { gap: 12 } })).toBe(17);
    });

    it('drops malformed math expressions instead of shipping garbage', () => {
      expect(buildResolver('calc(10px +)')).toBeNull();
    });
  });
});
