/**
 * Opt-in reanimated adapter for styled-components on React Native.
 *
 * Activation is a side-effect import: pulling this module in once at
 * the consumer's app entry replaces the default `Animated`-based adapter
 * with one that targets reanimated 4's CSS animations + transitions
 * layer. The CSS layer maps near-1:1 from compiled CSS animation
 * descriptors, so the adapter is a thin pass-through rather than a
 * full re-implementation.
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
  AnimationDescriptor,
  EasingDescriptor,
  TransitionDescriptor,
  passthroughOutput,
  setAnimationAdapter,
} from '../animation/types';

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

/**
 * Convert an EasingDescriptor into the value reanimated 4's CSS layer
 * accepts for `animationTimingFunction` / `transitionTimingFunction`.
 *
 * Reanimated specially serializes per-keyframe timing functions, so we
 * MUST construct them through reanimated's exports (`cubicBezier`,
 * `steps`, `linear`) rather than emit raw bezier coefficients.
 */
function toReanimatedTiming(easing: EasingDescriptor): unknown {
  switch (easing.kind) {
    case 'linear':
      return 'linear';
    case 'cubic-bezier':
      // reanimated 4 exports `cubicBezier` from its CSS layer.
      // Available at the top-level for ease of access.
      return reanimated.cubicBezier
        ? reanimated.cubicBezier(easing.p[0], easing.p[1], easing.p[2], easing.p[3])
        : {
            type: 'cubic-bezier',
            x1: easing.p[0],
            y1: easing.p[1],
            x2: easing.p[2],
            y2: easing.p[3],
          };
    case 'steps':
      return reanimated.steps
        ? reanimated.steps(easing.n, easing.jump)
        : `steps(${easing.n}, ${easing.jump})`;
    case 'linear-stops': {
      const stops = easing.stops.map(([x, y]) => `${y} ${x * 100}%`).join(', ');
      return reanimated.linear
        ? reanimated.linear(...easing.stops.map(([x, y]) => [y, x * 100]))
        : `linear(${stops})`;
    }
  }
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

/**
 * Map our descriptors onto reanimated 4's CSS-layer style props.
 * Returns a partial style object the consumer's `Animated.View` reads
 * directly; reanimated handles the actual sequencing on the UI thread.
 */
function mapDescriptorsToCSSLayer(
  animations: AnimationDescriptor[] | undefined,
  transitions: TransitionDescriptor[] | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (animations && animations.length > 0) {
    if (animations.length === 1) {
      const a = animations[0];
      out.animationName = a.name;
      out.animationDuration = a.durationMs;
      out.animationTimingFunction = toReanimatedTiming(a.timingFunction);
      out.animationDelay = a.delayMs;
      out.animationIterationCount = a.iterationCount;
      out.animationDirection = a.direction;
      out.animationFillMode = a.fillMode;
      out.animationPlayState = a.playState;
    } else {
      out.animationName = animations.map(a => a.name);
      out.animationDuration = animations.map(a => a.durationMs);
      out.animationTimingFunction = animations.map(a => toReanimatedTiming(a.timingFunction));
      out.animationDelay = animations.map(a => a.delayMs);
      out.animationIterationCount = animations.map(a => a.iterationCount);
      out.animationDirection = animations.map(a => a.direction);
      out.animationFillMode = animations.map(a => a.fillMode);
      out.animationPlayState = animations.map(a => a.playState);
    }
  }
  if (transitions && transitions.length > 0) {
    if (transitions.length === 1) {
      const t = transitions[0];
      out.transitionProperty = t.property;
      out.transitionDuration = t.durationMs;
      out.transitionTimingFunction = toReanimatedTiming(t.timingFunction);
      out.transitionDelay = t.delayMs;
      out.transitionBehavior = t.behavior;
    } else {
      out.transitionProperty = transitions.map(t => t.property);
      out.transitionDuration = transitions.map(t => t.durationMs);
      out.transitionTimingFunction = transitions.map(t => toReanimatedTiming(t.timingFunction));
      out.transitionDelay = transitions.map(t => t.delayMs);
      out.transitionBehavior = transitions.map(t => t.behavior);
    }
  }
  return out;
}

const reanimatedAdapter: AnimationAdapter = {
  id: 'reanimated',
  useAnimatedStyle(input: AnimatedStyleInput): AnimatedStyleOutput {
    const { compiled, resolved, target } = input;

    // Hooks always run unconditionally;`compiled` can change shape
    // between renders (dynamic CSS), so the early-bail must come AFTER
    // any hook call to keep call order stable.
    const cssLayerProps = React.useMemo(
      () => mapDescriptorsToCSSLayer(compiled.animations, compiled.transitions),
      [compiled.animations, compiled.transitions]
    );
    const merged = React.useMemo(
      () => ({ ...resolved, ...cssLayerProps }),
      [resolved, cssLayerProps]
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
    };
  },
};

setAnimationAdapter(reanimatedAdapter);

export { reanimatedAdapter };
