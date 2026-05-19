/**
 * Default animation adapter for the React Native build.
 *
 * Auto-registers itself via `setAnimationAdapter` at module load. The
 * styled-components native build pulls this file as a side effect, so
 * consumers get CSS `transition`, `@keyframes`, and `@starting-style`
 * working out of the box without any additional import.
 *
 * Implementation strategy:
 *   - Per transitioning property, hold a 0..1 progress `Animated.Value`
 *     plus a {prev, next} value pair. On any render where `next` differs
 *     from the value the property currently animates toward, snapshot
 *     the prior `next` as the new `prev`, reset progress to 0, and start
 *     a `timing` animation toward 1.
 *   - At render time, replace the property's literal value with an
 *     `Animated.interpolate({inputRange:[0,1], outputRange:[prev, next]})`.
 *     Numeric props, color strings, and per-component transform arrays
 *     all flow through the same shape.
 *   - The element is wrapped via cached `Animated.createAnimatedComponent`
 *     so it can consume the Animated.Value/interpolation refs.
 *
 * Native-driver eligibility tracks the verified RN 0.85 allowlist (see
 * `knowledge_rn_animated_native_driver_allowlist.md` in memory): opacity,
 * all transform components, every color prop, all 12 borderRadius corners,
 * shadow/zIndex/filter, and the legacy single-axis transform shortcuts.
 *
 * `@starting-style` support: on first mount, if transitions are present
 * and starting-style values differ from the target, the adapter starts
 * a transition from the starting-style value toward the target.
 *
 * `@keyframes` support: the adapter resolves compiled keyframe
 * definitions, builds multi-segment Animated interpolations with
 * per-frame easing, and drives them via Animated.timing/loop/sequence.
 * Supports all CSS `animation-direction`, `animation-fill-mode`,
 * `animation-play-state`, and `animation-iteration-count` values.
 */
import * as React from 'react';
import type { NativeTarget, Dict } from '../../types';
import type { CompiledKeyframes } from '../../models/compileNative';
import {
  AnimatedStyleInput,
  AnimatedStyleOutput,
  AnimationAdapter,
  AnimationDescriptor,
  EasingDescriptor,
  NativeAnimationEvent,
  NativeTransitionEvent,
  TransitionDescriptor,
  passthroughOutput,
  setAnimationAdapter,
} from './types';
import { applyResolvers, type ResolveEnv } from '../transform/polyfills/resolvers';
import {
  staticColorFunctionToRgb,
  srgbToOklab,
  oklabToRgb,
  nibble,
} from '../transform/polyfills/colorMath';
import { tokenize } from '../transform/tokenize';
import { TokenKind } from '../transform/tokens';
import { getRN } from '../responsive';
import { isWebPlatform } from '../polyfills';
import { evaluateCubicBezier, evaluateEasing, evaluateSteps } from './css-keywords';

type AnimatedNS = any;

/**
 * Debug toggle. Call sites short-circuit on the local read so expensive
 * arg computation (template-literal interpolation, `describeTransform`)
 * doesn't run when debug is off. Toggled via {@link setAnimationDebug}.
 */
let debugEnabled = false;

/**
 * Resolve RN's `Animated` lazily through the shared `getRN()` cache so
 * the JS-teardown safety guarantees in `responsive.ts` apply here too.
 */
function getAnimated(): AnimatedNS | null {
  return getRN().Animated ?? null;
}

function dbg(tag: string, ...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log('[sc/anim]', tag, ...args);
}

function describeTransform(value: any): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return String(value);
  return (
    '[' +
    value
      .map(entry => {
        if (!entry || typeof entry !== 'object') return String(entry);
        for (const k in entry) {
          const v = entry[k];
          // Animated values / interpolations have characteristic methods.
          const isAnim = v && typeof v === 'object' && typeof v.interpolate === 'function';
          return `${k}:${isAnim ? '<anim>' : JSON.stringify(v)}`;
        }
        return '?';
      })
      .join(' ') +
    ']'
  );
}

const animatedComponentCache = new WeakMap<object, NativeTarget>();

function wrapTarget(target: NativeTarget): NativeTarget {
  const Animated = getAnimated();
  if (!Animated) return target;
  // String element types like 'View' aren't directly wrappable. Pass
  // them through; current RN versions tolerate Animated.Values on host
  // elements through the AnimatedComponent wrapper applied during
  // reconciliation.
  if (typeof target === 'string') return target;
  const cached = animatedComponentCache.get(target);
  if (cached) return cached;
  try {
    // RN's `Animated.createAnimatedComponent` argument type is narrower than
    // our broad `AnyComponent`; widen to `any` at the boundary.
    const wrapped = Animated.createAnimatedComponent(target as any) as NativeTarget;
    animatedComponentCache.set(target, wrapped);
    return wrapped;
  } catch {
    return target;
  }
}

interface PropAnim {
  prev: any;
  next: any;
  progress: any;
  /**
   * Last `Animated.timing` handle started for this prop. `null` once the
   * timing settles (or no timing has run yet for the current `next`
   * value). Used to gate whether subsequent renders re-emit the
   * `AnimatedInterpolation` override; once settled, the static `next` in
   * `resolved` is the correct value and emitting an override only
   * triggers RN Android Fabric's "Unsupported type for radius property:
   * Null" warning on every commit (length-percentage props don't unwrap
   * Animated nodes through Fabric's prop-set serializer).
   */
  active: AnimationHandle | null;
  /**
   * Stable transform-kind order, growing as new modes introduce new
   * kinds. Reused across every render of the component so the emitted
   * transform array stays the same length + order;RN's `Animated.View`
   * needs a stable shape to connect its per-component graphs and keep
   * animations smooth.
   */
  transformKinds?: string[];
  /**
   * `transition-behavior: allow-discrete` flip state. When the
   * property's animation type is discrete (e.g. `display`,
   * `visibility`) and `allow-discrete` is set, the new value swaps in
   * at the 50% mark of the duration. The override emits `shown`
   * (= prev before the flip, next after); `flipTimeout` schedules the
   * swap and the bumpTick state setter triggers the re-render.
   */
  discrete?: {
    flipTimeout: ReturnType<typeof setTimeout> | null;
    shown: any;
  };
  /**
   * Reversing-shortening-factor for the current transition. Carries
   * forward across interruptions so a hover-out at 30% takes 30% of
   * the duration, then a re-reverse at 50% of that takes the
   * proportional remainder, and so on. `1` at rest / after a fresh
   * start (no prior interruption).
   */
  reversingFactor?: number;
  /**
   * Easing descriptor of the currently-active timing. Needed at
   * interruption time to compute `old_timing(t)` (the eased output at
   * the change moment) for the next transition's shortening factor.
   */
  activeEasing?: EasingDescriptor;
}

interface AnimationHandle {
  stop(): void;
}

interface AdapterScratch {
  props: Map<string, PropAnim>;
  /** Active timing handles for cleanup. */
  running: Set<AnimationHandle>;
  mounted?: boolean;
  anims?: AnimScratch[];
}

interface NormalizedFrame {
  offset: number;
  decls: Dict<any>;
  easing?: EasingDescriptor;
}

interface AnimScratch {
  name: string;
  progress: any;
  handle: AnimationHandle | null;
  overrides: Record<string, any>;
  drivenProps: Set<string>;
  transformKinds?: string[];
  fillMode: AnimationDescriptor['fillMode'];
  finished: boolean;
  prevPlayState?: string;
  /**
   * `animation-play-state: paused` captures the linear timing progress
   * (0..1) at pause so `running` can resume with the remaining duration
   * instead of re-timing the full cycle. Cleared on resume. Pausing
   * freezes the current progress; resume must continue from there.
   */
  pausedAt?: number;
  /**
   * Wall-clock iteration index at pause time, derived from
   * `Date.now() - startedAt - delayMs` divided by the per-iteration
   * duration. Used to resume multi-iteration animations from the
   * correct cycle rather than restarting iteration 0.
   */
  pausedIterIndex?: number;
  /**
   * `Date.now()` when the active timing started, plus the effective
   * `animation-delay` in ms. Fill-mode semantics compare wall-clock
   * time against these to decide whether the override layer should be
   * visible during the delay window.
   */
  startedAt?: number;
  delayMs?: number;
}

function createScratch(): AdapterScratch {
  return { props: new Map(), running: new Set() };
}

function disposeScratch(scratch: AdapterScratch): void {
  for (const r of scratch.running) {
    try {
      r.stop();
    } catch {}
  }
  scratch.running.clear();
  for (const [, p] of scratch.props) {
    if (p.discrete && p.discrete.flipTimeout !== null) {
      clearTimeout(p.discrete.flipTimeout);
      p.discrete.flipTimeout = null;
    }
  }
  if (scratch.anims) {
    for (let i = 0; i < scratch.anims.length; i++) {
      const a = scratch.anims[i];
      if (a.handle) {
        try {
          a.handle.stop();
        } catch {}
      }
    }
    scratch.anims.length = 0;
  }
}

/** Native-driver allowlist;verified against RN 0.85 source. */
const NATIVE_DRIVER_PROPS = new Set<string>([
  'opacity',
  'filter',
  'color',
  'backgroundColor',
  'borderColor',
  'borderTopColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderEndColor',
  'tintColor',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
  'borderStartStartRadius',
  'borderStartEndRadius',
  'borderEndStartRadius',
  'borderEndEndRadius',
  'zIndex',
  'elevation',
  'shadowOpacity',
  'shadowRadius',
  'transform',
  'scaleX',
  'scaleY',
  'translateX',
  'translateY',
]);

function canUseNativeDriver(prop: string): boolean {
  return NATIVE_DRIVER_PROPS.has(prop);
}

// Baked-curve timings must drive progress linearly; RN defaults to easeInOut.
const LINEAR_EASING = (t: number): number => t;

/** ~60fps frame budget. Used to size sample counts so the resampled curve
 *  carries at least one stop per displayed frame. */
const FRAME_MS = 1000 / 60;
/** Lower bound for cheap, short-duration transitions (matches v6 behavior). */
const MIN_SAMPLES = 32;
/** Upper bound. Caps memory/CPU on multi-second animations; the eye stops
 *  resolving extra stops well before this point. */
const MAX_SAMPLES = 240;

/**
 * Pick a sample count for a given segment duration. Targets ≥1 stop per
 * 60fps frame so the piecewise-linear approximation reads as a smooth
 * curve rather than a polyline at large value deltas.
 */
function samplesForDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return MIN_SAMPLES;
  const n = Math.ceil(durationMs / FRAME_MS);
  if (n < MIN_SAMPLES) return MIN_SAMPLES;
  if (n > MAX_SAMPLES) return MAX_SAMPLES;
  return n;
}

/**
 * Resample a CSS easing descriptor onto RN's per-segment `interpolate`
 * (which is piecewise linear on the native driver). For cubic-bezier
 * and steps we sample the curve; for `linear-stops` we pass through;
 * for the canonical `linear` keyword we emit two stops.
 *
 * Trade-off: the native driver doesn't accept JS easing functions, so
 * approximating curves with multi-segment linear is the only way to
 * keep animations off-thread. The caller picks a sample count via
 * `samplesForDuration` so we always have ≥1 stop per displayed frame.
 */
function easingToInterpolation(
  easing: EasingDescriptor,
  samples: number = MIN_SAMPLES
): { input: number[]; output: number[] } {
  if (easing.kind === 'linear') return { input: [0, 1], output: [0, 1] };
  if (easing.kind === 'linear-stops') {
    const input: number[] = [];
    const output: number[] = [];
    for (let i = 0; i < easing.stops.length; i++) {
      input.push(easing.stops[i][0]);
      output.push(easing.stops[i][1]);
    }
    return { input, output };
  }
  const input: number[] = new Array(samples + 1);
  const output: number[] = new Array(samples + 1);
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    input[i] = t;
    if (easing.kind === 'cubic-bezier') {
      const [a, b, c, d] = easing.p;
      output[i] = evaluateCubicBezier(a, b, c, d, t);
    } else {
      output[i] = evaluateSteps(easing.n, easing.jump, t);
    }
  }
  return { input, output };
}

function buildInterpolation(
  progress: any,
  prev: any,
  next: any,
  easing: EasingDescriptor,
  durationMs: number
): any {
  if (
    (typeof prev === 'number' && typeof next === 'number') ||
    (typeof prev === 'string' && typeof next === 'string')
  ) {
    const samples = easingToInterpolation(easing, samplesForDuration(durationMs));
    if (samples.input.length === 2) {
      return progress.interpolate({
        inputRange: [0, 1],
        outputRange: [prev, next],
      });
    }
    // Multi-segment: resample the prev→next path through the easing curve.
    const input = samples.input;
    const out = new Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const t = samples.output[i];
      if (typeof prev === 'number') {
        out[i] = (prev as number) + ((next as number) - (prev as number)) * t;
      } else {
        // For strings, we lean on RN's two-point interpolate cascaded
        // through samples;the native side only natively interpolates
        // numeric ranges. A faithful color/string ease therefore needs
        // the JS driver; we approximate by applying the eased t at each
        // sample input.
        out[i] = t === 0 ? prev : t === 1 ? next : next;
      }
    }
    return progress.interpolate({ inputRange: input, outputRange: out });
  }
  // Other compound shapes: fall back to the static next value.
  return next;
}

interface TransformComponent {
  kind: string;
  value: number | string;
}

// Eager `[^)]*` with no flanking `\s*`; the caller trims the captured
// args anyway. Avoids polynomial backtracking on user-authored
// `transform:` values like `translate(<spaces>X` (no close paren).
const TRANSFORM_FN_RE = /([A-Za-z]+)\(([^)]*)\)/g;

function parseTransformString(s: string): TransformComponent[] {
  const out: TransformComponent[] = [];
  let match: RegExpExecArray | null;
  TRANSFORM_FN_RE.lastIndex = 0;
  while ((match = TRANSFORM_FN_RE.exec(s)) !== null) {
    const kind = match[1];
    const raw = match[2].trim();
    out.push({ kind, value: parseTransformValue(kind, raw) });
  }
  return out;
}

function parseTransformValue(kind: string, raw: string): number | string {
  // Translate/scale/perspective are numeric; strip unit and parse.
  if (
    kind === 'translateX' ||
    kind === 'translateY' ||
    kind === 'translateZ' ||
    kind === 'scale' ||
    kind === 'scaleX' ||
    kind === 'scaleY' ||
    kind === 'perspective'
  ) {
    return parseFloat(raw);
  }
  // Angle kinds keep their unit so RN can interpret them.
  return raw;
}

/**
 * CSS keywords that can NEVER be a color name and that appear as
 * common values on animatable RN style props (display, overflow,
 * pointerEvents, position, flexDirection, alignItems, etc.). When
 * both `prev` and `next` sit in this set, the prop is discrete.
 */
const DISCRETE_KEYWORDS = new Set<string>([
  'auto',
  'none',
  'flex',
  'block',
  'inline',
  'inline-block',
  'inline-flex',
  'grid',
  'inline-grid',
  'visible',
  'hidden',
  'collapse',
  'scroll',
  'overlay',
  'static',
  'relative',
  'absolute',
  'fixed',
  'sticky',
  'row',
  'column',
  'row-reverse',
  'column-reverse',
  'wrap',
  'nowrap',
  'wrap-reverse',
  'flex-start',
  'flex-end',
  'center',
  'space-between',
  'space-around',
  'space-evenly',
  'baseline',
  'stretch',
  'normal',
  'italic',
  'oblique',
  'underline',
  'line-through',
  'overline',
  'solid',
  'dashed',
  'dotted',
  'double',
  'box-none',
  'box-only',
  'ltr',
  'rtl',
  'inherit',
  'initial',
  'unset',
]);

/**
 * Whether `prev` and `next` can be smoothly interpolated by RN's
 * `Animated.interpolate` machinery. Used to gate the `allow-discrete`
 * 50%-flip path (CSS Transitions L2): only fires when the prev/next
 * pair has no smooth interpolation. Conservative on the "smooth" side
 * to avoid regressing named-color transitions (`red → blue`) that go
 * through RN's color path.
 */
function isSmoothlyInterpolable(prev: unknown, next: unknown, isTransform: boolean): boolean {
  if (isTransform) return true;
  if (typeof prev === 'number' && typeof next === 'number') {
    return Number.isFinite(prev) && Number.isFinite(next);
  }
  if (typeof prev !== 'string' || typeof next !== 'string') return false;
  // Numeric-bearing strings (rgba/rgb/hex colors, unit values like '10px',
  // '45deg') interpolate via RN's `mapStringToNumericComponents`. Pure
  // CSS keywords without digits (`block`, `none`, `flex`, `auto`, `hidden`)
  // are discrete. Named CSS colors are also digit-free strings; we keep
  // them in the smooth bucket so that `transition: color 200ms` from
  // 'red' to 'blue' continues to interpolate. The discriminator is
  // therefore: at least one digit on each side, OR the pair sits in a
  // small set of keywords that no animatable RN style prop can take a
  // color name for.
  if (/\d/.test(prev) && /\d/.test(next)) return true;
  if (DISCRETE_KEYWORDS.has(prev) && DISCRETE_KEYWORDS.has(next)) return false;
  // Conservative: any other digit-free string pair (incl. unrecognized
  // values) routes through the existing string-string path. RN's
  // interpolate either accepts both as colors or surfaces a dev warning.
  return true;
}

/**
 * Capture the current visible value of a transitioning prop at the
 * moment of an interruption. An interrupted transition's new round
 * starts from the currently animated value, not the prior end target.
 *
 * Returns `undefined` for value shapes we can't reconstruct (compound
 * transforms mid-flight, color strings beyond simple unit-parsing).
 * The caller falls back to `state.next` (= the prior end target),
 * which is the v6/v7-pre-fix behavior.
 */
function captureCurrentValue(
  prev: unknown,
  next: unknown,
  progress: unknown,
  easing: EasingDescriptor
): number | string | undefined {
  if (
    progress === null ||
    progress === undefined ||
    typeof (progress as { __getValue?: () => number }).__getValue !== 'function'
  ) {
    return undefined;
  }
  let linear: number;
  try {
    linear = (progress as { __getValue: () => number }).__getValue();
  } catch {
    return undefined;
  }
  if (!Number.isFinite(linear)) return undefined;
  const eased = evaluateEasing(easing, Math.max(0, Math.min(1, linear)));
  if (typeof prev === 'number' && typeof next === 'number') {
    return prev + (next - prev) * eased;
  }
  if (typeof prev === 'string' && typeof next === 'string') {
    const p = parseUnitString(prev);
    const n = parseUnitString(next);
    if (p && n && p.unit === n.unit) {
      return p.n + (n.n - p.n) * eased + p.unit;
    }
  }
  return undefined;
}

function transformIdentity(kind: string): number | string {
  if (kind === 'translateX' || kind === 'translateY' || kind === 'translateZ') return 0;
  if (kind === 'scale' || kind === 'scaleX' || kind === 'scaleY') return 1;
  if (kind === 'rotate' || kind === 'rotateX' || kind === 'rotateY' || kind === 'rotateZ') {
    return '0deg';
  }
  if (kind === 'skewX' || kind === 'skewY') return '0deg';
  if (kind === 'perspective') return 1000;
  return 0;
}

/**
 * Collect the set of transform-kind names from a transform value.
 * Returns the kinds in source order. Accepts both string and array
 * forms (RN supports either as `transform`).
 */
function collectTransformKinds(value: any): string[] {
  const arr =
    typeof value === 'string'
      ? parseTransformString(value)
      : Array.isArray(value)
        ? normalizeTransformArray(value)
        : null;
  if (arr === null) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < arr.length; i++) {
    if (!seen.has(arr[i].kind)) {
      seen.add(arr[i].kind);
      out.push(arr[i].kind);
    }
  }
  return out;
}

/**
 * Add new kinds from `value` to `existing`, preserving order and
 * skipping duplicates. Mutates `existing`. The growing union ensures
 * the emitted transform array shape stays stable across the component's
 * lifetime;RN's `Animated.View` needs a fixed array length + kind
 * order to keep its native graph connected; without that the second
 * render with a different transform shape resets and snaps.
 */
function unionTransformKinds(existing: string[], value: any): void {
  const next = collectTransformKinds(value);
  for (let i = 0; i < next.length; i++) {
    if (existing.indexOf(next[i]) === -1) existing.push(next[i]);
  }
}

/**
 * Compute an Animated transform array using a stable, growing union of
 * all kinds the component has ever rendered. Components not present in
 * `prev`/`next` interpolate to/from their identity (visually inert).
 *
 * The returned shape `[{translateX: <Animated>}, {rotate: <Animated>}, …]`
 * is what RN's `Animated.View` consumes natively. The array length and
 * kind order match `kinds` exactly on every render.
 *
 * Per-kind interpolation routes through `buildSegmentedInterpolation`
 * with a single 0→1 segment so the easing curve is baked into the
 * outputRange. The native driver runs `Animated.timing` on a linear
 * timeline, so without sampling here a `cubic-bezier(...)` transition
 * would render linear visually.
 */
function interpolateTransform(
  progress: any,
  prev: any,
  next: any,
  kinds: ReadonlyArray<string>,
  easing: EasingDescriptor,
  durationMs: number
): any[] | null {
  const prevArr =
    typeof prev === 'string'
      ? parseTransformString(prev)
      : Array.isArray(prev)
        ? normalizeTransformArray(prev)
        : null;
  const nextArr =
    typeof next === 'string'
      ? parseTransformString(next)
      : Array.isArray(next)
        ? normalizeTransformArray(next)
        : null;
  if (prevArr === null || nextArr === null) return null;

  const prevByKind = new Map<string, number | string>();
  for (let i = 0; i < prevArr.length; i++) prevByKind.set(prevArr[i].kind, prevArr[i].value);
  const nextByKind = new Map<string, number | string>();
  for (let i = 0; i < nextArr.length; i++) nextByKind.set(nextArr[i].kind, nextArr[i].value);

  const out: any[] = [];
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i];
    const prevVal = prevByKind.has(kind) ? prevByKind.get(kind)! : transformIdentity(kind);
    const nextVal = nextByKind.has(kind) ? nextByKind.get(kind)! : transformIdentity(kind);
    out.push({
      [kind]: buildSegmentedInterpolation(
        progress,
        [
          { offset: 0, value: prevVal },
          { offset: 1, value: nextVal },
        ],
        [easing],
        easing,
        durationMs
      ),
    });
  }
  return out;
}

/** Convert RN's `[{translateX: 10}, {rotate: '5deg'}]` array form into our component shape. */
function normalizeTransformArray(arr: ReadonlyArray<any>): TransformComponent[] {
  const out: TransformComponent[] = [];
  for (let i = 0; i < arr.length; i++) {
    const entry = arr[i];
    if (!entry || typeof entry !== 'object') continue;
    for (const k in entry) {
      out.push({ kind: k, value: entry[k] });
      break; // RN entries are single-key objects
    }
  }
  return out;
}

function startTiming(
  scratch: AdapterScratch,
  state: PropAnim,
  duration: number,
  delay: number,
  easing: EasingDescriptor,
  prop: string,
  useNative: boolean,
  onTransitionEnd?: (event: NativeTransitionEvent) => void
): void {
  const Animated = getAnimated();
  if (!Animated) return;
  state.progress.setValue(0);
  // Native-driver path doesn't accept JS easing; we hand it a linear
  // timeline and bake the curve into the interpolate() outputRange.
  // The cycle-level decision is made by the caller (see autoNativeDriver):
  // either every transitioning prop in this cycle uses native, or none do.
  // Mixed-driver cycles paced unevenly on Android (JS rAF vs Choreographer).
  if (debugEnabled) {
    dbg(
      'timing',
      prop,
      `${state.prev}→${state.next}`,
      `dur=${duration}ms`,
      `native=${useNative}`,
      `easing=${easing.kind}`
    );
  }
  const useNativeDriverOnHost = useNative && !isWebPlatform();
  const handle = Animated.timing(state.progress, {
    toValue: 1,
    duration,
    delay,
    easing: useNative ? LINEAR_EASING : (t: number) => evaluateEasing(easing, t),
    useNativeDriver: useNativeDriverOnHost,
  });
  scratch.running.add(handle);
  state.active = handle;
  // Remember the easing so the next interruption can compute the
  // reversing-shortening-factor against `old_timing(t)` per spec.
  state.activeEasing = easing;
  handle.start((result?: { finished: boolean }) => {
    scratch.running.delete(handle);
    // A newer transition may have replaced state.active mid-flight; only
    // clear it when this completion belongs to the still-current handle.
    const wasActive = state.active === handle;
    if (wasActive) {
      state.active = null;
      // Settled transition resets the factor: the next change starts a
      // fresh cycle from a rested state.
      state.reversingFactor = 1;
    }
    if (debugEnabled) dbg('timing-end', prop, `finished=${result?.finished ?? '?'}`);
    // `transitionend` fires once per completing property after the
    // timing reaches its endpoint. Interrupted transitions
    // (`result.finished === false`, or a stale completion arriving
    // after a newer timing took over the same prop) do not dispatch;
    // the transition is "cancelled" instead.
    if (onTransitionEnd !== undefined && wasActive && result?.finished === true) {
      onTransitionEnd({ propertyName: prop, elapsedTime: (duration + delay) / 1000 });
    }
  });
}

/**
 * For each transitioning property, find the prev → next delta in
 * `baseValues` (the un-registered compiled style values); if changed,
 * snapshot prev/next, reset progress, and start a new timing.
 *
 * Returns a style array where the last entry is an overrides object
 * containing Animated.Values for transitioning props. Array merging
 * means the override wins over whatever shape `resolved` carries ;
 * works whether `resolved` is an object, a number (StyleSheet id in
 * production), an array, or a function (pseudo-state callback).
 */
function applyTransitions(
  scratch: AdapterScratch,
  transitions: TransitionDescriptor[],
  resolved: any,
  baseValues: Record<string, any> | undefined,
  shouldReduce: boolean,
  firstMount: boolean,
  startingStyle: Dict<any> | undefined,
  requestRerender: () => void,
  onTransitionEnd?: (event: NativeTransitionEvent) => void
): any {
  const Animated = getAnimated();
  if (!Animated || !baseValues) return resolved;

  // Descriptor properties are already runtime-keyed (camelized +
  // passthrough-renamed) by `compileNative.toRuntimeKey`, so the map
  // keys match `baseValues` keys directly.
  const transitionsByProp = new Map<string, TransitionDescriptor>();
  let hasAll: TransitionDescriptor | null = null;
  for (let i = 0; i < transitions.length; i++) {
    const t = transitions[i];
    if (t.property === 'all') hasAll = t;
    else transitionsByProp.set(t.property, t);
  }

  // Per-component driver decision. RN's `AnimatedStyle.__makeNative`
  // recursively converts every child node to native once any single
  // sibling prop is native-driven; the validator at submission time
  // then errors on each non-eligible key (`Style property 'width' is
  // not supported by native animated module`). So mixed-eligibility
  // styles can't actually run drivers per-prop -- the choice is
  // all-native or all-JS for a single Animated style block. Pick
  // native iff every prop starting a timing this render is in the
  // allowlist; otherwise all fall back to JS.
  let allEligible = true;
  let anyStarting = false;
  for (const k in baseValues) {
    const t = transitionsByProp.get(k) ?? hasAll;
    if (!t) continue;
    const next = baseValues[k];
    if (next === null || next === undefined) continue;
    const isTransform = k === 'transform';
    if (!isTransform && typeof next !== 'number' && typeof next !== 'string') continue;
    const existing = scratch.props.get(k);
    const willStart = existing === undefined || existing.next !== next;
    if (!willStart) continue;
    if (shouldReduce || t.durationMs <= 0) continue;
    // Discrete-flip props don't go through Animated.timing; they use a
    // plain setTimeout to swap the value at 50%. They can't influence
    // the cycle's driver choice for the props that DO start a timing.
    const prevForCheck = existing === undefined ? next : existing.next;
    if (!isSmoothlyInterpolable(prevForCheck, next, isTransform)) continue;
    anyStarting = true;
    if (!canUseNativeDriver(k)) {
      allEligible = false;
      break;
    }
  }
  const cycleUseNative = anyStarting && allEligible;

  let overrides: Record<string, any> | null = null;
  for (const k in baseValues) {
    const t = transitionsByProp.get(k) ?? hasAll;
    if (!t) continue;
    const next = baseValues[k];
    // Skip values we can't interpolate (objects/non-array compounds).
    // `transform` is a string or array;both supported below.
    if (next === null || next === undefined) continue;
    const isTransform = k === 'transform';
    if (!isTransform && typeof next !== 'number' && typeof next !== 'string') continue;

    let state = scratch.props.get(k);
    let changeStarted = false;
    if (state === undefined) {
      const startVal =
        firstMount && startingStyle && startingStyle[k] !== undefined && startingStyle[k] !== next
          ? startingStyle[k]
          : undefined;
      if (startVal !== undefined) {
        state = {
          prev: startVal,
          next,
          progress: new Animated.Value(0),
          active: null,
        };
        if (isTransform) {
          state.transformKinds = collectTransformKinds(next);
          unionTransformKinds(state.transformKinds!, startVal);
        }
        scratch.props.set(k, state);
        const startingInterpolable = isSmoothlyInterpolable(startVal, next, isTransform);
        if (shouldReduce || t.durationMs <= 0 || !startingInterpolable) {
          // Non-interpolable starting-style values would crash RN's
          // Animated.interpolate. Snap to next without animation; the
          // allow-discrete 50% flip path applies only to update-time
          // transitions, not the entry animation.
          state.progress.setValue(1);
        } else {
          startTiming(
            scratch,
            state,
            t.durationMs,
            t.delayMs,
            t.timingFunction,
            k,
            cycleUseNative,
            onTransitionEnd
          );
        }
        changeStarted = true;
        if (debugEnabled) {
          dbg('starting-style', k, `${describeTransform(startVal)} -> ${describeTransform(next)}`);
        }
      } else {
        state = {
          prev: next,
          next,
          progress: new Animated.Value(1),
          active: null,
        };
        if (isTransform) state.transformKinds = collectTransformKinds(next);
        scratch.props.set(k, state);
        if (debugEnabled) {
          dbg(
            'init',
            k,
            `value=${describeTransform(next)}`,
            isTransform ? `kinds=${state.transformKinds!.join(',')}` : ''
          );
        }
        continue;
      }
    } else if (state.next !== next) {
      changeStarted = true;
      // Reversing-shortening-factor: true reversal is determined
      // against the ORIGINAL `state.prev` (the previous transition's
      // start value), before the mid-flight capture below overwrites
      // it. Retargeted transitions (different third value) keep
      // factor 1.
      const wasPrev = state.prev;
      let reverseFactor = 1;
      const isReversal =
        state.active !== null && state.activeEasing !== undefined && Object.is(next, wasPrev);
      if (isReversal) {
        const readProgress = (state.progress as { __getValue?: () => number } | null)?.__getValue;
        if (typeof readProgress === 'function') {
          try {
            const linear = readProgress.call(state.progress);
            if (Number.isFinite(linear)) {
              const eased = evaluateEasing(state.activeEasing!, Math.max(0, Math.min(1, linear)));
              const oldFactor = state.reversingFactor ?? 1;
              const sum = eased * oldFactor + (1 - oldFactor);
              reverseFactor = Math.max(0, Math.min(1, Math.abs(sum)));
            }
          } catch {
            /* fall through; use 1 */
          }
        }
      }
      // An interrupted transition's new round starts from the
      // currently animated value, not from the prior end target. Try
      // to capture the mid-flight value; fall back to the prior end
      // target for shapes the helper can't reconstruct (transforms,
      // color strings, unit-mismatched strings).
      const wasNext = state.next;
      let newPrev: unknown = state.next;
      if (!isTransform) {
        const captured = captureCurrentValue(
          state.prev,
          state.next,
          state.progress,
          t.timingFunction
        );
        if (captured !== undefined) newPrev = captured;
      }
      state.prev = newPrev;
      state.next = next;
      if (isTransform) {
        unionTransformKinds(state.transformKinds!, next);
        if (debugEnabled) {
          dbg(
            'change',
            k,
            `${describeTransform(wasNext)} → ${describeTransform(next)}`,
            `kinds=${state.transformKinds!.join(',')}`
          );
        }
      } else if (debugEnabled) {
        dbg('change', k, `${wasNext} → ${next} (prev=${describeTransform(newPrev)})`);
      }
      // Fresh Animated.Value per transition. The previous one stays at
      // its terminal state (1);the previously-rendered interpolation
      // is still subscribed to it via RN's animated graph until the
      // commit unsubscribes it, so we let it sit at its final value
      // (= the just-visible value). If we instead `setValue(0)` on the
      // shared progress, the old interp re-evaluates at 0 → its
      // *prev*, which equals the new round's *next*, and RN paints
      // that as a one-frame flash to the final value. A fresh value
      // for the new interp avoids the cross-talk entirely.
      //
      // Stop any in-flight animation on the orphaned value so it
      // doesn't keep ticking into the void on the JS thread.
      state.progress.stopAnimation?.();
      state.active = null;
      state.progress = new Animated.Value(0);
      state.reversingFactor = reverseFactor;
      // Cancel any pending discrete-flip; the new round restarts the clock.
      if (state.discrete && state.discrete.flipTimeout !== null) {
        clearTimeout(state.discrete.flipTimeout);
        state.discrete.flipTimeout = null;
      }
      const effectiveDuration = t.durationMs * reverseFactor;
      if (shouldReduce || effectiveDuration <= 0) {
        state.progress.setValue(1);
        delete state.discrete;
        if (debugEnabled) dbg('snap', k, 'duration=0 or reduce-motion');
      } else if (!isSmoothlyInterpolable(state.prev, state.next, isTransform)) {
        if (t.behavior === 'allow-discrete') {
          // Discrete-flip path. Override emits `prev` until 50%, then
          // `next` after. setTimeout fires the swap and triggers a
          // re-render via the hook-level state setter.
          const localState = state;
          const flipMs = t.delayMs + t.durationMs / 2;
          const flipTimeout = setTimeout(
            () => {
              if (localState.discrete) {
                localState.discrete.shown = next;
                localState.discrete.flipTimeout = null;
              }
              requestRerender();
            },
            Math.max(0, flipMs)
          );
          state.discrete = { flipTimeout, shown: state.prev };
          if (debugEnabled) dbg('discrete-flip', k, `flipAt=${flipMs}ms`);
        } else {
          // Discrete prop without `allow-discrete`: snap, no transition.
          state.progress.setValue(1);
          delete state.discrete;
          if (debugEnabled) dbg('discrete-snap', k, `${state.prev} → ${next}`);
        }
      } else {
        delete state.discrete;
        startTiming(
          scratch,
          state,
          effectiveDuration,
          t.delayMs,
          t.timingFunction,
          k,
          cycleUseNative,
          onTransitionEnd
        );
      }
    }
    // Skip override emission while at rest. RN Android Fabric's prop-set
    // serializer logs "Unsupported type for radius property" every commit
    // for length-percentage props that resolve to an `AnimatedInterpolation`,
    // even when the value would compute to the static `next`.
    const inDiscreteFlip = state.discrete !== undefined && state.discrete.flipTimeout !== null;
    if (!changeStarted && state.active === null && !inDiscreteFlip) continue;
    if (state.discrete !== undefined) {
      if (overrides === null) overrides = {};
      overrides[k] = state.discrete.shown;
      if (debugEnabled) dbg('emit-discrete', k, `shown=${state.discrete.shown}`);
      continue;
    }
    if (isTransform) {
      const animatedTransform = interpolateTransform(
        state.progress,
        state.prev,
        state.next,
        state.transformKinds!,
        t.timingFunction,
        t.durationMs
      );
      if (animatedTransform === null) continue;
      if (overrides === null) overrides = {};
      overrides[k] = animatedTransform;
      if (debugEnabled) {
        dbg(
          'emit-transform',
          `len=${animatedTransform.length}`,
          describeTransform(animatedTransform)
        );
      }
    } else {
      if (overrides === null) overrides = {};
      overrides[k] = buildInterpolation(
        state.progress,
        state.prev,
        state.next,
        t.timingFunction,
        t.durationMs
      );
      if (debugEnabled) dbg('emit', k, `${state.prev}→${state.next}`);
    }
  }

  if (overrides === null) {
    if (debugEnabled) dbg('no-overrides');
    return resolved;
  }
  // Strip overridden keys from resolved so RN's Animated.View doesn't
  // briefly paint the static final value during the one-frame window
  // between React commit and the first Animated tick. With keys still
  // present in `resolved`, RN sees both `opacity: 0.25` (new static)
  // and `opacity: <interp>` and applies the static one for a frame
  // before the Animated subscription kicks in;visible as a flash to
  // the final value before the interpolation runs back from `prev`.
  return [stripOverriddenKeys(resolved, overrides), overrides];
}

/**
 * Remove `overrides`' keys from `style` so the only source of those
 * properties in the rendered style is the override (the Animated
 * interpolation). Handles plain objects, style arrays, and pseudo-state
 * functions; numeric StyleSheet ids are passed through unchanged
 * (their internal payload can't be edited and they're an in-prod
 * concern handled separately).
 */
function stripOverriddenKeys(style: any, overrides: Record<string, unknown>): any {
  if (style === null || style === undefined) return style;
  if (typeof style === 'number') return style; // StyleSheet id; opaque
  if (Array.isArray(style)) {
    const out = new Array(style.length);
    for (let i = 0; i < style.length; i++) out[i] = stripOverriddenKeys(style[i], overrides);
    return out;
  }
  if (typeof style === 'function') {
    // Pseudo-state callbacks: wrap so the override keys are stripped
    // from whatever the callback returns at render time.
    return (state: any) => stripOverriddenKeys(style(state), overrides);
  }
  if (typeof style !== 'object') return style;
  let cloned: Record<string, any> | null = null;
  for (const k in overrides) {
    if (k in style) {
      if (cloned === null) cloned = { ...style };
      delete (cloned as Record<string, any>)[k];
    }
  }
  return cloned ?? style;
}

function parseStop(stop: string): number {
  if (stop === 'from') return 0;
  if (stop === 'to') return 1;
  return parseFloat(stop) / 100;
}

function resolveKeyframes(
  keyframesDefs: CompiledKeyframes[],
  name: string,
  env: ResolveEnv
): NormalizedFrame[] | null {
  let def: CompiledKeyframes | null = null;
  for (let i = 0; i < keyframesDefs.length; i++) {
    if (keyframesDefs[i].name === name) def = keyframesDefs[i];
  }
  if (!def) return null;

  const out: NormalizedFrame[] = [];
  for (let i = 0; i < def.frames.length; i++) {
    const frame = def.frames[i];
    const decls =
      frame.resolvers && frame.resolvers.length > 0
        ? applyResolvers(frame.decls, frame.resolvers, env)
        : frame.decls;
    for (let s = 0; s < frame.stops.length; s++) {
      const nf: NormalizedFrame = { offset: parseStop(frame.stops[s]), decls };
      if (frame.easing) nf.easing = frame.easing;
      out.push(nf);
    }
  }
  out.sort((a, b) => a.offset - b.offset);
  return out.length > 0 ? out : null;
}

function parseUnitString(v: string): { n: number; unit: string } | undefined {
  const m = /^(-?[\d.]+)([a-z]+)$/i.exec(v);
  return m ? { n: parseFloat(m[1]), unit: m[2] } : undefined;
}

interface RGBA255 {
  r: number;
  g: number;
  b: number;
  /** Alpha in 0..1 range (matches CSS `rgba()` output). */
  a: number;
}

/**
 * Cached resolver for `@react-native/normalize-colors`. Used for the
 * named-color / `hsl()` / `hwb()` fallback path. The module is a transitive
 * dep of `react-native` (peer floor 0.85), so requiring it lazily mirrors
 * the {@link getRN} pattern: no DOM-side resolution, no hard import edge.
 */
type NormalizeColorFn = (s: string) => number | null;
let cachedNormalizeColor: NormalizeColorFn | null | undefined;
function getNormalizeColor(): NormalizeColorFn | null {
  if (cachedNormalizeColor !== undefined) return cachedNormalizeColor;
  let resolved: NormalizeColorFn | null;
  try {
    const mod = require('@react-native/normalize-colors');
    resolved = typeof mod === 'function' ? mod : (mod.default ?? null);
  } catch {
    resolved = null;
  }
  cachedNormalizeColor = resolved;
  return resolved;
}

/**
 * Test seam used by `animated-adapter.test.tsx` to verify the lazy require
 * path. Resets the cache so a fresh `getNormalizeColor()` call hits the
 * `require` branch again.
 */
function __resetNormalizeColorCacheForTests(): void {
  cachedNormalizeColor = undefined;
}

/**
 * Parse any CSS color string accepted by the spec into 8-bit RGB + 0..1
 * alpha. Tries paths in cost order:
 *
 *  1. Inline hex / `rgb()` / `rgba()` regex; covers the overwhelming
 *     majority of CSS-in-JS output without tokenization cost.
 *  2. Modern color functions (`oklch`, `oklab`, `lab`, `lch`, `hsl`,
 *     `hwb`, `color-mix`) via the static color-math polyfill. Falls
 *     through when an operand is a sentinel / `var()` / otherwise dynamic.
 *  3. RN's `@react-native/normalize-colors` for named keywords. Same
 *     table RN's StyleSheet pipeline consults at apply time.
 *
 * Returns null when none of the paths match; the caller snaps at 50%
 * (discrete interpolation) as the documented fallback for genuinely
 * unparseable colors.
 */
function parseAnimColor(s: string): RGBA255 | null {
  const t = s.trim();
  const len = t.length;

  // Fast path: hex. Uses bit-math + a charCode→nibble lookup so the
  // short-form (3/4) and long-form (6/8) share one code path with zero
  // intermediate string allocations.
  if (t.charCodeAt(0) === 0x23) {
    if (len === 4 || len === 5) {
      // 3 / 4 nibble shorthand: expand each nibble to a byte (×17).
      const r = nibble(t.charCodeAt(1)) * 17;
      const g = nibble(t.charCodeAt(2)) * 17;
      const b = nibble(t.charCodeAt(3)) * 17;
      const a = len === 5 ? (nibble(t.charCodeAt(4)) * 17) / 255 : 1;
      return { r, g, b, a };
    }
    if (len === 7 || len === 9) {
      const r = (nibble(t.charCodeAt(1)) << 4) | nibble(t.charCodeAt(2));
      const g = (nibble(t.charCodeAt(3)) << 4) | nibble(t.charCodeAt(4));
      const b = (nibble(t.charCodeAt(5)) << 4) | nibble(t.charCodeAt(6));
      const a = len === 9 ? ((nibble(t.charCodeAt(7)) << 4) | nibble(t.charCodeAt(8))) / 255 : 1;
      return { r, g, b, a };
    }
    return null;
  }
  const m =
    /^rgba?\(\s*([0-9.]+)\s*,?\s*([0-9.]+)\s*,?\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+)(%?))?\s*\)$/i.exec(
      t
    );
  if (m !== null) {
    let alpha = 1;
    if (m[4] !== undefined) {
      const a = parseFloat(m[4]);
      alpha = m[5] === '%' ? a / 100 : a;
    }
    return {
      r: parseFloat(m[1]),
      g: parseFloat(m[2]),
      b: parseFloat(m[3]),
      a: alpha,
    };
  }

  // Slow path: modern function forms via the colorMath polyfill. Goes
  // RGB → RGB directly (no hex string round-trip).
  if (t.indexOf('(') !== -1) {
    const tokens = tokenize(t);
    if (tokens.length === 1 && tokens[0].kind === TokenKind.Function) {
      const rgb = staticColorFunctionToRgb(tokens[0]);
      if (rgb !== null) {
        return { r: rgb.r * 255, g: rgb.g * 255, b: rgb.b * 255, a: rgb.a };
      }
    }
  }

  // Final path: named keywords via RN's normalize-colors.
  const normalizeColor = getNormalizeColor();
  if (normalizeColor === null) return null;
  const packed = normalizeColor(t);
  if (packed === null || typeof packed !== 'number') return null;
  // RN packs into 0xRRGGBBAA unsigned. Unpack as 8-bit + alpha 0..1.
  return {
    r: (packed >>> 24) & 0xff,
    g: (packed >>> 16) & 0xff,
    b: (packed >>> 8) & 0xff,
    a: (packed & 0xff) / 255,
  };
}

function clampByte(x: number): number {
  if (x <= 0) return 0;
  if (x >= 255) return 255;
  return Math.round(x);
}

function rgbaToCss(c: RGBA255): string {
  return rgbaToCssRaw(c.r, c.g, c.b, c.a);
}

/** Channel-arg form of `rgbaToCss`. The α=1 / α=0 fast paths skip
 *  `toFixed(4)` since most color transitions never touch alpha. */
function rgbaToCssRaw(r: number, g: number, b: number, alpha: number): string {
  const rc = clampByte(r);
  const gc = clampByte(g);
  const bc = clampByte(b);
  if (alpha >= 1) return 'rgba(' + rc + ',' + gc + ',' + bc + ',1)';
  if (alpha <= 0) return 'rgba(' + rc + ',' + gc + ',' + bc + ',0)';
  return 'rgba(' + rc + ',' + gc + ',' + bc + ',' + alpha.toFixed(4) + ')';
}

/**
 * Fused `oklab → display sRGB → rgba()` for the per-sample interpolation
 * inner; the rgba() string is the only allocation per sample.
 *
 * MUST mirror the matrix + transfer in `oklabToRgb`/`finalizeSrgb`/
 * `linearToSrgb` in `colorMath.ts`. Update both together.
 */
function oklabToRgbaCss(L: number, a: number, b: number, alpha: number): string {
  let r: number;
  let g: number;
  let bl: number;
  if (L >= 1) {
    r = 1;
    g = 1;
    bl = 1;
  } else if (L <= 0) {
    r = 0;
    g = 0;
    bl = 0;
  } else {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    let lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    lr = lr < 0 ? 0 : lr > 1 ? 1 : lr;
    lg = lg < 0 ? 0 : lg > 1 ? 1 : lg;
    lb = lb < 0 ? 0 : lb > 1 ? 1 : lb;
    r = lr <= 0.0031308 ? 12.92 * lr : 1.055 * Math.pow(lr, 1 / 2.4) - 0.055;
    g = lg <= 0.0031308 ? 12.92 * lg : 1.055 * Math.pow(lg, 1 / 2.4) - 0.055;
    bl = lb <= 0.0031308 ? 12.92 * lb : 1.055 * Math.pow(lb, 1 / 2.4) - 0.055;
  }
  return rgbaToCssRaw(r * 255, g * 255, bl * 255, alpha);
}

/**
 * Linearly interpolate parsed sRGBA in Oklab (CSS Color default interpolation space for color).
 */
function interpolateColorOklab(from: RGBA255, to: RGBA255, t: number): RGBA255 {
  const fromOk = srgbToOklab(from.r / 255, from.g / 255, from.b / 255, from.a);
  const toOk = srgbToOklab(to.r / 255, to.g / 255, to.b / 255, to.a);
  const L = fromOk.L + (toOk.L - fromOk.L) * t;
  const a = fromOk.a + (toOk.a - fromOk.a) * t;
  const b = fromOk.b + (toOk.b - fromOk.b) * t;
  const alpha = fromOk.alpha + (toOk.alpha - fromOk.alpha) * t;
  const out = oklabToRgb(L, a, b, alpha);
  return { r: out.r * 255, g: out.g * 255, b: out.b * 255, a: out.a };
}

function buildSegmentedInterpolation(
  progress: any,
  values: Array<{ offset: number; value: any }>,
  easings: Array<EasingDescriptor | undefined>,
  topEasing: EasingDescriptor,
  totalDurationMs: number
): any {
  if (values.length < 2) return values.length === 1 ? values[0].value : undefined;

  const inputRange: number[] = [];
  const outputRange: any[] = [];
  const isNumeric = typeof values[0].value === 'number';

  // Detect unit-bearing strings (e.g. '0deg', '180deg') that can be
  // interpolated numerically. All values must share the same unit.
  let sharedUnit: string | undefined;
  if (!isNumeric && typeof values[0].value === 'string') {
    const first = parseUnitString(values[0].value);
    if (
      first &&
      values.every(
        v => typeof v.value === 'string' && parseUnitString(v.value)?.unit === first.unit
      )
    ) {
      sharedUnit = first.unit;
    }
  }

  for (let i = 0; i < values.length - 1; i++) {
    const from = values[i];
    const to = values[i + 1];
    const easing = easings[i] ?? topEasing;
    const segLen = to.offset - from.offset;
    const segDurationMs = segLen * totalDurationMs;
    const samples = easingToInterpolation(easing, samplesForDuration(segDurationMs));
    // Per-segment color parse (hoisted out of the sample loop). Accepts
    // anything `parseAnimColor` recognizes: hex, `rgb()`/`rgba()`,
    // `hsl()`, `hwb()`, modern function forms (`oklch`, `lab`,
    // `color-mix`), and named keywords via `@react-native/normalize-colors`.
    // Falls through to the snap only when one side genuinely can't be
    // parsed (e.g. `currentColor`, mixed shapes).
    let segFromColor: RGBA255 | null = null;
    let segToColor: RGBA255 | null = null;
    let segFromOklab: ReturnType<typeof srgbToOklab> | null = null;
    let segToOklab: ReturnType<typeof srgbToOklab> | null = null;
    if (
      !isNumeric &&
      !sharedUnit &&
      typeof from.value === 'string' &&
      typeof to.value === 'string'
    ) {
      segFromColor = parseAnimColor(from.value);
      segToColor = parseAnimColor(to.value);
      if (segFromColor !== null && segToColor !== null) {
        // Precompute oklab endpoints once per segment (default color interpolation space).
        segFromOklab = srgbToOklab(
          segFromColor.r / 255,
          segFromColor.g / 255,
          segFromColor.b / 255,
          segFromColor.a
        );
        segToOklab = srgbToOklab(
          segToColor.r / 255,
          segToColor.g / 255,
          segToColor.b / 255,
          segToColor.a
        );
      }
    }
    for (let j = 0; j < samples.input.length; j++) {
      const t = samples.input[j];
      const eased = samples.output[j];
      const inp = from.offset + t * segLen;
      let v: any;
      if (isNumeric) {
        v = (from.value as number) + ((to.value as number) - (from.value as number)) * eased;
      } else if (sharedUnit) {
        const fromN = parseFloat(from.value);
        const toN = parseFloat(to.value);
        v = fromN + (toN - fromN) * eased + sharedUnit;
      } else if (segFromOklab !== null && segToOklab !== null) {
        const L = segFromOklab.L + (segToOklab.L - segFromOklab.L) * eased;
        const a = segFromOklab.a + (segToOklab.a - segFromOklab.a) * eased;
        const b = segFromOklab.b + (segToOklab.b - segFromOklab.b) * eased;
        const alpha = segFromOklab.alpha + (segToOklab.alpha - segFromOklab.alpha) * eased;
        v = oklabToRgbaCss(L, a, b, alpha);
      } else {
        // Genuinely discrete pair (e.g. `display: block` → `none`,
        // mixed shapes): discrete interpolation, 50% swap point.
        v = eased < 0.5 ? from.value : to.value;
      }
      if (inputRange.length > 0 && inputRange[inputRange.length - 1] === inp) {
        outputRange[outputRange.length - 1] = v;
      } else {
        inputRange.push(inp);
        outputRange.push(v);
      }
    }
  }

  // Ensure endpoints exist
  if (inputRange[0] !== 0) {
    inputRange.unshift(0);
    outputRange.unshift(outputRange[0]);
  }
  if (inputRange[inputRange.length - 1] !== 1) {
    inputRange.push(1);
    outputRange.push(outputRange[outputRange.length - 1]);
  }

  return progress.interpolate({ inputRange, outputRange, extrapolate: 'clamp' });
}

/** Add two parsed sRGB colors as Oklab component sums; alpha summed and clamped. */
function additiveCombineColor(base: RGBA255, frame: RGBA255): string {
  const baseOk = srgbToOklab(base.r / 255, base.g / 255, base.b / 255, base.a);
  const frameOk = srgbToOklab(frame.r / 255, frame.g / 255, frame.b / 255, frame.a);
  return oklabToRgbaCss(
    baseOk.L + frameOk.L,
    baseOk.a + frameOk.a,
    baseOk.b + frameOk.b,
    baseOk.alpha + frameOk.alpha
  );
}

/**
 * Additive composition (`add`): numeric pairs, matching-unit sums,
 * else oklab color sum when both parse as colors. Falls back to the
 * frame value otherwise (e.g. `currentColor`).
 */
function additiveCombine(base: any, frame: any): any {
  if (typeof base === 'number' && typeof frame === 'number') return base + frame;
  if (typeof base === 'string' && typeof frame === 'string') {
    const b = parseUnitString(base);
    const f = parseUnitString(frame);
    if (b && f && b.unit === f.unit) return `${b.n + f.n}${b.unit}`;
    const baseColor = parseAnimColor(base);
    if (baseColor !== null) {
      const frameColor = parseAnimColor(frame);
      if (frameColor !== null) return additiveCombineColor(baseColor, frameColor);
    }
  }
  return frame;
}

/**
 * Add a base transform to a frame transform per kind. Components on
 * both sides combine numerically (numeric+numeric or matching-unit
 * strings via {@link additiveCombine}). Kinds present only in the
 * base are emitted as-is; kinds present only in the frame are emitted
 * with the base contributing its identity (an absent transform
 * function contributes its identity).
 */
function additiveCombineTransform(base: any, frame: any): any {
  const baseComps =
    typeof base === 'string'
      ? parseTransformString(base)
      : Array.isArray(base)
        ? normalizeTransformArray(base)
        : null;
  const frameComps =
    typeof frame === 'string'
      ? parseTransformString(frame)
      : Array.isArray(frame)
        ? normalizeTransformArray(frame)
        : null;
  if (!baseComps || !frameComps) return frame;
  const baseByKind = new Map<string, number | string>();
  for (let i = 0; i < baseComps.length; i++) baseByKind.set(baseComps[i].kind, baseComps[i].value);
  const seen = new Set<string>();
  const out: Array<Record<string, number | string>> = [];
  for (let i = 0; i < frameComps.length; i++) {
    const c = frameComps[i];
    const bv = baseByKind.get(c.kind);
    out.push({ [c.kind]: bv !== undefined ? additiveCombine(bv, c.value) : c.value });
    seen.add(c.kind);
  }
  for (let i = 0; i < baseComps.length; i++) {
    if (!seen.has(baseComps[i].kind)) out.push({ [baseComps[i].kind]: baseComps[i].value });
  }
  return out;
}

function buildKeyframeInterpolations(
  progress: any,
  frames: NormalizedFrame[],
  topEasing: EasingDescriptor,
  baseValues: Record<string, any> | undefined,
  useNative: boolean,
  durationMs: number,
  composition: AnimationDescriptor['composition'] = 'replace'
): { overrides: Record<string, any>; drivenProps: Set<string>; transformKinds?: string[] } {
  // `add` and `accumulate` are spec-distinguished only for list-valued
  // properties: addition extends the list (concatenation), accumulation
  // pads to equal length and combines componentwise. For everything the
  // adapter currently animates (numbers, lengths/angles/percentages,
  // colors, and per-kind transform components) the two operations
  // produce identical results, so both flow through the same combiner.
  const isAdditive = composition === 'add' || composition === 'accumulate';
  const allProps = new Set<string>();
  for (let i = 0; i < frames.length; i++) {
    for (const k in frames[i].decls) allProps.add(k);
  }

  const overrides: Record<string, any> = {};
  const drivenProps = new Set<string>();
  let transformKinds: string[] | undefined;

  for (const prop of allProps) {
    if (prop === 'transform') {
      const framesByOffset: Array<{ offset: number; value: any; easing?: EasingDescriptor }> = [];
      const base0 = baseValues ? baseValues[prop] : undefined;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].decls[prop] !== undefined) {
          const raw = frames[i].decls[prop];
          // Additive composition: combine base transform with frame
          // transform component-by-component. Synthetic offset 0/1
          // entries below stay base-only so the underlying value is
          // visible at endpoints with no explicit keyframe.
          const value =
            isAdditive && base0 !== undefined ? additiveCombineTransform(base0, raw) : raw;
          const entry: { offset: number; value: any; easing?: EasingDescriptor } = {
            offset: frames[i].offset,
            value,
          };
          const frameEasing = frames[i].easing;
          if (frameEasing) entry.easing = frameEasing;
          framesByOffset.push(entry);
        }
      }
      if (base0 !== undefined) {
        const has0 = framesByOffset.some(f => f.offset === 0);
        const has1 = framesByOffset.some(f => f.offset === 1);
        if (!has0) framesByOffset.push({ offset: 0, value: base0 });
        if (!has1) framesByOffset.push({ offset: 1, value: base0 });
      }
      framesByOffset.sort((a, b) => a.offset - b.offset);

      if (framesByOffset.length < 2) continue;

      // Collect all kinds across all frames
      const allKinds: string[] = [];
      for (let i = 0; i < framesByOffset.length; i++) {
        unionTransformKinds(allKinds, framesByOffset[i].value);
      }
      transformKinds = allKinds;

      // Build per-kind interpolation
      const transformArr: any[] = [];
      for (let ki = 0; ki < allKinds.length; ki++) {
        const kind = allKinds[ki];
        const values: Array<{ offset: number; value: any }> = [];
        const easings: Array<EasingDescriptor | undefined> = [];

        for (let fi = 0; fi < framesByOffset.length; fi++) {
          const f = framesByOffset[fi];
          const comps =
            typeof f.value === 'string'
              ? parseTransformString(f.value)
              : Array.isArray(f.value)
                ? normalizeTransformArray(f.value)
                : [];
          let found: number | string = transformIdentity(kind);
          for (let ci = 0; ci < comps.length; ci++) {
            if (comps[ci].kind === kind) {
              found = comps[ci].value;
              break;
            }
          }
          values.push({ offset: f.offset, value: found });
          if (fi < framesByOffset.length - 1) {
            easings.push(f.easing);
          }
        }

        const interp = buildSegmentedInterpolation(
          progress,
          values,
          easings,
          topEasing,
          durationMs
        );
        transformArr.push({ [kind]: interp });
      }

      overrides[prop] = transformArr;
      drivenProps.add(prop);
    } else {
      const values: Array<{ offset: number; value: any }> = [];
      const easings: Array<EasingDescriptor | undefined> = [];

      const collected: Array<{ offset: number; value: any; easing?: EasingDescriptor }> = [];
      const baseVal = baseValues ? baseValues[prop] : undefined;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].decls[prop] !== undefined) {
          // Additive composition: explicit keyframe values are added
          // on top of the underlying value. Synthetic offset 0/1
          // endpoints below remain base-only (base + 0 = base), which
          // preserves the documented "underlying value seen at
          // endpoints" semantics.
          const raw = frames[i].decls[prop];
          const value = isAdditive && baseVal !== undefined ? additiveCombine(baseVal, raw) : raw;
          const entry: { offset: number; value: any; easing?: EasingDescriptor } = {
            offset: frames[i].offset,
            value,
          };
          const frameEasing = frames[i].easing;
          if (frameEasing) entry.easing = frameEasing;
          collected.push(entry);
        }
      }
      if (baseVal !== undefined) {
        const has0 = collected.some(f => f.offset === 0);
        const has1 = collected.some(f => f.offset === 1);
        if (!has0) collected.push({ offset: 0, value: baseVal });
        if (!has1) collected.push({ offset: 1, value: baseVal });
      }
      collected.sort((a, b) => a.offset - b.offset);

      if (collected.length < 2) continue;

      for (let i = 0; i < collected.length; i++) {
        values.push({ offset: collected[i].offset, value: collected[i].value });
        if (i < collected.length - 1) {
          easings.push(collected[i].easing);
        }
      }

      const interp = buildSegmentedInterpolation(progress, values, easings, topEasing, durationMs);
      overrides[prop] = interp;
      drivenProps.add(prop);
    }
  }

  const result: {
    overrides: Record<string, any>;
    drivenProps: Set<string>;
    transformKinds?: string[];
  } = { overrides, drivenProps };
  if (transformKinds) result.transformKinds = transformKinds;
  return result;
}

function startKeyframeAnimation(
  scratch: AdapterScratch,
  animS: AnimScratch,
  desc: AnimationDescriptor,
  useNative: boolean,
  onAnimationEnd?: (event: NativeAnimationEvent) => void
): void {
  const Animated = getAnimated();
  if (!Animated) return;

  const useNativeDriverOnHost = useNative && !isWebPlatform();
  let duration = desc.durationMs;
  let delay = desc.delayMs;
  const isReverse = desc.direction === 'reverse' || desc.direction === 'alternate-reverse';
  const isAlternate = desc.direction === 'alternate' || desc.direction === 'alternate-reverse';
  const iterCount = desc.iterationCount;

  // Negative delay: skip ahead
  let initialProgress = isReverse ? 1 : 0;
  if (delay < 0) {
    const skipMs = Math.abs(delay);
    const skipFrac = Math.min(skipMs / duration, 1);
    initialProgress = isReverse ? 1 - skipFrac : skipFrac;
    delay = 0;
  }

  // Resuming from `animation-play-state: paused`. Resume must
  // continue from the captured progress, both within the current
  // iteration AND from the current iteration index. Three resume
  // tracks:
  //
  //  1. Single iteration (iterCount===1, non-alternate): shrink the
  //     timing to the remaining segment and let the main body
  //     construction emit it.
  //  2. Multi-iteration (non-alternate, integer or `Infinity`,
  //     forward or reverse): build a `sequence([partial_current,
  //     loop(remaining)])` so the adapter resumes at the captured
  //     iteration rather than restarting from cycle 0. Reverse
  //     loops route through `loopableIter` which prepends a duration-0
  //     reset-to-1 step before each iteration; `Animated.loop` calls
  //     `resetAnimation()` between iterations, which restores the
  //     AnimatedValue to its construction-time starting value (0) and
  //     would otherwise leave reverse iters animating 0→0.
  //  3. Alternate / alternate-reverse (integer iterCount): build an
  //     explicit `sequence([partial_current, ...remaining_iters])`
  //     where each remaining iter's direction is computed from the
  //     iteration index parity. Each timing in the sequence starts
  //     from the value left by the previous timing, so the reset
  //     issue from track 2 doesn't apply here.
  //
  //  Infinite alternate is the one remaining shape on the restart
  //  fallback; loop-of-pairs with parity-aware first-pair direction
  //  needs another reset wrapper that this round doesn't tackle.
  const resumeAt = animS.pausedAt;
  const pausedIter = animS.pausedIterIndex ?? 0;
  const canResumeMultiIter =
    resumeAt !== undefined &&
    duration > 0 &&
    !isAlternate &&
    (iterCount === Infinity || Number.isInteger(iterCount)) &&
    iterCount > 1 &&
    pausedIter < iterCount;
  const canResumeAlternate =
    resumeAt !== undefined &&
    duration > 0 &&
    isAlternate &&
    (iterCount === Infinity || Number.isInteger(iterCount)) &&
    iterCount > 1 &&
    pausedIter < iterCount;

  // For alternate, iter parity decides direction within an iteration.
  // `alternate`: even iter forward (0→1), odd iter reverse (1→0).
  // `alternate-reverse`: even iter reverse (1→0), odd iter forward.
  const currentIterIsReverseSense = canResumeAlternate
    ? isReverse
      ? pausedIter % 2 === 0
      : pausedIter % 2 === 1
    : false;

  if (resumeAt !== undefined && iterCount === 1 && !isAlternate && duration > 0) {
    if (isReverse) {
      initialProgress = resumeAt;
      duration = Math.max(0, duration * resumeAt);
    } else {
      initialProgress = resumeAt;
      duration = Math.max(0, duration * (1 - resumeAt));
    }
    delay = 0;
  } else if (canResumeMultiIter || canResumeAlternate) {
    initialProgress = resumeAt!;
  }
  delete animS.pausedAt;
  delete animS.pausedIterIndex;

  animS.progress.setValue(initialProgress);

  const makeForward = (dur: number, dl: number) =>
    Animated.timing(animS.progress, {
      toValue: 1,
      duration: dur,
      delay: dl,
      easing: LINEAR_EASING,
      useNativeDriver: useNativeDriverOnHost,
    });

  const makeReverse = (dur: number, dl: number) =>
    Animated.timing(animS.progress, {
      toValue: 0,
      duration: dur,
      delay: dl,
      easing: LINEAR_EASING,
      useNativeDriver: useNativeDriverOnHost,
    });

  /**
   * Build one iteration body suitable for `Animated.loop`. Forward
   * iterations pass through; reverse iterations are wrapped in a
   * `sequence([snap_to_1, makeReverse])` so each loop iteration starts
   * at progress=1 rather than 0. Required because `Animated.loop` calls
   * `Animated.Value.resetAnimation()` between iterations, which resets
   * the value to the construction-time starting value (0 here). Without
   * the snap, reverse loops animate 0→0 from iteration 2 onward.
   */
  const loopableIter = (dur: number): any => {
    const timing = isReverse ? makeReverse(dur, 0) : makeForward(dur, 0);
    if (!isReverse) return timing;
    return Animated.sequence([
      Animated.timing(animS.progress, {
        toValue: 1,
        duration: 0,
        delay: 0,
        easing: LINEAR_EASING,
        useNativeDriver: useNativeDriverOnHost,
      }),
      timing,
    ]);
  };

  /**
   * Build a two-iteration alternate pair suitable for `Animated.loop`.
   * `firstIsReverseSense=false`: `[fwd 0→1, bwd 1→0]`. After pair:
   * progress=0, which matches `Animated.loop`'s reset-to-0 for the
   * next iteration's start.
   * `firstIsReverseSense=true`: `[snap_to_1, fwd 1→0, bwd 0→1]`.
   * `Animated.loop` resets to 0 between iterations, but the snap-to-1
   * step inside the pair restores progress=1 before the reverse leg
   * runs. Without the snap the leg would animate 0→0.
   */
  const alternatePair = (dur: number, firstIsReverseSense: boolean): any => {
    if (!firstIsReverseSense) {
      return Animated.sequence([makeForward(dur, 0), makeReverse(dur, 0)]);
    }
    return Animated.sequence([
      Animated.timing(animS.progress, {
        toValue: 1,
        duration: 0,
        delay: 0,
        easing: LINEAR_EASING,
        useNativeDriver: useNativeDriverOnHost,
      }),
      makeReverse(dur, 0),
      makeForward(dur, 0),
    ]);
  };

  let body: any;

  if (canResumeMultiIter) {
    // Multi-iter resume path. Emit one partial timing for the current
    // iteration's remainder, then loop the remaining full iterations.
    // `loopableIter` wraps reverse iterations in a snap-to-1 reset so
    // they survive `Animated.loop`'s between-iteration reset.
    const ra = resumeAt!;
    const partialDuration = isReverse
      ? Math.max(0, duration * ra)
      : Math.max(0, duration * (1 - ra));
    const partial = isReverse ? makeReverse(partialDuration, 0) : makeForward(partialDuration, 0);
    const remaining = iterCount === Infinity ? Infinity : iterCount - pausedIter - 1;
    if (remaining <= 0) {
      body = partial;
    } else {
      // Always go through `Animated.loop` for the remainder. Its
      // between-iteration `reset()` snaps value back to 0, which
      // forward iters can start from directly; reverse iters carry
      // their own snap-to-1 inside `loopableIter`. Skipping the loop
      // wrapper for `remaining === 1` would mean the post-partial
      // timing starts from the partial's end value (1 for forward,
      // 0 for reverse) and animate to the same value (no motion).
      const loopBody = Animated.loop(loopableIter(duration), {
        iterations: remaining === Infinity ? -1 : remaining,
      });
      // Native `Animated.loop` calls `_startNativeLoop` (single native
      // timing with `iterations`). Android/iOS `FrameBasedAnimation`
      // samples `fromValue` from the node only on the first loop
      // (`currentLoop == 1`). The resume partial ends at progress=1
      // for forward keyframes, so the next native loop would see
      // `fromValue === toValue === 1` (zero delta) and appear frozen
      // after the partial. JS-driven loops still run `reset()` between
      // iterations; insert a 0-duration snap back to the cycle start
      // only for the native forward case.
      const needsNativeLoopRestartSnap = useNativeDriverOnHost && !isReverse;
      const snapToLoopStart = Animated.timing(animS.progress, {
        toValue: 0,
        duration: 0,
        delay: 0,
        easing: LINEAR_EASING,
        useNativeDriver: useNativeDriverOnHost,
      });
      body = needsNativeLoopRestartSnap
        ? Animated.sequence([partial, snapToLoopStart, loopBody])
        : Animated.sequence([partial, loopBody]);
    }
  } else if (canResumeAlternate) {
    // Alternate resume path. The current iteration's direction is
    // decided by parity of `pausedIter` against the overall direction
    // mode. After the partial, subsequent iterations alternate.
    //
    // Finite iterCount: explicit `Animated.sequence` of [partial,
    // ...rest] timings where each timing's direction flips. Sequence
    // semantics let each timing pick up from the previous timing's
    // end value without needing the snap-to-1 trick that
    // `Animated.loop` requires.
    //
    // Infinite iterCount: build `sequence([partial, loop(pair)])`
    // where `pair` leads with the iteration that comes immediately
    // after the partial. `alternatePair` handles the reset-aware
    // construction so the pair survives `Animated.loop`'s between-
    // iteration reset.
    const ra = resumeAt!;
    const partial = currentIterIsReverseSense
      ? makeReverse(duration * ra, 0)
      : makeForward(duration * (1 - ra), 0);
    const nextIsReverseSense = !currentIterIsReverseSense;
    if (iterCount === Infinity) {
      const pair = alternatePair(duration, nextIsReverseSense);
      body = Animated.sequence([partial, Animated.loop(pair)]);
    } else {
      const remaining = iterCount - pausedIter - 1;
      const parts: any[] = [partial];
      let curIsReverse = nextIsReverseSense;
      for (let i = 0; i < remaining; i++) {
        parts.push(curIsReverse ? makeReverse(duration, 0) : makeForward(duration, 0));
        curIsReverse = !curIsReverse;
      }
      body = parts.length === 1 ? parts[0] : Animated.sequence(parts);
    }
  } else if (isAlternate) {
    // Alternate / alternate-reverse fresh start. The first iteration's
    // direction is the "reverse sense" when `alternate-reverse`; we
    // route every multi-iteration loop body through `alternatePair`
    // which prepends a snap-to-1 step when the pair leads with reverse.
    // `Animated.loop` otherwise resets value to 0 between pair iters
    // and would break the reverse leg.
    const pairLeadsReverse = isReverse;
    const pair = alternatePair(duration, pairLeadsReverse);

    if (iterCount === Infinity) {
      const looped = Animated.loop(pair);
      body =
        delay > 0
          ? Animated.sequence([
              Animated.timing(animS.progress, {
                toValue: initialProgress,
                duration: 0,
                delay,
                easing: LINEAR_EASING,
                useNativeDriver: useNativeDriverOnHost,
              }),
              looped,
            ])
          : looped;
    } else {
      const fullPairs = Math.floor(iterCount / 2);
      const remainder = iterCount - fullPairs * 2;
      const parts: any[] = [];
      let delayConsumed = false;

      if (fullPairs > 0) {
        if (delay > 0) {
          parts.push(
            Animated.timing(animS.progress, {
              toValue: initialProgress,
              duration: 0,
              delay,
              easing: LINEAR_EASING,
              useNativeDriver: useNativeDriverOnHost,
            })
          );
          delayConsumed = true;
        }
        parts.push(fullPairs === 1 ? pair : Animated.loop(pair, { iterations: fullPairs }));
      }

      if (remainder > 0) {
        const firstDelay = !delayConsumed ? delay : 0;
        if (remainder >= 1) {
          parts.push(
            isReverse ? makeReverse(duration, firstDelay) : makeForward(duration, firstDelay)
          );
          const frac = remainder - 1;
          if (frac > 0) {
            parts.push(
              isReverse ? makeForward(duration * frac, 0) : makeReverse(duration * frac, 0)
            );
          }
        } else {
          parts.push(
            isReverse
              ? makeReverse(duration * remainder, firstDelay)
              : makeForward(duration * remainder, firstDelay)
          );
        }
      }

      body = parts.length === 1 ? parts[0] : Animated.sequence(parts);
    }
  } else {
    // normal or reverse (no alternation)
    if (iterCount === 1) {
      // Single iteration: no loop wrapper needed. The outer
      // `setValue(initialProgress)` holds.
      body = isReverse ? makeReverse(duration, delay) : makeForward(duration, delay);
    } else if (iterCount === Infinity || iterCount % 1 === 0) {
      // Looped iterations. Route through `loopableIter` so reverse
      // direction snaps value back to 1 before each inner timing;
      // `Animated.loop`'s between-iteration reset otherwise leaves
      // reverse loops animating 0→0 after the first iteration.
      const inner = loopableIter(duration);
      const iters = iterCount === Infinity ? Infinity : iterCount;
      // The first loop iteration also gets a reset() call, which can
      // clobber `setValue(initialProgress)`. For reverse the inner
      // sequence's snap-to-1 step restores progress=1, so the loop is
      // self-contained. For forward, value at 0 (from setValue or
      // reset) matches the iter's starting expectation already.
      body =
        delay > 0
          ? Animated.sequence([
              // 0-duration delay-only timing so `Animated.loop` runs
              // after the requested delay. `Animated.loop` doesn't
              // expose its own delay parameter.
              Animated.timing(animS.progress, {
                toValue: initialProgress,
                duration: 0,
                delay,
                easing: LINEAR_EASING,
                useNativeDriver: useNativeDriverOnHost,
              }),
              Animated.loop(inner, {
                iterations: iters === Infinity ? -1 : iters,
              }),
            ])
          : Animated.loop(inner, { iterations: iters === Infinity ? -1 : iters });
    } else {
      const fullIters = Math.floor(iterCount);
      const remainder = iterCount - fullIters;
      const parts: any[] = [];
      // Apply delay once at the start of the sequence rather than per
      // iteration. The first concrete timing (full iter or remainder)
      // carries the delay; routing through a synthetic 0-duration
      // delay timing keeps the inner loop's per-iter behavior pure.
      if (fullIters > 0) {
        if (fullIters === 1) {
          parts.push(isReverse ? makeReverse(duration, delay) : makeForward(duration, delay));
        } else {
          if (delay > 0) {
            parts.push(
              Animated.timing(animS.progress, {
                toValue: initialProgress,
                duration: 0,
                delay,
                easing: LINEAR_EASING,
                useNativeDriver: useNativeDriverOnHost,
              })
            );
          }
          parts.push(
            Animated.loop(loopableIter(duration), {
              iterations: fullIters,
            })
          );
        }
      }
      const remDur = duration * remainder;
      // Remainder iter inherits the delay only when there are no
      // preceding full iters to carry it.
      const remDelay = parts.length === 0 ? delay : 0;
      parts.push(isReverse ? makeReverse(remDur, remDelay) : makeForward(remDur, remDelay));
      body = parts.length === 1 ? parts[0] : Animated.sequence(parts);
    }
  }

  const handle: AnimationHandle = {
    stop: () => {
      try {
        body.stop?.();
      } catch {}
    },
  };
  scratch.running.add(handle);
  animS.handle = handle;

  const totalElapsedSec =
    (desc.delayMs + duration * (iterCount === Infinity ? 1 : iterCount)) / 1000;
  // Track when the timing began so the override-merge can distinguish
  // the delay window (animS.startedAt + delayMs > now) from the actual
  // animation phase. Fill-mode `backwards` / `both` apply the 0%
  // keyframe during delay; `none` / `forwards` apply nothing.
  animS.startedAt = Date.now();
  animS.delayMs = delay;
  body.start((result?: { finished: boolean }) => {
    scratch.running.delete(handle);
    const wasActive = animS.handle === handle;
    if (wasActive) animS.handle = null;
    // `CompositeAnimation.stop()` (pause) unwinds synchronously with
    // `{ finished: false }`. That callback must not mark the slot
    // `finished` or the next `animation-play-state: running` pass can
    // never restart (`!animS.finished` guard). Stale completions after a
    // superseding `startKeyframeAnimation` see `wasActive === false` and
    // are ignored here too. Only `{ finished: true }` while this handle
    // was still current ends a finite iteration chain.
    if (wasActive && result && result.finished === true) {
      animS.finished = true;
      // Fill-mode `none` and `backwards` drop overrides after the
      // animation ends; `forwards` and `both` keep the final values.
      if (desc.fillMode === 'none' || desc.fillMode === 'backwards') {
        animS.overrides = {};
      }
      // `animationend` fires once when the animation completes
      // successfully. Interrupted animations
      // (`result.finished === false`, or a stale completion arriving
      // after a newer animation took over the same slot) do not
      // dispatch; that is "cancel" / `animationcancel`, which we don't
      // yet surface.
      if (onAnimationEnd !== undefined) {
        onAnimationEnd({ animationName: desc.name, elapsedTime: totalElapsedSec });
      }
    }
    if (debugEnabled) dbg('anim-end', animS.name, `finished=${result?.finished ?? '?'}`);
  });

  if (debugEnabled) {
    dbg(
      'anim-start',
      animS.name,
      `dur=${duration}`,
      `delay=${delay}`,
      `iter=${iterCount}`,
      `dir=${desc.direction}`,
      `fill=${desc.fillMode}`,
      `native=${useNative}`
    );
  }
}

function applyAnimations(
  scratch: AdapterScratch,
  animations: AnimationDescriptor[],
  keyframesDefs: CompiledKeyframes[],
  resolved: any,
  baseValues: Record<string, any> | undefined,
  env: ResolveEnv,
  shouldReduce: boolean,
  onAnimationEnd?: (event: NativeAnimationEvent) => void
): any {
  const Animated = getAnimated();
  if (!Animated || !baseValues) return resolved;

  if (!scratch.anims) scratch.anims = [];

  let mergedOverrides: Record<string, any> | null = null;

  for (let idx = 0; idx < animations.length; idx++) {
    const desc = animations[idx];

    if (desc.name === 'none' || desc.durationMs <= 0 || shouldReduce) {
      // Clean up scratch if it existed
      if (idx < scratch.anims.length) {
        const old = scratch.anims[idx];
        if (old.handle) {
          old.handle.stop();
          scratch.running.delete(old.handle);
        }
        old.overrides = {};
        old.drivenProps.clear();
        old.finished = true;
        old.name = '';
      }
      continue;
    }

    const frames = resolveKeyframes(keyframesDefs, desc.name, env);
    if (!frames) continue;

    let animS: AnimScratch;
    if (idx < scratch.anims.length) {
      animS = scratch.anims[idx];
    } else {
      animS = {
        name: '',
        progress: new Animated.Value(0),
        handle: null,
        overrides: {},
        drivenProps: new Set(),
        fillMode: desc.fillMode,
        finished: false,
      };
      scratch.anims.push(animS);
    }

    // Detect name change or first appearance
    if (animS.name !== desc.name) {
      // Stop previous animation
      if (animS.handle) {
        animS.handle.stop();
        scratch.running.delete(animS.handle);
      }
      animS.progress.stopAnimation?.();
      animS.progress = new Animated.Value(0);
      animS.name = desc.name;
      animS.fillMode = desc.fillMode;
      animS.finished = false;
      animS.prevPlayState = desc.playState;

      // Determine native driver eligibility
      let canNative = true;
      for (const p of frames) {
        for (const k in p.decls) {
          if (!canUseNativeDriver(k)) {
            canNative = false;
            break;
          }
        }
        if (!canNative) break;
      }

      const result = buildKeyframeInterpolations(
        animS.progress,
        frames,
        desc.timingFunction,
        baseValues,
        canNative,
        desc.durationMs,
        desc.composition
      );
      animS.overrides = result.overrides;
      animS.drivenProps = result.drivenProps;
      if (result.transformKinds) animS.transformKinds = result.transformKinds;

      if (desc.playState === 'running') {
        startKeyframeAnimation(scratch, animS, desc, canNative, onAnimationEnd);
      }
    } else {
      // Same animation name: check play-state changes
      if (animS.prevPlayState !== desc.playState) {
        if (desc.playState === 'paused' && animS.handle) {
          // Derive the current iteration from wall-clock elapsed time
          // so multi-iteration animations resume from the right cycle.
          // Alternate directions pair two iterations into one round
          // trip; we divide by the round-trip duration to keep parity
          // information implicit in the index.
          if (animS.startedAt !== undefined && desc.durationMs > 0) {
            const elapsedMs = Date.now() - animS.startedAt - (animS.delayMs ?? 0);
            if (elapsedMs > 0) {
              animS.pausedIterIndex = Math.floor(elapsedMs / desc.durationMs);
            } else {
              animS.pausedIterIndex = 0;
            }
          }
          // Stop the composite timing first so native-driven progress
          // is quiescent. Reading `__getValue()` before stop (or
          // without a native flush) leaves the JS mirror stale while
          // the native driver runs; resume then restarts from the
          // wrong phase (pause must freeze actual progress).
          animS.handle.stop();
          scratch.running.delete(animS.handle);
          animS.handle = null;
          const pv = animS.progress as {
            stopAnimation?: (cb?: (value: number) => void) => void;
            __getValue?: () => number;
          };
          if (typeof pv.stopAnimation === 'function') {
            pv.stopAnimation((value: number) => {
              if (Number.isFinite(value)) animS.pausedAt = Math.min(1, Math.max(0, value));
            });
          } else if (typeof pv.__getValue === 'function') {
            try {
              const v = pv.__getValue();
              if (Number.isFinite(v)) animS.pausedAt = Math.min(1, Math.max(0, v));
            } catch {
              /* resume restarts fresh if we can't read */
            }
          }
        } else if (desc.playState === 'running' && !animS.handle && !animS.finished) {
          // Resume from current progress
          let canNative = true;
          for (const p of frames) {
            for (const k in p.decls) {
              if (!canUseNativeDriver(k)) {
                canNative = false;
                break;
              }
            }
            if (!canNative) break;
          }
          startKeyframeAnimation(scratch, animS, desc, canNative, onAnimationEnd);
        }
        animS.prevPlayState = desc.playState;
      }
    }

    // Merge overrides per fill-mode rules.
    //  - `none`: no override before start or after end.
    //  - `forwards`: override after end; nothing during delay.
    //  - `backwards`: override during delay; cleared after end.
    //  - `both`: override during delay AND after end.
    if (animS.finished && (desc.fillMode === 'none' || desc.fillMode === 'backwards')) continue;
    const inDelay =
      animS.startedAt !== undefined &&
      animS.delayMs !== undefined &&
      animS.delayMs > 0 &&
      !animS.finished &&
      Date.now() - animS.startedAt < animS.delayMs;
    if (inDelay && (desc.fillMode === 'none' || desc.fillMode === 'forwards')) continue;
    if (Object.keys(animS.overrides).length > 0) {
      if (mergedOverrides === null) mergedOverrides = {};
      for (const k in animS.overrides) {
        mergedOverrides[k] = animS.overrides[k];
      }
    }
  }

  // Trim excess scratch entries
  while (scratch.anims.length > animations.length) {
    const removed = scratch.anims.pop()!;
    if (removed.handle) {
      removed.handle.stop();
      scratch.running.delete(removed.handle);
    }
  }

  if (mergedOverrides === null) return resolved;
  return [stripOverriddenKeys(resolved, mergedOverrides), mergedOverrides];
}

const animatedAdapter: AnimationAdapter = {
  id: 'animated',
  useAnimatedStyle(input: AnimatedStyleInput): AnimatedStyleOutput {
    const { compiled, resolved, target, env } = input;

    // No animation work to do;bail without paying for refs/effects.
    // The hook order rule still holds: `useImpl` calls this hook
    // unconditionally on the slow path, but the slow path is fixed at
    // construction.
    const hasTransition = compiled.transitions !== undefined;
    const hasAnimation = compiled.animations !== undefined;
    const hasStarting = compiled.startingStyle !== undefined;

    const scratchRef = React.useRef<AdapterScratch | null>(null);
    if (scratchRef.current === null) scratchRef.current = createScratch();
    const scratch = scratchRef.current;

    // Tick counter: bumped from setTimeout callbacks (e.g. allow-discrete
    // 50%-flip) so the hook re-runs and the override picks up the new
    // shown value. The render isn't otherwise driven by React, since
    // RN's Animated.timing path commits via the native animated graph.
    const [, setTick] = React.useState(0);
    const requestRerenderRef = React.useRef<() => void>(() => {});
    requestRerenderRef.current = () => setTick(t => t + 1);

    // scratchRef.current is component-scoped and never reassigned, so
    // the cleanup runs exactly once on unmount with stable deps.
    React.useEffect(() => () => disposeScratch(scratchRef.current!), []);

    if (!hasTransition && !hasAnimation && !hasStarting) {
      return passthroughOutput(input);
    }

    // Resolve sentinel-laden values in baseValues at render time so
    // the adapter diffs against actual values, not raw sentinel
    // templates. Without this, transitions on values that include
    // theme tokens (`${t.colors.x}`, `${t.space.lg}`) never animate
    // because the adapter sees a constant sentinel string across
    // renders even when the resolved value differs.
    const resolvedBaseValues =
      compiled.baseValues !== undefined && compiled.resolvers !== undefined
        ? applyResolvers(compiled.baseValues, compiled.resolvers, env)
        : compiled.baseValues;

    if (debugEnabled) {
      dbg(
        'render',
        hasTransition ? `transitions=${compiled.transitions!.length}` : '',
        hasAnimation ? `animations=${compiled.animations!.length}` : '',
        hasStarting ? 'starting' : '',
        `baseKeys=${resolvedBaseValues ? Object.keys(resolvedBaseValues).join(',') : '∅'}`,
        `reduceMotion=${env.media.reduceMotion}`
      );
    }

    const firstMount = !scratch.mounted;
    if (firstMount) scratch.mounted = true;
    let resolvedStartingStyle: Dict<any> | undefined;
    if (firstMount && hasStarting) {
      resolvedStartingStyle = compiled.startingStyleResolvers
        ? applyResolvers(compiled.startingStyle!, compiled.startingStyleResolvers, env)
        : compiled.startingStyle;
    }

    let outStyle = resolved;
    if (hasTransition) {
      outStyle = applyTransitions(
        scratch,
        compiled.transitions!,
        resolved,
        resolvedBaseValues,
        env.media.reduceMotion,
        firstMount,
        resolvedStartingStyle,
        () => requestRerenderRef.current(),
        input.onTransitionEnd
      );
    }

    if (hasAnimation && compiled.animations && compiled.keyframes.length > 0) {
      outStyle = applyAnimations(
        scratch,
        compiled.animations,
        compiled.keyframes,
        outStyle,
        resolvedBaseValues,
        env,
        env.media.reduceMotion,
        input.onAnimationEnd
      );
    }

    const isAnimating = hasTransition || hasAnimation;

    let isolate3d = false;
    if (isAnimating && scratch.anims) {
      for (let i = 0; !isolate3d && i < scratch.anims.length; i++) {
        const kinds = scratch.anims[i].transformKinds;
        if (kinds) {
          for (let k = 0; k < kinds.length; k++) {
            if (kinds[k] === 'rotateX' || kinds[k] === 'rotateY' || kinds[k] === 'rotateZ') {
              isolate3d = true;
              break;
            }
          }
        }
      }
    }
    if (isAnimating && !isolate3d) {
      for (const [, p] of scratch.props) {
        const kinds = p.transformKinds;
        if (kinds) {
          for (let k = 0; k < kinds.length; k++) {
            if (kinds[k] === 'rotateX' || kinds[k] === 'rotateY' || kinds[k] === 'rotateZ') {
              isolate3d = true;
              break;
            }
          }
        }
        if (isolate3d) break;
      }
    }

    let invalidateCache = false;
    if (hasTransition) {
      for (const [, p] of scratch.props) {
        if (p.discrete !== undefined) {
          invalidateCache = true;
          break;
        }
      }
    }

    const out: AnimatedStyleOutput = {
      style: outStyle,
      elementType: isAnimating ? wrapTarget(target) : target,
      isolate3d,
    };
    if (invalidateCache) out.invalidateCache = true;
    return out;
  },
};

setAnimationAdapter(animatedAdapter);

/**
 * Toggle animation adapter debug logging. When on, each render and
 * timing operation logs to the console with a `[sc/anim]` prefix ;
 * grep-friendly in Metro / Hermes inspector.
 *
 * ```ts
 * import { setAnimationDebug } from 'styled-components/native';
 * setAnimationDebug(true);
 * ```
 */
export function setAnimationDebug(on: boolean): void {
  debugEnabled = on;
}

export {
  animatedAdapter,
  // Internal helpers;not part of the public API; consumed by tests
  // via deep imports. Names retain the `__*ForTests` prefix so an
  // accidental top-level re-export doesn't surface them.
  interpolateTransform as __interpolateTransformForTests,
  parseTransformString as __parseTransformStringForTests,
  transformIdentity as __transformIdentityForTests,
  captureCurrentValue as __captureCurrentValueForTests,
  parseAnimColor as __parseAnimColorForTests,
  rgbaToCss as __rgbaToCssForTests,
  buildSegmentedInterpolation as __buildSegmentedInterpolationForTests,
  interpolateColorOklab as __interpolateColorOklabForTests,
  additiveCombine as __additiveCombineForTests,
  additiveCombineTransform as __additiveCombineTransformForTests,
  __resetNormalizeColorCacheForTests,
};
