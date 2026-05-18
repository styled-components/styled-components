/**
 * Opt-in reanimated adapter for styled-components on React Native.
 *
 * Activation is a side-effect import: pulling this module in once at
 * the consumer's app entry replaces the default `Animated`-based adapter
 * with one that targets reanimated 4's CSS animations + transitions
 * layer. Transitions map directly from descriptors. `animationName` is
 * built as Reanimated keyframe objects from `compiled.keyframes` (plain
 * string names never pass Reanimated's CSS animation prop filter).
 *
 * `@starting-style` with `transition` uses a two-phase paint: one frame
 * merges the starting snapshot onto the resolved base, then the next frame
 * drops the overlay so Reanimated's transition manager sees a value change.
 *
 * ```ts
 * // Anywhere in your app entry, ONCE:
 * import 'styled-components/native/reanimated';
 * ```
 *
 * Floor: reanimated 4 + RN New Architecture (Fabric). Reanimated 4 is
 * Fabric-only. Reanimated 3 is not supported here; use the default
 * Animated adapter or migrate.
 *
 * Peer dependency: `react-native-reanimated@^4` is a peer that the
 * consumer must install themselves. The require below throws a clear
 * error at module load if the package can't be resolved.
 */
import * as React from 'react';
import type { NativeTarget } from '../../types';
import {
  AnimatedStyleInput,
  AnimatedStyleOutput,
  AnimationAdapter,
  passthroughOutput,
  setAnimationAdapter,
} from '../animation/types';
import { mapDescriptorsToCSSLayer } from './mapDescriptorsToCSSLayer';
import { mergeReanimatedResolvedStyle } from './mergeReanimatedResolvedStyle';

type Reanimated = any;

let reanimated: Reanimated;
try {
  reanimated = require('react-native-reanimated');
} catch (e) {
  throw new Error(
    '`styled-components/native/reanimated` requires `react-native-reanimated@^4` ' +
      'as a peer dependency. Install it with `npm install react-native-reanimated` ' +
      "or remove the `import 'styled-components/native/reanimated'` line."
  );
}

const animatedComponentCache = new WeakMap<object, NativeTarget>();

function wrapTarget(target: NativeTarget): NativeTarget {
  if (typeof target === 'string') return target;
  const cached = animatedComponentCache.get(target);
  if (cached) return cached;
  // reanimated 4 exposes `Animated.createAnimatedComponent` like core
  // RN, so the wrapping API matches.
  try {
    // reanimated's argument type is narrower than our broad `AnyComponent`;
    // widen to `any` at the boundary.
    const wrapped = reanimated.default.createAnimatedComponent(target as any) as NativeTarget;
    animatedComponentCache.set(target, wrapped);
    return wrapped;
  } catch {
    return target;
  }
}

const reanimatedAdapter: AnimationAdapter = {
  id: 'reanimated',
  useAnimatedStyle(input: AnimatedStyleInput): AnimatedStyleOutput {
    const { compiled, resolved, target, env } = input;

    const hasStartingTransition =
      compiled.startingStyle !== undefined && compiled.transitions !== undefined;

    const [startingPass, setStartingPass] = React.useState(0);

    React.useLayoutEffect(() => {
      if (!hasStartingTransition) {
        setStartingPass(0);
        return;
      }
      setStartingPass(0);
      const id = requestAnimationFrame(() => {
        setStartingPass(1);
      });
      return () => cancelAnimationFrame(id);
    }, [hasStartingTransition]);

    const mergeStartingOverlay = hasStartingTransition && startingPass === 0;

    const flatResolved = React.useMemo(
      () => mergeReanimatedResolvedStyle(resolved, compiled, env, mergeStartingOverlay),
      [resolved, compiled, env, mergeStartingOverlay]
    );

    // Hooks always run unconditionally;`compiled` can change shape
    // between renders (dynamic CSS), so the early-bail must come AFTER
    // any hook call to keep call order stable.
    const cssLayerProps = React.useMemo(
      () =>
        mapDescriptorsToCSSLayer(reanimated, compiled.animations, compiled.transitions, {
          keyframes: compiled.keyframes,
          env,
          reduceMotion: env.media.reduceMotion,
        }),
      [compiled.animations, compiled.transitions, compiled.keyframes, env]
    );
    const merged = React.useMemo(
      () => ({ ...flatResolved, ...cssLayerProps }),
      [flatResolved, cssLayerProps]
    );

    if (
      compiled.transitions === undefined &&
      compiled.animations === undefined &&
      compiled.startingStyle === undefined
    ) {
      return passthroughOutput(input);
    }

    return {
      style: merged,
      elementType: wrapTarget(target),
      invalidateCache: mergeStartingOverlay,
    };
  },
};

setAnimationAdapter(reanimatedAdapter);

export { reanimatedAdapter };
