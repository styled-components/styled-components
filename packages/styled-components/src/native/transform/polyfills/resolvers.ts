import { MediaQueryEnv } from '../../responsive';
import * as $ from '../../../utils/charCodes';
import { isSafeThemePath } from '../sanitize';

/**
 * Environment passed to each {@link Resolver} at render time. Composes
 * everything needed to finish any deferred CSS evaluation.
 */
export interface ResolveEnv {
  media: MediaQueryEnv;
  /** Nearest named / unnamed container dimensions. */
  container: { width: number; height: number } | null;
  /** Current theme object (deep-merged from ThemeProvider stack on native). */
  theme: Record<string, any>;
  /** Safe-area insets from SafeAreaView / safe-area-context. */
  insets: { top: number; right: number; bottom: number; left: number };
  /** Root font-size for `rem` resolution (defaults to 16). Reserved for v7.1. */
  rootFontSize: number;
}

/**
 * A function that resolves a single style-prop value at render time
 * against the current {@link ResolveEnv}. Returns the resolved value
 * to write into the merged style object; number, string, or null
 * (drop the key).
 */
export type Resolver = (env: ResolveEnv) => number | string | null;

// Number form `-?(?:\d+(?:\.\d+)?|\.\d+)` matches `123`, `123.45`, `.45`,
// and the negatives. Unambiguous (no overlap between branches) so the
// engine can't backtrack on long digit runs — closes CodeQL polynomial
// redos finding from PR #5735.
const VP_UNIT_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(vw|vh|vmin|vmax|dvh|svh|lvh|dvw|svw|lvw)$/i;
const CQ_UNIT_RE = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(cqw|cqh|cqmin|cqmax|cqi|cqb)$/i;

/**
 * Inspect a style-object value. If it references a pattern that must be
 * resolved at render time, return a {@link Resolver}. Otherwise `null`.
 *
 * `compileNative.extractResolvers` calls this for each base-style
 * value at compile time and stores the returned Resolvers on the
 * compiled bucket; the StyledNativeComponent render path then runs
 * them against the current env via {@link applyResolvers}.
 */
export function buildResolver(value: unknown): Resolver | null {
  if (typeof value !== 'string') return null;
  if (value.length === 0) return null;

  const c0 = value.charCodeAt(0);

  // createTheme sentinel; `\0<prefix>:<path>:<fallback>`
  if (c0 === 0) return themeResolver(value);

  // Viewport / container units start with a digit, `-`, `+`, or `.`. Skip
  // both regex tests for everything else (colors, idents, percent strings),
  // which dominate real-world base-dict contents.
  if ((c0 >= $.DIGIT_0 && c0 <= $.DIGIT_9) || c0 === $.HYPHEN || c0 === $.DOT || c0 === $.PLUS) {
    const vp = VP_UNIT_RE.exec(value);
    if (vp !== null) return viewportResolver(parseFloat(vp[1]), vp[2].toLowerCase());
    const cq = CQ_UNIT_RE.exec(value);
    if (cq !== null) return containerResolver(parseFloat(cq[1]), cq[2].toLowerCase());
    return null;
  }

  // Non-numeric prefix; only `light-dark(` and `env(` remain as candidates.
  if (c0 === 0x6c /* l */ && value.startsWith('light-dark(')) return lightDarkResolver(value);
  if (c0 === 0x65 /* e */ && value.startsWith('env(')) return envResolver(value);

  return null;
}

function viewportResolver(n: number, unit: string): Resolver {
  return env => {
    const { width: w, height: h } = env.media;
    switch (unit) {
      case 'vw':
      case 'dvw':
      case 'svw':
      case 'lvw':
        return (n * w) / 100;
      case 'vh':
      case 'dvh':
      case 'svh':
      case 'lvh':
        return (n * h) / 100;
      case 'vmin':
        return (n * Math.min(w, h)) / 100;
      case 'vmax':
        return (n * Math.max(w, h)) / 100;
      default:
        return n;
    }
  };
}

function containerResolver(n: number, unit: string): Resolver {
  return env => {
    const c = env.container;
    if (c === null) return n; // no ancestor container; fall back to raw number
    const w = c.width;
    const h = c.height;
    switch (unit) {
      case 'cqw':
      case 'cqi': // inline-size: LTR → width
        return (n * w) / 100;
      case 'cqh':
      case 'cqb': // block-size: LTR → height
        return (n * h) / 100;
      case 'cqmin':
        return (n * Math.min(w, h)) / 100;
      case 'cqmax':
        return (n * Math.max(w, h)) / 100;
      default:
        return n;
    }
  };
}

function lightDarkResolver(value: string): Resolver | null {
  // `light-dark(<light>, <dark>)`; split on the top-level comma.
  const inner = value.slice('light-dark('.length, -1).trim();
  const commaIdx = topLevelCommaIdx(inner);
  if (commaIdx === -1) return null;
  const light = inner.slice(0, commaIdx).trim();
  const dark = inner.slice(commaIdx + 1).trim();
  return env => (env.media.colorScheme === 'dark' ? dark : light);
}

/**
 * `env(<name>[, <fallback>])`. Currently recognises the safe-area-inset
 * family. Falls back to the literal fallback (if provided) or null for
 * everything else, which the caller interprets as "drop".
 */
function envResolver(value: string): Resolver | null {
  const inner = value.slice('env('.length, -1).trim();
  const commaIdx = topLevelCommaIdx(inner);
  const name = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
  const fallback = commaIdx === -1 ? null : inner.slice(commaIdx + 1).trim();

  const fallbackValue: number | string | null =
    fallback === null ? null : parseLengthLiteral(fallback);

  switch (name) {
    case 'safe-area-inset-top':
      return env => env.insets.top;
    case 'safe-area-inset-right':
      return env => env.insets.right;
    case 'safe-area-inset-bottom':
      return env => env.insets.bottom;
    case 'safe-area-inset-left':
      return env => env.insets.left;
    default:
      return () => fallbackValue;
  }
}

function themeResolver(value: string): Resolver | null {
  const firstColon = value.indexOf(':', 1);
  if (firstColon === -1) return null;
  const secondColon = value.indexOf(':', firstColon + 1);
  const path =
    secondColon === -1 ? value.slice(firstColon + 1) : value.slice(firstColon + 1, secondColon);
  const fallback = secondColon === -1 ? '' : value.slice(secondColon + 1);
  if (!isSafeThemePath(path)) return null;
  const segments = path.split('.');

  return env => {
    let v: any = env.theme;
    for (let i = 0; i < segments.length; i++) {
      if (
        v == null ||
        typeof v !== 'object' ||
        !Object.prototype.hasOwnProperty.call(v, segments[i])
      ) {
        v = undefined;
        break;
      }
      v = v[segments[i]];
    }
    if (v === undefined || v === null) return fallback;
    return v;
  };
}

function topLevelCommaIdx(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === $.OPEN_PAREN) depth++;
    else if (c === $.CLOSE_PAREN) depth--;
    else if (c === $.COMMA && depth === 0) return i;
  }
  return -1;
}

function parseLengthLiteral(s: string): number | string | null {
  const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(px)?$/.exec(s.trim());
  if (m !== null) return parseFloat(m[1]);
  return s; // percent / auto / whatever; caller will pass through
}

/**
 * Apply resolvers onto a style object in-place at render time. Returns
 * a NEW object (preserves the cached `base` object's identity).
 */
export function applyResolvers(
  base: Record<string, any>,
  resolvers: Array<[string, Resolver]>,
  env: ResolveEnv
): Record<string, any> {
  if (resolvers.length === 0) return base;
  const out = { ...base };
  for (let i = 0; i < resolvers.length; i++) {
    const pair = resolvers[i];
    const key = pair[0];
    const v = pair[1](env);
    if (v === null) delete out[key];
    else out[key] = v;
  }
  return out;
}
