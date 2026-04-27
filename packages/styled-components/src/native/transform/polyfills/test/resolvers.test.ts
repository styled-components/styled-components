import { applyResolvers, buildResolver, ResolveEnv } from '../resolvers';

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
