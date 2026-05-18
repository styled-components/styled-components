import type { NativeTarget } from '../../types';
import type { NativeStyles } from '../../models/compileNative';
import type { ResolveEnv } from '../transform/polyfills/resolvers';

/**
 * Describes an easing function in spec-shaped form so the adapter
 * implementations don't re-parse CSS. Mirrors CSS Easing L1+L2.
 *
 * Adapters MUST translate this descriptor through their engine's
 * primitives. In particular, NEVER pass the named `ease`/`ease-in`/etc
 * keywords through to RN's `Easing.ease` or reanimated's `Easing.ease` ;
 * both engines ship `bezier(0.42, 0, 1, 1)` for `ease`, which is the CSS
 * `ease-in` curve, not the CSS `ease` curve. The canonical bezier
 * coefficient table in `./css-keywords.ts` is the source of truth.
 */
export type EasingDescriptor =
  | { kind: 'linear' }
  | { kind: 'cubic-bezier'; p: [number, number, number, number] }
  | {
      kind: 'steps';
      n: number;
      jump: 'jump-start' | 'jump-end' | 'jump-none' | 'jump-both';
    }
  | {
      kind: 'linear-stops';
      /**
       * Resampled stop list. Each entry is `[input 0..1, output 0..1]`.
       * Multi-position stops have already been expanded; X is monotonic
       * non-decreasing per spec.
       */
      stops: Array<[number, number]>;
    };

/**
 * Resolved CSS animation declaration;the L1+L2 longhand set, but
 * shaped for the adapter, not for serialization.
 */
export interface AnimationDescriptor {
  name: string;
  durationMs: number;
  timingFunction: EasingDescriptor;
  /** Negative delay = start advanced by abs(delay) (skip-ahead). */
  delayMs: number;
  /** `Infinity` for `animation-iteration-count: infinite`. */
  iterationCount: number;
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  playState: 'running' | 'paused';
  /**
   * `replace` overwrites the underlying value; `add` sums the effect value with
   * the underlying value; `accumulate` extends `add` across iteration boundaries.
   *
   * Adapter support: numeric props and transform components flow through `add`
   * via outputRange offset. Colors, mixed units, and `accumulate` fall back to
   * `replace`.
   */
  composition: 'replace' | 'add' | 'accumulate';
}

/**
 * Resolved CSS transition declaration. One descriptor per transitioning
 * property. `property: 'all'` means every animatable changed property.
 */
export interface TransitionDescriptor {
  property: 'all' | string;
  durationMs: number;
  timingFunction: EasingDescriptor;
  delayMs: number;
  /** L2: when 'allow-discrete', discrete properties flip at 50%. */
  behavior: 'normal' | 'allow-discrete';
}

/**
 * Spec-shaped event objects fired by adapters on animation / transition
 * completion. Mirrors the DOM `AnimationEvent` / `TransitionEvent`
 * shape (sans the synthetic-event ceremony that doesn't make sense
 * outside the browser).
 */
export interface NativeAnimationEvent {
  animationName: string;
  /** Elapsed time in seconds. */
  elapsedTime: number;
}

export interface NativeTransitionEvent {
  propertyName: string;
  /** Elapsed time in seconds. */
  elapsedTime: number;
}

/**
 * Inputs to the adapter's render-time hook. Reference-stable per render.
 */
export interface AnimatedStyleInput {
  /** Compiled output from `compileNative` (carries keyframes etc.). */
  compiled: NativeStyles;
  /** Final resolved style this render would have applied without animation. */
  resolved: any;
  /** Element type the render path is about to create (e.g. RN's `View`). */
  target: NativeTarget;
  /** Render env (used for resolver re-runs and reduced-motion gating). */
  env: ResolveEnv;
  /**
   * User-supplied `onAnimationEnd` callback, lifted off the styled
   * component's React props. The Hermes adapter fires from
   * `Animated.timing.start`'s completion; the rn-web CSS adapter relies on
   * browser `animationend`. The Reanimated 4 CSS-layer path does not yet
   * receive native completion events from upstream, so this callback is
   * not invoked there until Reanimated exposes equivalent hooks.
   */
  onAnimationEnd?: (event: NativeAnimationEvent) => void;
  /**
   * User-supplied `onTransitionEnd` callback. Same shape as
   * `onAnimationEnd`; fires per completing property. Not invoked on the
   * Reanimated 4 CSS-layer path for the same reason as `onAnimationEnd`.
   */
  onTransitionEnd?: (event: NativeTransitionEvent) => void;
}

/**
 * Output from the adapter's render-time hook. The render path uses
 * `elementType` as the React element type and `style` as the style prop.
 */
export interface AnimatedStyleOutput {
  /**
   * Style to pass to the element. May contain `Animated.Value` /
   * `Animated.AnimatedInterpolation` references in place of static
   * primitives for any property currently being driven.
   */
  style: any;
  /**
   * Element type the render path should use. Adapters wrap the native
   * target in an `Animated.createAnimatedComponent`-equivalent so the
   * element can consume Animated.Values.
   */
  elementType: NativeTarget;
  /**
   * When true, the render path wraps the animated element in a
   * `View` with `collapsable: false` to prevent Fabric from flattening
   * the parent and leaking the 3D compositing context into siblings.
   */
  isolate3d?: boolean;
  /**
   * When true, the styled component MUST rebuild `elementProps` even
   * if its inputs (props, theme, env, container) are reference-equal
   * to the previous render. Set by adapters that update non-Animated
   * style values from JS timers (e.g. CSS Transitions L2
   * `allow-discrete` 50%-flip): the host static `display: 'flex'` →
   * `'none'` swap can't ride the Animated graph because RN's
   * `Animated.interpolate` requires numeric-bearing strings, so the
   * adapter sets this flag while the discrete window is open.
   */
  invalidateCache?: boolean;
}

/**
 * Adapter contract.
 *
 * Side-effect imports register the active adapter through
 * {@link setAnimationAdapter}. The default `Animated`-based adapter
 * registers when the native build is loaded; importing
 * `styled-components/native/reanimated` swaps it for the reanimated impl.
 *
 * The adapter exposes a single React hook `useAnimatedStyle` that the
 * styled-component slow path calls unconditionally. When no transitions
 * / animations / starting-style apply to the input, the hook returns
 * the input style + target unchanged.
 */
export interface AnimationAdapter {
  /** Adapter id for diagnostics + parity assertions in tests. */
  readonly id: string;
  /**
   * Render-time hook. Called once per slow-path render. The
   * implementation may call React hooks (state/ref/effect);its hook
   * order is fixed per component because the slow-path branch is
   * itself fixed at construction.
   */
  useAnimatedStyle(input: AnimatedStyleInput): AnimatedStyleOutput;
}

let activeAdapter: AnimationAdapter | undefined;

/**
 * Register an animation adapter. Called by side-effect modules:
 *   - `styled-components/native/animation` (default; auto-registered with
 *     the native build)
 *   - `styled-components/native/reanimated` (opt-in subpath; replaces the
 *     default)
 *
 * Calling this from user code is permitted but unusual;it lets
 * advanced consumers ship custom engines.
 */
export function setAnimationAdapter(adapter: AnimationAdapter | undefined): void {
  activeAdapter = adapter;
}

/** The currently registered animation adapter, or `undefined` if none. */
export function getAnimationAdapter(): AnimationAdapter | undefined {
  return activeAdapter;
}

/** Test utility: clears the active adapter. */
export function resetAnimationAdapter(): void {
  activeAdapter = undefined;
}

/** Convenience: pass-through adapter response when nothing should animate. */
export function passthroughOutput(input: AnimatedStyleInput): AnimatedStyleOutput {
  return { style: input.resolved, elementType: input.target };
}

/**
 * Sentinel adapter used when no animation adapter is registered. Keeps the
 * `useAnimatedStyle` call site unconditional in the render path so hook
 * order stays stable per component lifetime.
 */
export const NOOP_ADAPTER: AnimationAdapter = {
  id: 'noop',
  useAnimatedStyle: passthroughOutput,
};
