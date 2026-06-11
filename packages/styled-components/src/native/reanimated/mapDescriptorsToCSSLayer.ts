import type { CompiledKeyframes } from '../../models/compileNative';
import type {
  AnimationDescriptor,
  EasingDescriptor,
  TransitionDescriptor,
} from '../animation/types';
import { warnOnce } from '../transform/dev';
import { applyResolvers, type ResolveEnv } from '../transform/polyfills/resolvers';

/**
 * Subset of the `react-native-reanimated` surface used to build CSS-layer
 * timing values. Kept structural so Jest can inject a virtual mock.
 */
export interface ReanimatedCSSLayerHost {
  cubicBezier?: (x1: number, y1: number, x2: number, y2: number) => unknown;
  steps?: (n: number, jump: string) => unknown;
  linear?: (...args: unknown[]) => unknown;
}

/**
 * Reanimated 4 splits incoming style into CSS animation props, CSS transition
 * props, and everything else (`filterCSSAndStyleProperties` in reanimated's
 * `src/css/utils/props.ts`). Only keys in `ANIMATION_PROPS` / `TRANSITION_PROPS`
 * (`src/css/constants/settings.ts`) participate in the CSS managers.
 *
 * In particular, `animationName` must be a keyframes object or a
 * `CSSKeyframesRule` instance; plain strings never pass the gate, so we build
 * objects from `compiled.keyframes` (same source as the Hermes adapter).
 * `animation-composition` is not in `ANIMATION_PROPS` yet, so we do not emit
 * `animationComposition` on this path (it would leak onto the plain style).
 */
export interface ReanimatedMapContext {
  keyframes?: CompiledKeyframes[];
  env?: ResolveEnv;
  /** When true, zero CSS-layer animation/transition durations and delays (snap). */
  reduceMotion?: boolean;
}

/**
 * Convert an EasingDescriptor into the value reanimated 4's CSS layer
 * accepts for `animationTimingFunction` / `transitionTimingFunction`.
 *
 * Reanimated specially serializes per-keyframe timing functions, so we
 * MUST construct them through reanimated's exports (`cubicBezier`,
 * `steps`, `linear`) rather than emit raw bezier coefficients.
 */
export function toReanimatedTiming(
  host: ReanimatedCSSLayerHost,
  easing: EasingDescriptor
): unknown {
  switch (easing.kind) {
    case 'linear':
      return 'linear';
    case 'cubic-bezier':
      return host.cubicBezier
        ? host.cubicBezier(easing.p[0], easing.p[1], easing.p[2], easing.p[3])
        : {
            type: 'cubic-bezier',
            x1: easing.p[0],
            y1: easing.p[1],
            x2: easing.p[2],
            y2: easing.p[3],
          };
    case 'steps':
      return host.steps ? host.steps(easing.n, easing.jump) : `steps(${easing.n}, ${easing.jump})`;
    case 'linear-stops': {
      const stops = easing.stops.map(([x, y]) => `${y} ${x * 100}%`).join(', ');
      return host.linear
        ? host.linear(...easing.stops.map(([x, y]) => [y, x * 100]))
        : `linear(${stops})`;
    }
  }
}

function parseKeyframeStop(stop: string): number {
  if (stop === 'from') return 0;
  if (stop === 'to') return 1;
  return parseFloat(stop) / 100;
}

function offsetToReanimatedSelector(offset: number): string {
  if (offset <= 0) return 'from';
  if (offset >= 1) return 'to';
  const pct = Math.round(offset * 1e6) / 1e4;
  return pct + '%';
}

/**
 * Build a `CSSAnimationKeyframes`-shaped record for Reanimated's CSS layer from
 * our compile-time keyframes snapshot (mirrors `resolveKeyframes` in the
 * Hermes adapter, but keyed by selector string for Reanimated).
 */
export function compiledKeyframesToReanimatedKeyframes(
  host: ReanimatedCSSLayerHost,
  defs: CompiledKeyframes[],
  name: string,
  env: ResolveEnv
): Record<string, Record<string, unknown>> | null {
  let def: CompiledKeyframes | null = null;
  for (let i = 0; i < defs.length; i++) {
    if (defs[i].name === name) def = defs[i];
  }
  if (!def) return null;

  const merged = new Map<number, { decls: Record<string, unknown>; easing?: EasingDescriptor }>();

  for (let fi = 0; fi < def.frames.length; fi++) {
    const frame = def.frames[fi];
    const decls =
      frame.resolvers !== undefined && frame.resolvers.length > 0
        ? (applyResolvers(frame.decls, frame.resolvers, env) as Record<string, unknown>)
        : ({ ...frame.decls } as Record<string, unknown>);

    for (let si = 0; si < frame.stops.length; si++) {
      const offset = parseKeyframeStop(frame.stops[si]);
      const prev = merged.get(offset);
      const nextDecls = prev ? { ...prev.decls, ...decls } : { ...decls };
      const nextEasing = frame.easing !== undefined ? frame.easing : prev?.easing;
      const entry: { decls: Record<string, unknown>; easing?: EasingDescriptor } = {
        decls: nextDecls,
      };
      if (nextEasing !== undefined) entry.easing = nextEasing;
      merged.set(offset, entry);
    }
  }

  if (merged.size === 0) return null;

  const sorted = [...merged.entries()].sort((a, b) => a[0] - b[0]);
  const out: Record<string, Record<string, unknown>> = {};

  for (let i = 0; i < sorted.length; i++) {
    const [offset, { decls, easing }] = sorted[i];
    const sel = offsetToReanimatedSelector(offset);
    const block: Record<string, unknown> = { ...decls };
    if (easing !== undefined) {
      block.animationTimingFunction = toReanimatedTiming(host, easing);
    }
    const existing = out[sel];
    if (existing) {
      Object.assign(existing, block);
    } else {
      out[sel] = block;
    }
  }

  return out;
}

type ResolvedAnimLayer = {
  desc: AnimationDescriptor;
  keyframes: Record<string, Record<string, unknown>>;
};

function resolveAnimationLayers(
  host: ReanimatedCSSLayerHost,
  animations: AnimationDescriptor[],
  ctx: ReanimatedMapContext | undefined
): ResolvedAnimLayer[] | null {
  if (!ctx?.keyframes || ctx.env === undefined) return null;

  const layers: ResolvedAnimLayer[] = [];
  for (let i = 0; i < animations.length; i++) {
    const desc = animations[i];
    if (desc.name === 'none') continue;

    const keyframes = compiledKeyframesToReanimatedKeyframes(
      host,
      ctx.keyframes,
      desc.name,
      ctx.env
    );
    if (!keyframes || Object.keys(keyframes).length === 0) continue;

    layers.push({ desc, keyframes });
  }

  return layers.length > 0 ? layers : null;
}

function applyReduceMotionToCssLayer(out: Record<string, unknown>, reduceMotion: boolean): void {
  if (!reduceMotion) return;

  const zeroAll = (v: unknown): unknown => {
    if (Array.isArray(v)) {
      return v.map(() => 0);
    }
    return 0;
  };

  if ('animationDuration' in out) out.animationDuration = zeroAll(out.animationDuration);
  if ('animationDelay' in out) out.animationDelay = zeroAll(out.animationDelay);
  if ('transitionDuration' in out) out.transitionDuration = zeroAll(out.transitionDuration);
  if ('transitionDelay' in out) out.transitionDelay = zeroAll(out.transitionDelay);
}

/**
 * Map our descriptors onto reanimated 4's CSS-layer style props.
 * Returns a partial style object the consumer's `Animated.View` reads
 * directly; reanimated handles the actual sequencing on the UI thread.
 */
export function mapDescriptorsToCSSLayer(
  host: ReanimatedCSSLayerHost,
  animations: AnimationDescriptor[] | undefined,
  transitions: TransitionDescriptor[] | undefined,
  ctx?: ReanimatedMapContext
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  // Reanimated 4's CSS layer is time-based only; scroll-driven and
  // timeline-dissociated animations have no representation there and
  // are skipped with a dev warning.
  if (animations !== undefined) {
    let filtered: AnimationDescriptor[] | undefined;
    for (let i = 0; i < animations.length; i++) {
      // Defensive read: descriptors built outside the parser (tests,
      // userland) may predate the timeline field.
      if (animations[i].timeline !== undefined && animations[i].timeline.kind !== 'auto') {
        if (filtered === undefined) filtered = animations.slice(0, i);
        if (__DEV__) {
          warnOnce(
            'native-scroll-timeline-reanimated',
            `The animation "${animations[i].name}" uses \`animation-timeline\`, which the Reanimated adapter cannot drive (Reanimated's CSS layer is time-based). The animation is skipped; the default Animated adapter supports scroll-driven animations.`,
            animations[i].name
          );
        }
      } else if (filtered !== undefined) {
        filtered.push(animations[i]);
      }
    }
    if (filtered !== undefined) animations = filtered;
  }

  if (animations && animations.length > 0) {
    const layers = resolveAnimationLayers(host, animations, ctx);
    if (layers) {
      if (layers.length === 1) {
        const { desc, keyframes } = layers[0];
        out.animationName = keyframes;
        out.animationDuration = desc.durationMs;
        out.animationTimingFunction = toReanimatedTiming(host, desc.timingFunction);
        out.animationDelay = desc.delayMs;
        out.animationIterationCount = desc.iterationCount;
        out.animationDirection = desc.direction;
        out.animationFillMode = desc.fillMode;
        out.animationPlayState = desc.playState;
      } else {
        out.animationName = layers.map(l => l.keyframes);
        out.animationDuration = layers.map(l => l.desc.durationMs);
        out.animationTimingFunction = layers.map(l =>
          toReanimatedTiming(host, l.desc.timingFunction)
        );
        out.animationDelay = layers.map(l => l.desc.delayMs);
        out.animationIterationCount = layers.map(l => l.desc.iterationCount);
        out.animationDirection = layers.map(l => l.desc.direction);
        out.animationFillMode = layers.map(l => l.desc.fillMode);
        out.animationPlayState = layers.map(l => l.desc.playState);
      }
    }
  }

  if (transitions && transitions.length > 0) {
    if (transitions.length === 1) {
      const t = transitions[0];
      out.transitionProperty = t.property;
      out.transitionDuration = t.durationMs;
      out.transitionTimingFunction = toReanimatedTiming(host, t.timingFunction);
      out.transitionDelay = t.delayMs;
      // Match cssAdapter: omit `transition-behavior` unless a layer needs
      // allow-discrete (normal is the initial keyword and clutters the CSS layer).
      if (t.behavior === 'allow-discrete') {
        out.transitionBehavior = t.behavior;
      }
    } else {
      out.transitionProperty = transitions.map(t => t.property);
      out.transitionDuration = transitions.map(t => t.durationMs);
      out.transitionTimingFunction = transitions.map(t =>
        toReanimatedTiming(host, t.timingFunction)
      );
      out.transitionDelay = transitions.map(t => t.delayMs);
      const behs = transitions.map(t => t.behavior);
      if (behs.some(b => b === 'allow-discrete')) {
        out.transitionBehavior = behs;
      }
    }
  }

  if (ctx?.reduceMotion) {
    applyReduceMotionToCssLayer(out, true);
  }

  return out;
}
