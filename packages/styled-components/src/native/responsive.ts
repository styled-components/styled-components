import React, { createContext, useContext, useMemo } from 'react';

// Pull RN APIs eagerly at module load so the `useEffect` closures don't chase
// lazy module getters after Jest's environment teardown. The references are
// captured once and reused across all subscriptions.
type RNApis = {
  Dimensions: any;
  Appearance: any;
  AccessibilityInfo: any;
  PixelRatio: any;
};

let rnApis: RNApis | null = null;
function getRN(): RNApis {
  if (!rnApis) {
    const rn: any = require('react-native');
    try {
      rnApis = {
        Dimensions: rn.Dimensions,
        Appearance: rn.Appearance,
        AccessibilityInfo: rn.AccessibilityInfo,
        PixelRatio: rn.PixelRatio,
      };
    } catch {
      rnApis = {
        Dimensions: undefined,
        Appearance: undefined,
        AccessibilityInfo: undefined,
        PixelRatio: undefined,
      };
    }
  }
  return rnApis;
}

// ---------- media query parsing + evaluation ----------

export interface MediaQueryEnv {
  width: number;
  height: number;
  colorScheme: 'light' | 'dark' | null | undefined;
  reduceMotion: boolean;
  fontScale: number;
  pixelRatio: number;
}

type Dimension = 'width' | 'height';

/** Inclusive when `inclusive` is true; matches `<=` vs `<` (and `>=` vs `>`). */
type RangeBound = { value: number; inclusive: boolean } | null;

type Feature =
  | { kind: 'minWidth'; value: number }
  | { kind: 'maxWidth'; value: number }
  | { kind: 'minHeight'; value: number }
  | { kind: 'maxHeight'; value: number }
  /** Media Queries Level 4 range: `(400px <= width <= 800px)`, `(width > 400px)`, etc. */
  | { kind: 'range'; dim: Dimension; lower: RangeBound; upper: RangeBound }
  | { kind: 'orientation'; value: 'portrait' | 'landscape' }
  | { kind: 'colorScheme'; value: 'light' | 'dark' }
  | { kind: 'reduceMotion'; value: 'reduce' | 'no-preference' }
  | { kind: 'any' };

type Clause = Feature[];
type Query = Clause[]; // comma-separated clauses (OR)

const queryCache = new Map<string, Query>();

export function parseMediaQuery(raw: string): Query {
  const cached = queryCache.get(raw);
  if (cached) return cached;
  const parsed = compileQuery(raw);
  queryCache.set(raw, parsed);
  return parsed;
}

function compileQuery(raw: string): Query {
  const clauses = splitTopLevel(raw, ',');
  const out: Query = [];
  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const features = parseClause(clause);
    if (features.length > 0) out.push(features);
  }
  return out;
}

function parseClause(clause: string): Feature[] {
  // `(min-width: 400px) and (orientation: portrait)` style.
  const parts = splitTopLevel(clause, 'and');
  const out: Feature[] = [];
  for (let i = 0; i < parts.length; i++) {
    const feat = parseFeature(parts[i].trim());
    if (feat) out.push(feat);
  }
  return out;
}

function parseFeature(raw: string): Feature | null {
  // Strip surrounding parens
  let s = raw.trim();
  if (s.charCodeAt(0) === 0x28 /* ( */ && s.charCodeAt(s.length - 1) === 0x29 /* ) */) {
    s = s.substring(1, s.length - 1).trim();
  }
  if (!s) return null;

  // Media Queries Level 4 range syntax; `(width >= 400px)`, `(400px < width < 800px)`.
  // If the expression contains an operator but doesn't parse as a valid range,
  // it's malformed; return null outright instead of falling through to the
  // colon branch (which would treat it as the always-true `any` feature).
  if (s.indexOf('<') !== -1 || s.indexOf('>') !== -1) {
    return parseRange(s);
  }

  // Boolean features without value, e.g. `all`; treat as always-true.
  const colon = s.indexOf(':');
  if (colon === -1) return { kind: 'any' };

  const name = s.substring(0, colon).trim().toLowerCase();
  const value = s.substring(colon + 1).trim();

  switch (name) {
    case 'min-width':
      return { kind: 'minWidth', value: parseLength(value) };
    case 'max-width':
      return { kind: 'maxWidth', value: parseLength(value) };
    case 'min-height':
      return { kind: 'minHeight', value: parseLength(value) };
    case 'max-height':
      return { kind: 'maxHeight', value: parseLength(value) };
    case 'orientation':
      return value === 'portrait' || value === 'landscape' ? { kind: 'orientation', value } : null;
    case 'prefers-color-scheme':
      return value === 'light' || value === 'dark' ? { kind: 'colorScheme', value } : null;
    case 'prefers-reduced-motion':
      return value === 'reduce' || value === 'no-preference'
        ? { kind: 'reduceMotion', value }
        : null;
    default:
      return null;
  }
}

const RANGE_TOKEN_RE = /<=|>=|<|>/g;

/**
 * Parse CSS Media Queries Level 4 range syntax. Handles:
 *   (width > 400px)          →  lower: {400, false}, upper: null
 *   (width >= 400px)         →  lower: {400, true},  upper: null
 *   (width < 800px)          →  upper: {800, false}
 *   (width <= 800px)         →  upper: {800, true}
 *   (400px < width)          →  lower: {400, false}
 *   (400px <= width <= 800px) → sandwich form
 *
 * Returns null for malformed input (silently ignored, consistent with the
 * unknown-feature handling elsewhere in matchMedia).
 */
function parseRange(s: string): Feature | null {
  const tokens: string[] = [];
  const operators: string[] = [];
  let last = 0;
  RANGE_TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = RANGE_TOKEN_RE.exec(s)) !== null) {
    tokens.push(s.substring(last, match.index).trim());
    operators.push(match[0]);
    last = match.index + match[0].length;
  }
  tokens.push(s.substring(last).trim());

  if (operators.length === 0) return null;
  if (operators.length > 2) return null;

  const dim = findDimension(tokens);
  if (!dim) return null;

  let lower: RangeBound = null;
  let upper: RangeBound = null;

  if (operators.length === 1) {
    // Two tokens, one operator. e.g. `width >= 400px` or `400px < width`.
    const [a, b] = tokens;
    const op = operators[0];
    if (a.toLowerCase() === dim) {
      const v = parseLength(b);
      if (!Number.isFinite(v)) return null;
      if (op === '>' || op === '>=') lower = { value: v, inclusive: op === '>=' };
      else upper = { value: v, inclusive: op === '<=' };
    } else if (b.toLowerCase() === dim) {
      const v = parseLength(a);
      if (!Number.isFinite(v)) return null;
      if (op === '<' || op === '<=') lower = { value: v, inclusive: op === '<=' };
      else upper = { value: v, inclusive: op === '>=' };
    } else {
      return null;
    }
  } else {
    // Three tokens, two operators: sandwich form `lower OP width OP upper`.
    const [a, mid, c] = tokens;
    if (mid.toLowerCase() !== dim) return null;
    const lo = parseLength(a);
    const hi = parseLength(c);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    const [op1, op2] = operators;
    if ((op1 === '<' || op1 === '<=') && (op2 === '<' || op2 === '<=')) {
      lower = { value: lo, inclusive: op1 === '<=' };
      upper = { value: hi, inclusive: op2 === '<=' };
    } else if ((op1 === '>' || op1 === '>=') && (op2 === '>' || op2 === '>=')) {
      lower = { value: hi, inclusive: op2 === '>=' };
      upper = { value: lo, inclusive: op1 === '>=' };
    } else {
      return null; // mixed directions are invalid
    }
  }

  return { kind: 'range', dim: dim as Dimension, lower, upper };
}

function findDimension(tokens: string[]): Dimension | null {
  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (lower === 'width' || lower === 'height') return lower;
  }
  return null;
}

function parseLength(v: string): number {
  // Accepts `400px`, `400`, `25em` (1em assumed 16px). Unknown units return NaN
  // which will evaluate to false in comparisons; a safe silent fallback.
  const num = parseFloat(v);
  if (v.endsWith('em') || v.endsWith('rem')) return num * 16;
  return num;
}

function splitTopLevel(s: string, sep: string): string[] {
  // Split on `,` or the literal word `and` at paren depth 0. The `and` path
  // matches the whole-word token between parens, not letters inside identifiers.
  const out: string[] = [];
  const len = s.length;
  let depth = 0;
  let start = 0;
  if (sep === ',') {
    for (let i = 0; i < len; i++) {
      const c = s.charCodeAt(i);
      if (c === 0x28) depth++;
      else if (c === 0x29) depth > 0 && depth--;
      else if (depth === 0 && c === 0x2c) {
        out.push(s.substring(start, i).trim());
        start = i + 1;
      }
    }
    out.push(s.substring(start).trim());
    return out;
  }
  // `and` word-boundary split
  const lower = s.toLowerCase();
  for (let i = 0; i <= len - 3; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x28) depth++;
    else if (c === 0x29) depth > 0 && depth--;
    else if (
      depth === 0 &&
      lower.charCodeAt(i) === 0x61 /* a */ &&
      lower.charCodeAt(i + 1) === 0x6e /* n */ &&
      lower.charCodeAt(i + 2) === 0x64 /* d */ &&
      (i === 0 || isSpace(s.charCodeAt(i - 1))) &&
      (i + 3 === len || isSpace(s.charCodeAt(i + 3)))
    ) {
      out.push(s.substring(start, i).trim());
      start = i + 3;
      i += 2;
    }
  }
  out.push(s.substring(start).trim());
  return out;
}

function isSpace(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}

export function matchMedia(query: string, env: MediaQueryEnv): boolean {
  const q = parseMediaQuery(query);
  if (q.length === 0) return false;
  for (let i = 0; i < q.length; i++) {
    if (matchClause(q[i], env)) return true;
  }
  return false;
}

function matchClause(clause: Clause, env: MediaQueryEnv): boolean {
  for (let i = 0; i < clause.length; i++) {
    if (!matchFeature(clause[i], env)) return false;
  }
  return true;
}

function matchFeature(f: Feature, env: MediaQueryEnv): boolean {
  switch (f.kind) {
    case 'minWidth':
      return env.width >= f.value;
    case 'maxWidth':
      return env.width <= f.value;
    case 'minHeight':
      return env.height >= f.value;
    case 'maxHeight':
      return env.height <= f.value;
    case 'range': {
      const current = f.dim === 'width' ? env.width : env.height;
      if (f.lower) {
        if (f.lower.inclusive ? current < f.lower.value : current <= f.lower.value) return false;
      }
      if (f.upper) {
        if (f.upper.inclusive ? current > f.upper.value : current >= f.upper.value) return false;
      }
      return true;
    }
    case 'orientation':
      return (env.height >= env.width ? 'portrait' : 'landscape') === f.value;
    case 'colorScheme':
      return env.colorScheme === f.value;
    case 'reduceMotion':
      return f.value === 'reduce' ? env.reduceMotion : !env.reduceMotion;
    case 'any':
      return true;
  }
}

// ---------- reactive hooks ----------

function safeReadDimensions(RN: any): { width: number; height: number; fontScale: number } {
  try {
    const win = RN.Dimensions?.get?.('window');
    if (win && typeof win.width === 'number') {
      return {
        width: win.width,
        height: win.height,
        fontScale: win.fontScale ?? 1,
      };
    }
  } catch {}
  return { width: 0, height: 0, fontScale: 1 };
}

function safeReadColorScheme(RN: any): 'light' | 'dark' | null | undefined {
  try {
    return RN.Appearance?.getColorScheme?.() ?? null;
  } catch {
    return null;
  }
}

// Module-level media-env store. A single subscription to Dimensions /
// Appearance / AccessibilityInfo is shared across every styled component
// in the tree, instead of each component owning its own useState +
// useEffect chain. This eliminates the post-mount setState fan-out that
// used to fire on first render (AccessibilityInfo's async
// isReduceMotionEnabled().then(setReduceMotion) running once per mounted
// component) and reduces per-component render work to a single
// useSyncExternalStore call.
let mediaSnapshot: MediaQueryEnv | null = null;
const mediaListeners = new Set<() => void>();
let mediaInitialized = false;
let dimsSub: any = null;
let appearanceSub: any = null;
let reduceSub: any = null;

function readSnapshot(
  prev: MediaQueryEnv | null,
  override?: Partial<MediaQueryEnv>
): MediaQueryEnv {
  const RN = getRN();
  let width: number;
  let height: number;
  let fontScale: number;
  if (override && 'width' in override && 'height' in override) {
    width = override.width!;
    height = override.height!;
    fontScale = override.fontScale ?? prev?.fontScale ?? 1;
  } else {
    const dims = safeReadDimensions(RN);
    width = dims.width;
    height = dims.height;
    fontScale = dims.fontScale;
  }
  const colorScheme =
    override && 'colorScheme' in override
      ? override.colorScheme
      : prev !== null
        ? prev.colorScheme
        : safeReadColorScheme(RN);
  const reduceMotion =
    override && 'reduceMotion' in override
      ? override.reduceMotion!
      : prev !== null
        ? prev.reduceMotion
        : false;
  const pixelRatio = RN.PixelRatio?.get?.() ?? 1;
  return Object.freeze({ width, height, colorScheme, reduceMotion, fontScale, pixelRatio });
}

function snapshotsEqual(a: MediaQueryEnv, b: MediaQueryEnv): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.colorScheme === b.colorScheme &&
    a.reduceMotion === b.reduceMotion &&
    a.fontScale === b.fontScale &&
    a.pixelRatio === b.pixelRatio
  );
}

function updateMediaSnapshot(override?: Partial<MediaQueryEnv>): void {
  const next = readSnapshot(mediaSnapshot, override);
  if (mediaSnapshot !== null && snapshotsEqual(mediaSnapshot, next)) return;
  mediaSnapshot = next;
  for (const l of mediaListeners) l();
}

function ensureMediaSubscriptions(): void {
  if (mediaInitialized) return;
  mediaInitialized = true;
  if (mediaSnapshot === null) mediaSnapshot = readSnapshot(null);
  const RN = getRN();
  try {
    dimsSub = RN.Dimensions?.addEventListener?.('change', (change: any) => {
      if (change?.window) {
        updateMediaSnapshot({
          width: change.window.width,
          height: change.window.height,
          fontScale: change.window.fontScale ?? 1,
        });
      }
    });
  } catch {}
  try {
    appearanceSub = RN.Appearance?.addChangeListener?.((prefs: any) => {
      updateMediaSnapshot({ colorScheme: prefs?.colorScheme ?? null });
    });
  } catch {}
  try {
    RN.AccessibilityInfo?.isReduceMotionEnabled?.()?.then?.((v: boolean) => {
      updateMediaSnapshot({ reduceMotion: v });
    });
    reduceSub = RN.AccessibilityInfo?.addEventListener?.('reduceMotionChanged', (v: boolean) =>
      updateMediaSnapshot({ reduceMotion: v })
    );
  } catch {}
}

function subscribeMedia(listener: () => void): () => void {
  ensureMediaSubscriptions();
  mediaListeners.add(listener);
  return () => {
    mediaListeners.delete(listener);
  };
}

function getMediaSnapshot(): MediaQueryEnv {
  if (mediaSnapshot === null) mediaSnapshot = readSnapshot(null);
  return mediaSnapshot;
}

/**
 * React hook; returns the current `MediaQueryEnv`. Single shared
 * subscription across all consumers; the hook itself reduces to one
 * `useSyncExternalStore` call. Re-renders fire only when one of the
 * snapshot fields actually changed.
 */
export function useMediaEnv(): MediaQueryEnv {
  return React.useSyncExternalStore(subscribeMedia, getMediaSnapshot, getMediaSnapshot);
}

/**
 * Evaluate a single `@media`-style query against the live RN environment.
 * Re-renders on Dimensions / Appearance / reduce-motion changes.
 */
export function useMediaQuery(query: string): boolean {
  const env = useMediaEnv();
  return matchMedia(query, env);
}

/**
 * Return the active breakpoint key from `theme.breakpoints`. Given
 * `{ sm: 480, md: 768, lg: 1024 }`, returns the largest key whose value
 * is ≤ the current width. Returns `undefined` if no breakpoints or none match.
 */
export function useBreakpoint<T extends Record<string, number>>(
  breakpoints: T
): keyof T | undefined {
  const env = useMediaEnv();
  const entries = useMemo(() => {
    const keys = Object.keys(breakpoints) as Array<keyof T>;
    keys.sort((a, b) => breakpoints[a] - breakpoints[b]);
    return keys;
  }, [breakpoints]);

  let active: keyof T | undefined;
  for (let i = 0; i < entries.length; i++) {
    const key = entries[i];
    if (env.width >= breakpoints[key]) active = key;
  }
  return active;
}

// ---------- container queries ----------

export interface ContainerEntry {
  name?: string | undefined;
  width: number;
  height: number;
}

export interface ContainerContextValue {
  /** nearest ancestor container (unnamed) */
  nearest: ContainerEntry | null;
  /** map of named containers up the tree */
  named: Readonly<Record<string, ContainerEntry>>;
}

const EMPTY_NAMED: Readonly<Record<string, ContainerEntry>> = Object.freeze({});

export const ContainerContext = createContext<ContainerContextValue>({
  nearest: null,
  named: EMPTY_NAMED,
});

export function useContainerContext(): ContainerContextValue {
  return useContext(ContainerContext);
}

/**
 * Look up a container by optional name. Falls back to nearest unnamed
 * container when name is absent.
 */
export function useContainer(name?: string): ContainerEntry | null {
  const ctx = useContext(ContainerContext);
  if (name) return ctx.named[name] ?? null;
  return ctx.nearest;
}

/**
 * Evaluate a container query against an ancestor container. Returns false
 * when no matching container is registered (silently; matches CSS behavior
 * of zero-match when no container exists).
 */
export function useContainerQuery(query: string, name?: string): boolean {
  const container = useContainer(name);
  if (!container) return false;
  const env: MediaQueryEnv = {
    width: container.width,
    height: container.height,
    colorScheme: undefined,
    reduceMotion: false,
    fontScale: 1,
    pixelRatio: 1,
  };
  return matchMedia(query, env);
}

/**
 * Exported for tests; resets the parsed-query cache and the media-env
 * store so cross-test contamination cannot occur. Detaches the global
 * Dimensions / Appearance / AccessibilityInfo listeners so the next
 * subscriber re-registers them and any test-installed spy can capture
 * the call.
 */
export function resetResponsiveCache(): void {
  queryCache.clear();
  mediaListeners.clear();
  if (mediaInitialized) {
    dimsSub?.remove?.();
    appearanceSub?.remove?.();
    reduceSub?.remove?.();
    dimsSub = appearanceSub = reduceSub = null;
    mediaInitialized = false;
  }
  mediaSnapshot = null;
}
