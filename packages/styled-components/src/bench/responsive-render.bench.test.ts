/**
 * Render-path microbench. Measures per-render work on the native dynamic
 * render impl (`useDynamicImpl`);the path every styled native component
 * takes when its CSS isn't fully static.
 *
 * Three workloads:
 *  1. No responsive output: skips assembly, calls `composeBase`, then the
 *     adapter passthrough.
 *  2. One `@media` bucket: full assembly via `assembleFinalStyle`, then
 *     the adapter passthrough.
 *  3. Adapter passthrough in isolation.
 *
 * Hook overhead (`useContext`, `useMediaEnv`, `useContainerContext`,
 * `useRef`, the adapter's hooks) is well-known on V8 and not measured
 * here. Hermes characteristics differ; final validation belongs in
 * `packages/ios-benchmark`.
 */
import { compareBench, bench } from './bench-utils';
import { assembleFinalStyle, composeBase } from '../models/StyledNativeComponent';
import { hasResponsiveOutput, type NativeStyles } from '../models/compileNative';
import type { MediaQueryEnv } from '../native/responsive';
import { passthroughOutput } from '../native/animation/types';

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
  keyframes: [],
};

const responsiveCompiled: NativeStyles = {
  base: { color: 'red', padding: 16 },
  conditional: [
    {
      type: 'media',
      condition: '(min-width: 400px)',
      styles: { padding: 32 },
    } as any,
  ],
  keyframes: [],
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
