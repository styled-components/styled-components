import { matchMedia, MediaQueryEnv, parseMediaQuery, resetResponsiveCache } from '../responsive';

const env = (overrides: Partial<MediaQueryEnv> = {}): MediaQueryEnv => ({
  width: 375,
  height: 667,
  colorScheme: 'light',
  reduceMotion: false,
  fontScale: 1,
  pixelRatio: 2,
  ...overrides,
});

describe('parseMediaQuery', () => {
  beforeEach(() => resetResponsiveCache());

  it('parses a single feature', () => {
    const q = parseMediaQuery('(min-width: 400px)');
    expect(q).toHaveLength(1);
    expect(q[0]).toEqual([{ kind: 'minWidth', value: 400 }]);
  });

  it('caches parsed queries', () => {
    const a = parseMediaQuery('(min-width: 400px)');
    const b = parseMediaQuery('(min-width: 400px)');
    expect(a).toBe(b);
  });

  it('parses compound queries joined by `and`', () => {
    const q = parseMediaQuery('(min-width: 400px) and (orientation: portrait)');
    expect(q).toHaveLength(1);
    expect(q[0]).toEqual([
      { kind: 'minWidth', value: 400 },
      { kind: 'orientation', value: 'portrait' },
    ]);
  });

  it('parses comma-separated clauses as OR', () => {
    const q = parseMediaQuery('(max-width: 400px), (orientation: landscape)');
    expect(q).toHaveLength(2);
  });
});

describe('matchMedia', () => {
  beforeEach(() => resetResponsiveCache());

  describe('min-width / max-width', () => {
    it('matches when viewport >= min-width', () => {
      expect(matchMedia('(min-width: 320px)', env({ width: 375 }))).toBe(true);
    });

    it('rejects when viewport < min-width', () => {
      expect(matchMedia('(min-width: 400px)', env({ width: 375 }))).toBe(false);
    });

    it('matches when viewport <= max-width', () => {
      expect(matchMedia('(max-width: 400px)', env({ width: 375 }))).toBe(true);
    });

    it('rejects when viewport > max-width', () => {
      expect(matchMedia('(max-width: 300px)', env({ width: 375 }))).toBe(false);
    });

    it('accepts em/rem units (treated as 16px)', () => {
      expect(matchMedia('(min-width: 20em)', env({ width: 320 }))).toBe(true); // 20*16=320
      expect(matchMedia('(min-width: 21em)', env({ width: 320 }))).toBe(false);
    });
  });

  describe('orientation', () => {
    it('detects portrait when height >= width', () => {
      expect(matchMedia('(orientation: portrait)', env({ width: 375, height: 667 }))).toBe(true);
      expect(matchMedia('(orientation: landscape)', env({ width: 375, height: 667 }))).toBe(false);
    });

    it('detects landscape when width > height', () => {
      expect(matchMedia('(orientation: landscape)', env({ width: 800, height: 400 }))).toBe(true);
      expect(matchMedia('(orientation: portrait)', env({ width: 800, height: 400 }))).toBe(false);
    });
  });

  describe('prefers-color-scheme', () => {
    it('matches light in light env', () => {
      expect(matchMedia('(prefers-color-scheme: light)', env({ colorScheme: 'light' }))).toBe(true);
    });

    it('rejects dark in light env', () => {
      expect(matchMedia('(prefers-color-scheme: dark)', env({ colorScheme: 'light' }))).toBe(false);
    });

    it('matches dark in dark env', () => {
      expect(matchMedia('(prefers-color-scheme: dark)', env({ colorScheme: 'dark' }))).toBe(true);
    });
  });

  describe('prefers-reduced-motion', () => {
    it('matches reduce when reduceMotion is true', () => {
      expect(matchMedia('(prefers-reduced-motion: reduce)', env({ reduceMotion: true }))).toBe(
        true
      );
    });

    it('matches no-preference when reduceMotion is false', () => {
      expect(
        matchMedia('(prefers-reduced-motion: no-preference)', env({ reduceMotion: false }))
      ).toBe(true);
    });
  });

  describe('aspect-ratio', () => {
    it('matches min-aspect-ratio when viewport is wider than the ratio', () => {
      // 16/9 ≈ 1.778 — a 1920×1080 window (1.778) matches; a 4:3 window (1.333) does not
      expect(matchMedia('(min-aspect-ratio: 16/9)', env({ width: 1920, height: 1080 }))).toBe(true);
      expect(matchMedia('(min-aspect-ratio: 16/9)', env({ width: 1024, height: 768 }))).toBe(false);
    });

    it('matches max-aspect-ratio when viewport is narrower than the ratio', () => {
      expect(matchMedia('(max-aspect-ratio: 1/1)', env({ width: 375, height: 667 }))).toBe(true);
      expect(matchMedia('(max-aspect-ratio: 1/1)', env({ width: 800, height: 400 }))).toBe(false);
    });

    it('matches exact aspect-ratio with float tolerance', () => {
      expect(matchMedia('(aspect-ratio: 16/9)', env({ width: 1920, height: 1080 }))).toBe(true);
      expect(matchMedia('(aspect-ratio: 1/1)', env({ width: 500, height: 500 }))).toBe(true);
      expect(matchMedia('(aspect-ratio: 16/9)', env({ width: 1024, height: 768 }))).toBe(false);
    });

    it('treats a bare number as ratio/1', () => {
      expect(matchMedia('(min-aspect-ratio: 1.5)', env({ width: 600, height: 400 }))).toBe(true);
      expect(matchMedia('(min-aspect-ratio: 2)', env({ width: 600, height: 400 }))).toBe(false);
    });

    it('tolerates whitespace around the slash', () => {
      expect(matchMedia('(min-aspect-ratio: 4 / 3)', env({ width: 400, height: 300 }))).toBe(true);
    });

    it('rejects malformed values without falling through to always-true', () => {
      // Bad ratios → feature returns null → query parses to no clauses → matchMedia returns false
      expect(matchMedia('(min-aspect-ratio: 0/1)', env({ width: 800, height: 600 }))).toBe(false);
      expect(matchMedia('(min-aspect-ratio: 1/0)', env({ width: 800, height: 600 }))).toBe(false);
      expect(matchMedia('(min-aspect-ratio: -1/1)', env({ width: 800, height: 600 }))).toBe(false);
      expect(matchMedia('(min-aspect-ratio: foo)', env({ width: 800, height: 600 }))).toBe(false);
    });

    it('safely handles zero-height env without dividing by zero', () => {
      expect(matchMedia('(min-aspect-ratio: 1/1)', env({ width: 100, height: 0 }))).toBe(false);
    });

    it('combines with orientation in compound clauses', () => {
      // Wide-and-landscape should match; portrait-but-wide-ratio is impossible (height >= width
      // implies ratio <= 1) so this combo proves AND semantics.
      expect(
        matchMedia(
          '(min-aspect-ratio: 16/9) and (orientation: landscape)',
          env({ width: 1920, height: 1080 })
        )
      ).toBe(true);
      expect(
        matchMedia(
          '(min-aspect-ratio: 16/9) and (orientation: portrait)',
          env({ width: 1920, height: 1080 })
        )
      ).toBe(false);
    });

    it('caches parsed aspect-ratio queries', () => {
      const a = parseMediaQuery('(min-aspect-ratio: 16/9)');
      const b = parseMediaQuery('(min-aspect-ratio: 16/9)');
      expect(a).toBe(b);
      expect(a[0]).toEqual([{ kind: 'aspectRatio', min: 16 / 9 }]);
    });
  });

  describe('compound and OR queries', () => {
    it('evaluates AND of features', () => {
      expect(
        matchMedia(
          '(min-width: 300px) and (orientation: portrait)',
          env({ width: 375, height: 667 })
        )
      ).toBe(true);

      expect(
        matchMedia(
          '(min-width: 300px) and (orientation: landscape)',
          env({ width: 375, height: 667 })
        )
      ).toBe(false);
    });

    it('evaluates OR across clauses', () => {
      const q = '(max-width: 320px), (orientation: landscape)';
      expect(matchMedia(q, env({ width: 375, height: 667 }))).toBe(false); // 375px portrait → neither matches
      expect(matchMedia(q, env({ width: 800, height: 400 }))).toBe(true); // landscape matches
      expect(matchMedia(q, env({ width: 300, height: 400 }))).toBe(true); // ≤320 matches
    });
  });

  describe('range syntax (CSS Media Queries Level 4)', () => {
    it('matches strict greater-than: (width > N)', () => {
      expect(matchMedia('(width > 400px)', env({ width: 500 }))).toBe(true);
      expect(matchMedia('(width > 400px)', env({ width: 400 }))).toBe(false);
      expect(matchMedia('(width > 400px)', env({ width: 300 }))).toBe(false);
    });

    it('matches inclusive greater-than-or-equal: (width >= N)', () => {
      expect(matchMedia('(width >= 400px)', env({ width: 500 }))).toBe(true);
      expect(matchMedia('(width >= 400px)', env({ width: 400 }))).toBe(true);
      expect(matchMedia('(width >= 400px)', env({ width: 399 }))).toBe(false);
    });

    it('matches strict less-than: (width < N)', () => {
      expect(matchMedia('(width < 400px)', env({ width: 300 }))).toBe(true);
      expect(matchMedia('(width < 400px)', env({ width: 400 }))).toBe(false);
    });

    it('matches inclusive less-than-or-equal: (width <= N)', () => {
      expect(matchMedia('(width <= 400px)', env({ width: 400 }))).toBe(true);
      expect(matchMedia('(width <= 400px)', env({ width: 401 }))).toBe(false);
    });

    it('accepts reversed-operand form: (N op width)', () => {
      // 400 < width ≡ width > 400
      expect(matchMedia('(400px < width)', env({ width: 500 }))).toBe(true);
      expect(matchMedia('(400px < width)', env({ width: 400 }))).toBe(false);
      // 400 <= width ≡ width >= 400
      expect(matchMedia('(400px <= width)', env({ width: 400 }))).toBe(true);
    });

    it('matches sandwich form: (lo <= width <= hi)', () => {
      expect(matchMedia('(400px <= width <= 800px)', env({ width: 400 }))).toBe(true);
      expect(matchMedia('(400px <= width <= 800px)', env({ width: 600 }))).toBe(true);
      expect(matchMedia('(400px <= width <= 800px)', env({ width: 800 }))).toBe(true);
      expect(matchMedia('(400px <= width <= 800px)', env({ width: 399 }))).toBe(false);
      expect(matchMedia('(400px <= width <= 800px)', env({ width: 801 }))).toBe(false);
    });

    it('matches sandwich strict form: (lo < width < hi)', () => {
      expect(matchMedia('(400px < width < 800px)', env({ width: 400 }))).toBe(false);
      expect(matchMedia('(400px < width < 800px)', env({ width: 500 }))).toBe(true);
      expect(matchMedia('(400px < width < 800px)', env({ width: 800 }))).toBe(false);
    });

    it('handles height-dimension ranges', () => {
      expect(matchMedia('(height > 600px)', env({ height: 800 }))).toBe(true);
      expect(matchMedia('(height > 600px)', env({ height: 400 }))).toBe(false);
      expect(matchMedia('(400px <= height <= 900px)', env({ height: 500 }))).toBe(true);
    });

    it('combines range syntax with other features via `and`', () => {
      expect(
        matchMedia('(width >= 400px) and (orientation: portrait)', env({ width: 500, height: 800 }))
      ).toBe(true);
      expect(
        matchMedia(
          '(width >= 400px) and (orientation: landscape)',
          env({ width: 500, height: 800 })
        )
      ).toBe(false);
    });

    it('combines width and height ranges via `and`', () => {
      expect(
        matchMedia('(width >= 400px) and (height >= 600px)', env({ width: 500, height: 800 }))
      ).toBe(true);
      expect(
        matchMedia('(width >= 400px) and (height >= 600px)', env({ width: 500, height: 400 }))
      ).toBe(false);
    });

    it('rejects mixed-direction sandwich forms', () => {
      // `400 < width > 300` is nonsensical; should fail to match silently.
      expect(matchMedia('(400px < width > 300px)', env({ width: 500 }))).toBe(false);
    });

    it('rejects malformed range expressions', () => {
      expect(matchMedia('(width >)', env({ width: 500 }))).toBe(false);
      expect(matchMedia('(> 400px)', env({ width: 500 }))).toBe(false);
      expect(matchMedia('(foo > 400px)', env({ width: 500 }))).toBe(false);
    });
  });

  describe('malformed input', () => {
    it('returns false for empty query', () => {
      expect(matchMedia('', env())).toBe(false);
    });

    it('ignores unknown features silently', () => {
      expect(matchMedia('(unsupported-feature: foo)', env())).toBe(false);
    });

    it('treats bare features with no colon as always-true (css-like `all`)', () => {
      expect(matchMedia('(all)', env())).toBe(true);
    });
  });
});
