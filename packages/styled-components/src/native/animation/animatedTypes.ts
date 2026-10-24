import type { Animated } from 'react-native';

export type ReactNativeModule = typeof import('react-native');

/**
 * RN's `Animated` namespace plus `attachNativeEvent`, which RN implements
 * but leaves out of its published types. Absent on hosts without native
 * animated support, so it is optional.
 */
export type AnimatedApi = ReactNativeModule['Animated'] & {
  attachNativeEvent?: (
    viewRef: unknown,
    eventName: string,
    argMapping: ReadonlyArray<unknown>
  ) => { detach(): void };
};

export type CompositeAnimation = Animated.CompositeAnimation;

/**
 * An `Animated.Value` plus `__getValue`, the synchronous JS-side read RN
 * keeps off its published types. Absent on hosts that do not mirror the
 * value into JS.
 */
export type AnimatedValue = Animated.Value & { __getValue?: () => number };

/** Config accepted by `interpolate` on both `Animated.Value` and an interpolation. */
export interface InterpolationConfig {
  extrapolate?: 'clamp' | 'extend' | 'identity';
  inputRange: number[];
  /** All numbers or all strings: RN rejects a mixed range. */
  outputRange: number[] | string[];
}

/** Output of an `interpolate` call: a node a style prop or another interpolation can read. */
export type AnimatedInterpolationNode = Animated.AnimatedInterpolation<number | string>;

/** An `Animated.Value`, or an interpolation derived from one (scroll-driven progress). */
export interface InterpolatableNode {
  interpolate(config: InterpolationConfig): AnimatedInterpolationNode;
}
