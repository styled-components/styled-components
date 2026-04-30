/**
 * Microbenchmarks for the native responsive runtime.
 *
 * parseMediaQuery, matchMedia, and the native style compiler sit on the native
 * render hot path — every re-render that carries conditional CSS walks these.
 * Results guide whether we need to change the data shape or memoize harder.
 *
 * Run with `pnpm --filter styled-components bench:web` (the bench jest config
 * picks up `.bench.test.ts`).
 */
import { toNativeStyles, resetNativeStyleCache } from '../models/compileNative';
// Access to the content-cache reset only (keeps pair-level memoisation warm,
// which is the realistic production shape — users see new unique CSS strings
// but the prop/value pairs within recur across components).
import generateComponentId from '../utils/generateComponentId';
import {
  matchMedia,
  MediaQueryEnv,
  parseMediaQuery,
  resetResponsiveCache,
} from '../native/responsive';
import { bench } from './bench-utils';

const stubStyleSheet = {
  create: <T extends object>(styles: T) => styles,
} as any;

const env375: MediaQueryEnv = {
  width: 375,
  height: 667,
  colorScheme: 'light',
  reduceMotion: false,
  fontScale: 1,
  pixelRatio: 2,
};
const env1024: MediaQueryEnv = { ...env375, width: 1024, height: 768 };

const QUERIES = {
  simple: '(min-width: 400px)',
  compound: '(min-width: 400px) and (orientation: portrait)',
  rangeSimple: '(width >= 400px)',
  rangeSandwich: '(400px <= width <= 800px)',
  orClauses: '(max-width: 320px), (min-width: 1024px)',
  complex:
    '(min-width: 400px) and (orientation: portrait), (width >= 800px) and (prefers-color-scheme: dark)',
};

const CSS_SAMPLES = {
  flat: `
    color: red;
    padding-top: 8px;
    border-radius: 4px;
    background-color: white;
    font-size: 14px;
  `,
  oneMedia: `
    color: red;
    padding-top: 8px;
    @media (min-width: 500px) {
      color: blue;
      padding-top: 16px;
    }
  `,
  oneContainer: `
    color: red;
    @container card (min-width: 300px) {
      color: blue;
    }
  `,
  composite: `
    color: black;
    padding: 8px;
    border-radius: 4px;
    @media (min-width: 500px) {
      padding: 16px;
    }
    @container card (min-width: 300px) {
      color: blue;
      &:active { opacity: 0.5; }
    }
    &:hover { color: purple; }
    &:focus { border-color: red; }
    &:disabled { opacity: 0.3; }
  `,
  heavy: (() => {
    // 10 media queries + 5 container queries + 4 pseudos — stress the walker.
    let css = 'color: black; padding: 4px;';
    for (let i = 0; i < 10; i++) {
      css += `@media (min-width: ${i * 100}px) { padding-top: ${i}px; }\n`;
    }
    for (let i = 0; i < 5; i++) {
      css += `@container c${i} (min-width: ${i * 100}px) { opacity: ${i / 10}; }\n`;
    }
    css +=
      '&:hover { color: blue; } &:focus { border-color: red; } &:active { opacity: 0.5; } &:disabled { opacity: 0.3; }';
    return css;
  })(),
};

describe('responsive runtime microbenchmarks', () => {
  beforeEach(() => {
    resetResponsiveCache();
    resetNativeStyleCache();
  });

  describe('parseMediaQuery', () => {
    it('cold parse cost — resets cache each iteration', () => {
      bench('parseMediaQuery simple           ', 5000, () => parseMediaQuery(QUERIES.simple), {
        beforeIteration: () => resetResponsiveCache(),
      });
      bench('parseMediaQuery compound         ', 5000, () => parseMediaQuery(QUERIES.compound), {
        beforeIteration: () => resetResponsiveCache(),
      });
      bench('parseMediaQuery range simple     ', 5000, () => parseMediaQuery(QUERIES.rangeSimple), {
        beforeIteration: () => resetResponsiveCache(),
      });
      bench(
        'parseMediaQuery range sandwich   ',
        5000,
        () => parseMediaQuery(QUERIES.rangeSandwich),
        { beforeIteration: () => resetResponsiveCache() }
      );
      bench('parseMediaQuery OR clauses       ', 5000, () => parseMediaQuery(QUERIES.orClauses), {
        beforeIteration: () => resetResponsiveCache(),
      });
      bench('parseMediaQuery complex          ', 5000, () => parseMediaQuery(QUERIES.complex), {
        beforeIteration: () => resetResponsiveCache(),
      });
    });

    it('cached parse cost — typical production pattern', () => {
      // Warmup populates the cache once; the bench iterates on cache hits.
      parseMediaQuery(QUERIES.complex);
      bench('parseMediaQuery complex (cached)', 100_000, () => parseMediaQuery(QUERIES.complex));
    });
  });

  describe('matchMedia', () => {
    it('matches against a warm env (queries pre-cached)', () => {
      for (const q of Object.values(QUERIES)) parseMediaQuery(q);
      bench('matchMedia simple                 ', 200_000, () =>
        matchMedia(QUERIES.simple, env1024)
      );
      bench('matchMedia compound               ', 200_000, () =>
        matchMedia(QUERIES.compound, env375)
      );
      bench('matchMedia range                  ', 200_000, () =>
        matchMedia(QUERIES.rangeSimple, env1024)
      );
      bench('matchMedia OR                     ', 200_000, () =>
        matchMedia(QUERIES.orClauses, env1024)
      );
      bench('matchMedia complex                ', 200_000, () =>
        matchMedia(QUERIES.complex, env1024)
      );
    });
  });

  describe('toNativeStyles', () => {
    it('cold compile cost — cache reset each iteration', () => {
      bench(
        'compile flat (no conditionals)    ',
        5000,
        () => toNativeStyles(CSS_SAMPLES.flat, stubStyleSheet),
        { beforeIteration: () => resetNativeStyleCache() }
      );
      bench(
        'compile one @media               ',
        5000,
        () => toNativeStyles(CSS_SAMPLES.oneMedia, stubStyleSheet),
        { beforeIteration: () => resetNativeStyleCache() }
      );
      bench(
        'compile one @container            ',
        5000,
        () => toNativeStyles(CSS_SAMPLES.oneContainer, stubStyleSheet),
        { beforeIteration: () => resetNativeStyleCache() }
      );
      bench(
        'compile composite (3 at-rules + 4 pseudos)',
        2000,
        () => toNativeStyles(CSS_SAMPLES.composite, stubStyleSheet),
        { beforeIteration: () => resetNativeStyleCache() }
      );
      bench(
        'compile heavy (10 @media + 5 @container)',
        500,
        () => toNativeStyles(CSS_SAMPLES.heavy, stubStyleSheet),
        { beforeIteration: () => resetNativeStyleCache() }
      );
    });

    it('cached compile cost — typical re-render pattern', () => {
      toNativeStyles(CSS_SAMPLES.composite, stubStyleSheet);
      bench('compile composite (cached)        ', 500_000, () =>
        toNativeStyles(CSS_SAMPLES.composite, stubStyleSheet)
      );
    });

    it('compile miss + warm pair cache (realistic prod pattern)', () => {
      // Simulate: new component with never-seen CSS string, but the individual
      // prop/value pairs (color: red, padding-top: 8px, etc.) have been seen
      // before. Uses a changing comment marker to dodge the compile-cache.
      let counter = 0;
      const vary = (css: string) => `/*#${counter++}*/\n${css}`;
      // Warm the pair cache on all samples first.
      toNativeStyles(CSS_SAMPLES.flat, stubStyleSheet);
      toNativeStyles(CSS_SAMPLES.oneMedia, stubStyleSheet);
      toNativeStyles(CSS_SAMPLES.oneContainer, stubStyleSheet);
      toNativeStyles(CSS_SAMPLES.composite, stubStyleSheet);
      toNativeStyles(CSS_SAMPLES.heavy, stubStyleSheet);

      bench('compile flat (pair cache warm)    ', 2000, () =>
        toNativeStyles(vary(CSS_SAMPLES.flat), stubStyleSheet)
      );
      bench('compile composite (pair cache warm)', 1000, () =>
        toNativeStyles(vary(CSS_SAMPLES.composite), stubStyleSheet)
      );
      bench('compile heavy (pair cache warm)   ', 500, () =>
        toNativeStyles(vary(CSS_SAMPLES.heavy), stubStyleSheet)
      );
    });
  });
});
