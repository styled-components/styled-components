import type { EasingDescriptor } from './types';

/**
 * Canonical CSS Easing L1 keyword → cubic-bezier mapping.
 *
 * RN core's `Easing.ease` and reanimated 4's `Easing.ease` both ship
 * `bezier(0.42, 0, 1, 1)`, which is the CSS `ease-in` curve. Adapters
 * MUST go through this table when translating CSS keywords; passing the
 * raw `'ease'` keyword to either engine produces the wrong curve.
 *
 * Source: https://www.w3.org/TR/css-easing-1/#valdef-easing-function-ease
 */
export const CSS_EASING_KEYWORDS: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/**
 * Build an EasingDescriptor from a raw CSS easing string. Returns a
 * `linear` descriptor for the literal `linear` keyword (no work to do).
 *
 * Recognises:
 * - The four spec keywords (`ease`, `ease-in`, `ease-out`, `ease-in-out`)
 * - `linear`
 * - `step-start` (≡ `steps(1, jump-start)`)
 * - `step-end`   (≡ `steps(1, jump-end)`)
 * - `cubic-bezier(x1, y1, x2, y2)`
 * - `steps(N, <jump-term>)`
 * - `linear(<linear-stop-list>)`
 *
 * Returns `null` on unparseable input (caller falls back to default `ease`).
 */
export function parseEasing(raw: string): EasingDescriptor | null {
  const s = raw.trim();
  if (s.length === 0) return null;

  if (s === 'linear') return { kind: 'linear' };
  if (s === 'step-start') return { kind: 'steps', n: 1, jump: 'jump-start' };
  if (s === 'step-end') return { kind: 'steps', n: 1, jump: 'jump-end' };

  const kw = CSS_EASING_KEYWORDS[s];
  if (kw !== undefined) return { kind: 'cubic-bezier', p: [kw[0], kw[1], kw[2], kw[3]] };

  if (s.startsWith('cubic-bezier(') && s.endsWith(')')) {
    return parseCubicBezier(s.slice('cubic-bezier('.length, -1));
  }
  if (s.startsWith('steps(') && s.endsWith(')')) {
    return parseSteps(s.slice('steps('.length, -1));
  }
  if (s.startsWith('linear(') && s.endsWith(')')) {
    return parseLinearStops(s.slice('linear('.length, -1));
  }
  return null;
}

function parseCubicBezier(args: string): EasingDescriptor | null {
  const parts = args.split(',');
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (let i = 0; i < 4; i++) {
    const n = parseFloat(parts[i].trim());
    if (!Number.isFinite(n)) return null;
    nums.push(n);
  }
  // Spec: x1 and x2 must be in [0, 1]; y values are unbounded.
  if (nums[0] < 0 || nums[0] > 1 || nums[2] < 0 || nums[2] > 1) return null;
  return { kind: 'cubic-bezier', p: [nums[0], nums[1], nums[2], nums[3]] };
}

function parseSteps(args: string): EasingDescriptor | null {
  const parts = args.split(',');
  if (parts.length < 1 || parts.length > 2) return null;
  const n = parseInt(parts[0].trim(), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  let jump: 'jump-start' | 'jump-end' | 'jump-none' | 'jump-both' = 'jump-end';
  if (parts.length === 2) {
    const term = parts[1].trim();
    if (term === 'jump-start' || term === 'start') jump = 'jump-start';
    else if (term === 'jump-end' || term === 'end') jump = 'jump-end';
    else if (term === 'jump-none') jump = 'jump-none';
    else if (term === 'jump-both') jump = 'jump-both';
    else return null;
  }
  // Spec: `n=1, jump-none` is invalid.
  if (n === 1 && jump === 'jump-none') return null;
  return { kind: 'steps', n, jump };
}

function parseLinearStops(args: string): EasingDescriptor | null {
  // Grammar (CSS Easing L2):
  //   <linear-stop-list> = <linear-stop>#
  //   <linear-stop>      = <number> [<percentage>{1,2}]?
  // Multi-position stops (`0.5 25% 75%`) expand to two entries.
  const segments = args.split(',');
  type RawStop = { y: number; xs: number[] };
  const raw: RawStop[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i].trim();
    if (seg.length === 0) return null;
    const parts = seg.split(/\s+/);
    const y = parseFloat(parts[0]);
    if (!Number.isFinite(y)) return null;
    const xs: number[] = [];
    for (let j = 1; j < parts.length; j++) {
      const p = parts[j];
      if (!p.endsWith('%')) return null;
      const n = parseFloat(p.slice(0, -1));
      if (!Number.isFinite(n)) return null;
      xs.push(n / 100);
    }
    raw.push({ y, xs });
  }
  if (raw.length < 2) return null;

  // Resample: each stop without an explicit X gets one inferred. Implicit
  // anchors are the first and last stops (assume X=0 and X=1 if missing
  // there). Inner stops with no X get linearly distributed between the
  // surrounding anchors.
  const xs: number[] = new Array(raw.length);
  if (raw[0].xs.length === 0) xs[0] = 0;
  else xs[0] = raw[0].xs[0];
  const lastIdx = raw.length - 1;
  const last = raw[lastIdx];
  if (last.xs.length === 0) xs[lastIdx] = 1;
  else xs[lastIdx] = last.xs[last.xs.length - 1];

  let lastAnchor = 0;
  for (let i = 1; i < lastIdx; i++) {
    if (raw[i].xs.length > 0) {
      xs[i] = raw[i].xs[0];
      lastAnchor = i;
    } else {
      let nextAnchor = lastIdx;
      for (let k = i + 1; k < lastIdx; k++) {
        if (raw[k].xs.length > 0) {
          nextAnchor = k;
          break;
        }
      }
      const span = nextAnchor - lastAnchor;
      xs[i] = xs[lastAnchor] + ((xs[nextAnchor] - xs[lastAnchor]) * (i - lastAnchor)) / span;
    }
  }

  // Silently raise X to the previous max (spec: monotonic non-decreasing).
  let prevMax = xs[0];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] < prevMax) xs[i] = prevMax;
    else prevMax = xs[i];
  }

  const stops: Array<[number, number]> = [];
  // Multi-position stops (e.g., `0.5 25% 75%`) emit one stop per X.
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (r.xs.length > 1) {
      for (let k = 0; k < r.xs.length; k++) {
        let x = r.xs[k];
        if (stops.length > 0 && x < stops[stops.length - 1][0]) {
          x = stops[stops.length - 1][0];
        }
        stops.push([x, r.y]);
      }
    } else {
      stops.push([xs[i], r.y]);
    }
  }
  return { kind: 'linear-stops', stops };
}

/**
 * Cubic Bézier evaluator: returns y(progress) for the easing curve
 * `cubic-bezier(p1x, p1y, p2x, p2y)` at a given input progress in [0, 1].
 *
 * Implementation: solve the bezier x equation for t given x = progress
 * (Newton's method seeded by linear, falling back to bisection), then
 * evaluate the bezier y polynomial at t.
 *
 * Used by the Animated adapter to resample easing curves into per-frame
 * sample lists when handing off to RN's interpolate (which only supports
 * linear segments on the native driver path).
 */
export function evaluateCubicBezier(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  progress: number
): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  const ax = 3 * p1x - 3 * p2x + 1;
  const bx = 3 * p2x - 6 * p1x;
  const cx = 3 * p1x;
  const ay = 3 * p1y - 3 * p2y + 1;
  const by = 3 * p2y - 6 * p1y;
  const cy = 3 * p1y;

  // Newton's method.
  let t = progress;
  for (let i = 0; i < 8; i++) {
    const x = ((ax * t + bx) * t + cx) * t - progress;
    if (Math.abs(x) < 1e-6) break;
    const dx = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(dx) < 1e-6) break;
    t -= x / dx;
  }
  // Clamp the solved t into [0, 1] in case Newton's overshot.
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return ((ay * t + by) * t + cy) * t;
}

/**
 * Step easing evaluator: returns y(progress) for `steps(n, jump-type)`.
 * Determines the current step S as floor(progress * n), then maps S to
 * an output level based on jump-type.
 */
export function evaluateSteps(
  n: number,
  jump: 'jump-start' | 'jump-end' | 'jump-none' | 'jump-both',
  progress: number
): number {
  if (progress < 0) progress = 0;
  if (progress > 1) progress = 1;
  let step = Math.floor(progress * n);
  if (progress === 1) step = n; // include the final boundary
  switch (jump) {
    case 'jump-start':
      // Output levels: 1/n, 2/n, …, n/n (jumps up at the start).
      return Math.min((step + 1) / n, 1);
    case 'jump-end':
      // Output levels: 0, 1/n, …, (n-1)/n (jumps up at the end).
      return Math.min(step / n, 1);
    case 'jump-none':
      // Output levels: 0, 1/(n-1), …, 1.
      return n > 1 ? Math.min(step / (n - 1), 1) : progress;
    case 'jump-both':
      // Output levels: 1/(n+1), 2/(n+1), …, n/(n+1).
      return Math.min((step + 1) / (n + 1), 1);
  }
}

/**
 * Evaluate an EasingDescriptor at progress p ∈ [0, 1]. Returns the
 * eased output in [0, 1] (with `cubic-bezier` y values potentially
 * outside, per spec).
 */
export function evaluateEasing(easing: EasingDescriptor, progress: number): number {
  switch (easing.kind) {
    case 'linear':
      return progress;
    case 'cubic-bezier': {
      const [a, b, c, d] = easing.p;
      return evaluateCubicBezier(a, b, c, d, progress);
    }
    case 'steps':
      return evaluateSteps(easing.n, easing.jump, progress);
    case 'linear-stops': {
      const stops = easing.stops;
      if (progress <= stops[0][0]) return stops[0][1];
      const last = stops[stops.length - 1];
      if (progress >= last[0]) return last[1];
      for (let i = 1; i < stops.length; i++) {
        const [x1, y1] = stops[i];
        if (progress <= x1) {
          const [x0, y0] = stops[i - 1];
          const span = x1 - x0;
          if (span === 0) return y1;
          return y0 + ((y1 - y0) * (progress - x0)) / span;
        }
      }
      return last[1];
    }
  }
}

/**
 * Parse a CSS time value (`<time>`) to milliseconds.
 *
 * Per CSS Values L4: `s` (seconds) and `ms` (milliseconds). Bare numbers
 * are NOT valid times in CSS but RN frequently passes raw millisecond
 * numbers, so we accept them too.
 */
export function parseTimeToMs(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const s = raw.trim().toLowerCase();
  if (s.endsWith('ms')) return parseFloat(s.slice(0, -2));
  if (s.endsWith('s')) return parseFloat(s.slice(0, -1)) * 1000;
  return parseFloat(s); // raw number string fallback
}
