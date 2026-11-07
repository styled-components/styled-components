/**
 * Render-path microbench. Measures per-render work on the native dynamic
 * render impl (`useDynamicImpl`), the path every styled native component
 * takes when its CSS isn't fully static.
 *
 * Three workloads:
 *  1. No responsive output: skips assembly, calls `composeBase`, then the
 *     adapter passthrough.
 *  2. One `@media` bucket: full assembly via `assembleFinalStyle`, then
 *     the adapter passthrough.
 *  3. Adapter passthrough in isolation.
 *
 * Hook overhead (context reads, `useMediaEnv`, `useRef`, the adapter's
 * hooks) is well-known on V8 and not measured
 * here. Hermes characteristics differ; final validation belongs in
 * `packages/ios-benchmark`.
 */
import { compareBench, bench } from './bench-utils';
import { assembleFinalStyle, composeBase } from '../models/StyledNativeComponent';
import { hasResponsiveOutput, type NativeStyles } from '../models/compileNative';
import type { MediaQueryEnv } from '../native/responsive';
import { passthroughOutput } from '../native/animation/types';

// The render benches below load the native entry, which reads react-native.
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    addEventListener: () => ({ remove() {} }),
    isReduceMotionEnabled: () => Promise.resolve(false),
  },
  Appearance: { addChangeListener: () => ({ remove() {} }), getColorScheme: () => 'light' },
  Dimensions: {
    addEventListener: () => ({ remove() {} }),
    get: () => ({ fontScale: 1, height: 667, scale: 2, width: 375 }),
  },
  PixelRatio: { get: () => 2 },
  Platform: { OS: 'ios', select: (spec: Record<string, unknown>) => spec.ios ?? spec.default },
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style },
  Text: 'Text',
  View: 'View',
}));

const env: MediaQueryEnv = {
  width: 375,
  height: 667,
  colorScheme: 'light',
  reduceMotion: false,
  fontScale: 1,
  pixelRatio: 2,
};

const containerCtx = { nearest: null, named: {} } as any;
const theme = {} as Record<string, any>;
const props = { color: 'red' } as Record<string, unknown>;
const resolveEnv = {
  media: env,
  container: null,
  theme,
  insets: null,
  rootFontSize: 16,
  fontSize: 16,
  lineHeight: 24,
  direction: 'ltr',
} as any;

const flatCompiled: NativeStyles = {
  base: { color: 'red', padding: 16 },
  conditional: [],
  nonPseudoEntries: [],
  pseudoEntries: [],
  hasPseudo: false,
  keyframes: [],
  publishesCascade: false,
};

const mediaBucket: NativeStyles['nonPseudoEntries'][number] = {
  type: 'media',
  condition: '(min-width: 400px)',
  styles: { padding: 32 },
};

const responsiveCompiled: NativeStyles = {
  base: { color: 'red', padding: 16 },
  conditional: [mediaBucket],
  // Current compiled output partitions `conditional` into pseudo / non-pseudo
  // buckets; a `@media` rule is non-pseudo, so the honor-the-bucket path reads
  // it here. Keep this in sync with the shape `compileNative` emits.
  nonPseudoEntries: [mediaBucket],
  pseudoEntries: [],
  hasPseudo: false,
  keyframes: [],
  publishesCascade: false,
};

describe('useDynamicImpl render-path work delta', () => {
  test('no responsive output: composeBase only vs full miss path', () => {
    compareBench(
      'no-responsive',
      500_000,
      {
        name: 'composeBase only',
        fn: () => {
          composeBase(flatCompiled.base, undefined);
        },
      },
      {
        name: 'composeBase + adapter passthrough',
        fn: () => {
          const composed = hasResponsiveOutput(flatCompiled)
            ? assembleFinalStyle(flatCompiled, env, containerCtx, theme, undefined, props)
            : composeBase(flatCompiled.base, undefined);
          passthroughOutput({
            compiled: flatCompiled,
            resolved: composed,
            target: 'View' as any,
            env: resolveEnv,
          });
        },
      },
      { label: 'No responsive output' }
    );
  });

  test('one @media bucket: composeBase shortcut vs honoring the bucket', () => {
    compareBench(
      'one-media-bucket',
      200_000,
      {
        name: 'composeBase shortcut (drops @media)',
        fn: () => {
          composeBase(responsiveCompiled.base, undefined);
        },
      },
      {
        name: 'assembleFinalStyle + adapter passthrough',
        fn: () => {
          const composed = hasResponsiveOutput(responsiveCompiled)
            ? assembleFinalStyle(responsiveCompiled, env, containerCtx, theme, undefined, props)
            : composeBase(responsiveCompiled.base, undefined);
          passthroughOutput({
            compiled: responsiveCompiled,
            resolved: composed,
            target: 'View' as any,
            env: resolveEnv,
          });
        },
      },
      { label: 'One @media bucket' }
    );
  });

  test('adapter passthrough cost in isolation', () => {
    bench('adapter passthroughOutput()', 1_000_000, () => {
      passthroughOutput({
        compiled: flatCompiled,
        resolved: flatCompiled.base,
        target: 'View' as any,
        env: resolveEnv,
      });
    });
  });
});

/**
 * Parent re-render with children, through the public `styled` API. The child
 * elements are built once and reused, so every child bails out and an update
 * costs the parent's own work: walking its children and wrapping each styled
 * child with its sibling position. Only the public API is used, so the same file
 * runs against any checkout.
 */
describe('styled parent re-render with children', () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let TestRenderer: any;
  let React: any;
  let styled: any;

  const priorNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // The test renderer flushes an update synchronously only inside `act`, which
    // React ships in its development build alone, so load that build here.
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    (globalThis as any).__NATIVE__ = true;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    React = require('react');
    TestRenderer = require('react-test-renderer');
    styled = require('../native').default;
  });

  afterAll(() => {
    process.env.NODE_ENV = priorNodeEnv;
    (globalThis as any).__NATIVE__ = false;
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = false;
  });

  function benchRerender(name: string, iterations: number, build: () => any) {
    const Parent = styled.View`
      padding: 1px;
    `;
    const children = build();
    let tree: any;
    TestRenderer.act(() => {
      tree = TestRenderer.create(React.createElement(Parent, { testID: 'a' }, children));
    });
    bench(name, iterations, i => {
      TestRenderer.act(() => {
        tree.update(React.createElement(Parent, { testID: i % 2 === 0 ? 'b' : 'a' }, children));
      });
    });
    TestRenderer.act(() => tree.unmount());
  }

  test('5 plain children', () => {
    benchRerender('5 plain children', 20_000, () =>
      Array.from({ length: 5 }, (_, i) => React.createElement('View', { key: i }))
    );
  });

  test('5 styled children', () => {
    const Item = styled.View`
      margin: 1px;
    `;
    benchRerender('5 styled children', 20_000, () =>
      Array.from({ length: 5 }, (_, i) => React.createElement(Item, { key: i }))
    );
  });

  test('3 + 2 styled children and a nested map of 20', () => {
    const Item = styled.View`
      margin: 1px;
    `;
    benchRerender('3 + 2 styled children and a nested map of 20', 5_000, () => [
      React.createElement(Item, { key: 'a' }),
      React.createElement(Item, { key: 'b' }),
      React.createElement(Item, { key: 'c' }),
      [React.createElement(Item, { key: 'd' }), React.createElement(Item, { key: 'e' })],
      Array.from({ length: 20 }, (_, i) => React.createElement(Item, { key: `m${i}` })),
    ]);
  });
});
