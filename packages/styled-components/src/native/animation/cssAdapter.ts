/**
 * react-native-web animation adapter. Emits CSS `transition` /
 * `animation` longhand properties onto the style object and injects
 * `@keyframes` rules into a managed `<style>` tag in `document.head`.
 * The browser then runs the animation on the compositor with the
 * spec-correct semantics our JS `Animated`-bridge adapter approximates
 * (reversing-shortening-factor on interrupted transitions, fill-mode
 * `backwards`/`both` during the delay window, play-state pause/resume
 * retaining remaining duration, true per-keyframe easing for non-
 * numeric values, animationend / transitionend dispatch).
 *
 * Registered when `__NATIVE_WEB__` is true; the default Animated-based
 * adapter (`./index.ts`) registers when it is false. Both files are
 * always imported by the native entry but each gates its own
 * `setAnimationAdapter` call so rollup tree-shakes the inactive
 * adapter's implementation out of the bundle for its respective build.
 */

import type { CompiledKeyframes } from '../../models/compileNative';
import { applyResolvers, type ResolveEnv } from '../transform/polyfills/resolvers';
import hyphenate from '../../utils/hyphenateStyleName';
import type {
  AnimatedStyleInput,
  AnimatedStyleOutput,
  AnimationAdapter,
  EasingDescriptor,
} from './types';
import { passthroughOutput, setAnimationAdapter } from './types';

const STYLE_TAG_ATTR = 'data-sc-anim';
const injectedKeyframes = new Map<string, string>();
let cachedSheet: CSSStyleSheet | null = null;

function getSheet(): CSSStyleSheet | null {
  if (cachedSheet !== null) return cachedSheet;
  if (typeof document === 'undefined') return null;
  let tag = document.head.querySelector<HTMLStyleElement>('style[' + STYLE_TAG_ATTR + ']');
  if (tag === null) {
    tag = document.createElement('style');
    tag.setAttribute(STYLE_TAG_ATTR, '');
    document.head.appendChild(tag);
  }
  cachedSheet = tag.sheet;
  return cachedSheet;
}

/**
 * Cheap deterministic hash of a string (djb2). Used to version
 * sentinel-bearing keyframes so a theme change produces a new
 * `@keyframes` body under a unique name, leaving any earlier
 * still-running animations on the previous body intact.
 */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  // Unsigned 32-bit hex, no leading sign character.
  return (h >>> 0).toString(36);
}

function easingToCss(easing: EasingDescriptor): string {
  switch (easing.kind) {
    case 'linear':
      return 'linear';
    case 'cubic-bezier': {
      const [a, b, c, d] = easing.p;
      return 'cubic-bezier(' + a + ',' + b + ',' + c + ',' + d + ')';
    }
    case 'steps':
      return 'steps(' + easing.n + ',' + easing.jump + ')';
    case 'linear-stops': {
      let out = '';
      for (let i = 0; i < easing.stops.length; i++) {
        if (i > 0) out += ',';
        const [x, y] = easing.stops[i];
        out += y + ' ' + (x * 100).toFixed(2) + '%';
      }
      return 'linear(' + out + ')';
    }
  }
}

function valueToCss(camel: string, val: unknown): string {
  if (typeof val === 'number') {
    // Match `addUnitIfNeeded`'s unitless list inline to avoid pulling
    // the web util into this bundle.
    if (val === 0) return '0';
    return val + 'px';
  }
  return String(val);
}

function declsToCss(decls: Record<string, unknown>): string {
  let out = '';
  for (const k in decls) {
    const v = decls[k];
    if (v === undefined || v === null) continue;
    out += hyphenate(k) + ':' + valueToCss(k, v) + ';';
  }
  return out;
}

function serializeKeyframes(def: CompiledKeyframes, env: ResolveEnv): string {
  let body = '';
  for (const f of def.frames) {
    const declsResolved =
      f.resolvers !== undefined ? applyResolvers(f.decls, f.resolvers, env) : f.decls;
    body += f.stops.join(',') + '{' + declsToCss(declsResolved);
    if (f.easing !== undefined) {
      body += 'animation-timing-function:' + easingToCss(f.easing) + ';';
    }
    body += '}';
  }
  return body;
}

/**
 * Inject a `@keyframes` rule if not already present. Returns the
 * resolved CSS name (may include a hash suffix when keyframes carry
 * resolvers). Idempotent per (name, hash) tuple within the process.
 */
function ensureKeyframes(name: string, keyframes: CompiledKeyframes[], env: ResolveEnv): string {
  const def = keyframes.find(k => k.name === name);
  if (def === undefined) return name;

  const hasResolvers = def.frames.some(f => f.resolvers !== undefined && f.resolvers.length > 0);
  const body = serializeKeyframes(def, env);
  const finalName = hasResolvers ? name + '__' + djb2(body) : name;

  if (injectedKeyframes.has(finalName)) return finalName;
  const sheet = getSheet();
  if (sheet === null) {
    injectedKeyframes.set(finalName, body);
    return finalName;
  }
  try {
    sheet.insertRule('@keyframes ' + finalName + '{' + body + '}', sheet.cssRules.length);
  } catch {
    // Browser rejected the rule (malformed body, sheet locked, etc.).
    // Mark injected anyway so we don't retry every render.
  }
  injectedKeyframes.set(finalName, body);
  return finalName;
}

const cssAdapter: AnimationAdapter = {
  id: 'css',
  useAnimatedStyle(input: AnimatedStyleInput): AnimatedStyleOutput {
    const { compiled, resolved, target, env } = input;

    const transitions = compiled.transitions;
    const animations = compiled.animations;
    const hasTransition = transitions !== undefined && transitions.length > 0;
    const hasAnimation = animations !== undefined && animations.length > 0;

    if (!hasTransition && !hasAnimation) {
      return passthroughOutput(input);
    }

    // `resolved` may be a plain object (the canonical compiled base) or an
    // array of style layers when `assembleFinalStyle` produced one — the
    // array form appears as soon as a conditional bucket (attr selector,
    // @media, @container, etc.) matches. Object-spreading an array yields
    // numeric keys (`{0: ..., 1: ...}`), and React DOM later assigns each
    // key into CSSStyleDeclaration, whose indexed accessor is read-only;
    // WebKit aborts the render with "Attempted to assign to readonly
    // property." Walk the array (or the single object) and merge into a
    // fresh result so the output is always a plain object.
    const style: Record<string, unknown> = {};
    if (Array.isArray(resolved)) {
      for (let i = 0; i < resolved.length; i++) {
        const entry = resolved[i];
        if (entry != null && typeof entry === 'object') Object.assign(style, entry);
      }
    } else if (resolved != null && typeof resolved === 'object') {
      Object.assign(style, resolved);
    }

    if (hasTransition) {
      const props: string[] = [];
      const durs: string[] = [];
      const dels: string[] = [];
      const tims: string[] = [];
      const behs: string[] = [];
      let anyBehaviorAllowDiscrete = false;
      for (const t of transitions!) {
        props.push(t.property === 'all' ? 'all' : hyphenate(t.property));
        durs.push(t.durationMs + 'ms');
        dels.push(t.delayMs + 'ms');
        tims.push(easingToCss(t.timingFunction));
        behs.push(t.behavior);
        if (t.behavior === 'allow-discrete') anyBehaviorAllowDiscrete = true;
      }
      style.transitionProperty = props.join(', ');
      style.transitionDuration = durs.join(', ');
      style.transitionDelay = dels.join(', ');
      style.transitionTimingFunction = tims.join(', ');
      if (anyBehaviorAllowDiscrete) {
        style.transitionBehavior = behs.join(', ');
      }
    }

    if (hasAnimation) {
      const names: string[] = [];
      const durs: string[] = [];
      const dels: string[] = [];
      const iters: string[] = [];
      const dirs: string[] = [];
      const fills: string[] = [];
      const states: string[] = [];
      const tims: string[] = [];
      for (const a of animations!) {
        names.push(ensureKeyframes(a.name, compiled.keyframes, env));
        durs.push(a.durationMs + 'ms');
        dels.push(a.delayMs + 'ms');
        iters.push(a.iterationCount === Infinity ? 'infinite' : String(a.iterationCount));
        dirs.push(a.direction);
        fills.push(a.fillMode);
        states.push(a.playState);
        tims.push(easingToCss(a.timingFunction));
      }
      style.animationName = names.join(', ');
      style.animationDuration = durs.join(', ');
      style.animationDelay = dels.join(', ');
      style.animationIterationCount = iters.join(', ');
      style.animationDirection = dirs.join(', ');
      style.animationFillMode = fills.join(', ');
      style.animationPlayState = states.join(', ');
      style.animationTimingFunction = tims.join(', ');
    }

    return { style, elementType: target };
  },
};

if (__NATIVE_WEB__) {
  setAnimationAdapter(cssAdapter);
}

export { cssAdapter };
/** Test-only: clear the injected-keyframes cache and managed sheet ref. */
export function __resetCssAdapterForTesting(): void {
  injectedKeyframes.clear();
  cachedSheet = null;
}
