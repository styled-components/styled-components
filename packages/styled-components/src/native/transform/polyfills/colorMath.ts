import { Token, TokenKind } from '../tokens';
import { tokenizeFunctionArgs } from '../tokenize';

/**
 * Static color-math polyfills: convert `oklch()` / `oklab()` / `lch()` /
 * `lab()` / `color-mix()` to hex when all operands are literal.
 *
 * RN 0.85's `@react-native/normalize-colors` doesn't yet recognise these
 * notations. We compute the sRGB equivalent at transform time and emit
 * hex. When any operand is a `var()` token, the `from` keyword for
 * relative-color-syntax, or otherwise dynamic, we return null and the
 * caller falls back to either a runtime resolver or passes the string
 * through (RN will reject but the dev warning is the user's signal).
 *
 * References:
 * - https://www.w3.org/TR/css-color-4/#rgb-to-lab
 * - https://bottosson.github.io/posts/oklab/
 * - https://www.w3.org/TR/css-color-5/#color-mix
 */

export interface RGB {
  /** 0..1 linear sRGB */
  r: number;
  g: number;
  b: number;
  /** 0..1 */
  a: number;
}

export function staticColorFunctionToHex(tok: Token): string | null {
  if (tok.kind !== TokenKind.Function) return null;
  const name = tok.name || '';

  switch (name) {
    case 'oklch':
      return tryConvert(parseOklch(tok));
    case 'oklab':
      return tryConvert(parseOklab(tok));
    case 'lch':
      return tryConvert(parseLch(tok));
    case 'lab':
      return tryConvert(parseLab(tok));
    case 'color-mix':
      return tryConvert(parseColorMix(tok));
    default:
      return null;
  }
}

function tryConvert(rgb: RGB | null): string | null {
  if (rgb === null) return null;
  return rgbToHex(rgb);
}

function rgbToHex(c: RGB): string {
  const r = toByte(c.r);
  const g = toByte(c.g);
  const b = toByte(c.b);
  if (c.a >= 0.999) {
    return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  }
  const a = toByte(c.a);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${hex2(a)}`;
}

function toByte(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(255, Math.round(x * 255)));
}

function hex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

// ─── oklch / oklab → sRGB ─────────────────────────────────────────

/** Polar `(c, hDeg)` → Cartesian `(a, b)` for L*a*b* / Oklab spaces. */
function polarToLabAB(c: number, hDeg: number): [number, number] {
  const hr = (hDeg * Math.PI) / 180;
  return [c * Math.cos(hr), c * Math.sin(hr)];
}

function parseOklch(tok: Token): RGB | null {
  const args = readChannels(tok, 3);
  if (args === null) return null;
  const [l, c, h, alpha] = args;
  const [a, b] = polarToLabAB(c, h);
  return oklabToRgb(l, a, b, alpha);
}

function parseOklab(tok: Token): RGB | null {
  const args = readChannels(tok, 3);
  if (args === null) return null;
  const [l, a, b, alpha] = args;
  return oklabToRgb(l, a, b, alpha);
}

function oklabToRgb(L: number, a: number, b: number, alpha: number): RGB {
  // Oklab to linear sRGB (Bottosson's matrices)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return {
    r: linearToSrgb(rLin),
    g: linearToSrgb(gLin),
    b: linearToSrgb(bLin),
    a: alpha,
  };
}

function linearToSrgb(v: number): number {
  const x = Math.max(0, Math.min(1, v));
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

// ─── lch / lab → sRGB ─────────────────────────────────────────────

function parseLch(tok: Token): RGB | null {
  const args = readChannels(tok, 3);
  if (args === null) return null;
  const [l, c, h, alpha] = args;
  const [a, b] = polarToLabAB(c, h);
  return labToRgb(l, a, b, alpha);
}

function parseLab(tok: Token): RGB | null {
  const args = readChannels(tok, 3);
  if (args === null) return null;
  const [l, a, b, alpha] = args;
  return labToRgb(l, a, b, alpha);
}

function labToRgb(L: number, a: number, b: number, alpha: number): RGB {
  // CIE Lab → XYZ (D50)
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const e = 216 / 24389;
  const k = 24389 / 27;
  const xr = fx ** 3 > e ? fx ** 3 : (116 * fx - 16) / k;
  const yr = L > k * e ? ((L + 16) / 116) ** 3 : L / k;
  const zr = fz ** 3 > e ? fz ** 3 : (116 * fz - 16) / k;
  const X = xr * 0.9642;
  const Y = yr * 1.0;
  const Z = zr * 0.8249;
  // XYZ D50 → linear sRGB (Bradford-adapted matrix)
  const rLin = 3.1338561 * X - 1.6168667 * Y - 0.4906146 * Z;
  const gLin = -0.9787684 * X + 1.9161415 * Y + 0.033454 * Z;
  const bLin = 0.0719453 * X - 0.2289914 * Y + 1.4052427 * Z;
  return {
    r: linearToSrgb(rLin),
    g: linearToSrgb(gLin),
    b: linearToSrgb(bLin),
    a: alpha,
  };
}

// ─── sRGB ↔ Oklab + sRGB ↔ Lab round-trips ──────────────────────────
//
// Mixing `in oklab` / `in oklch` / `in lab` / `in lch` MUST do the
// math in those spaces — not in linear-light sRGB. The user-facing
// guarantee is perceptual interpolation; substituting linear-RGB
// produces visibly different (worse) results.

interface LabTriple {
  L: number;
  a: number;
  b: number;
  alpha: number;
}

function srgbToOklab(r: number, g: number, b: number, alpha: number): LabTriple {
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);
  const l = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin;
  const m = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin;
  const s = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    alpha,
  };
}

function srgbToCieLab(r: number, g: number, b: number, alpha: number): LabTriple {
  // sRGB → linear → XYZ (D65) → adapt to D50 → Lab
  const rLin = srgbToLinear(r);
  const gLin = srgbToLinear(g);
  const bLin = srgbToLinear(b);
  // Linear sRGB → XYZ D65 (Bradford)
  const X65 = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin;
  const Y65 = 0.2126729 * rLin + 0.7151522 * gLin + 0.072175 * bLin;
  const Z65 = 0.0193339 * rLin + 0.119192 * gLin + 0.9503041 * bLin;
  // D65 → D50 (Bradford)
  const X = 1.0478112 * X65 + 0.0228866 * Y65 - 0.050127 * Z65;
  const Y = 0.0295424 * X65 + 0.9904844 * Y65 - 0.0170491 * Z65;
  const Z = -0.0092345 * X65 + 0.0150436 * Y65 + 0.7521316 * Z65;
  // XYZ D50 → Lab
  const Xn = 0.9642;
  const Yn = 1.0;
  const Zn = 0.8249;
  const e = 216 / 24389;
  const k = 24389 / 27;
  const f = (t: number) => (t > e ? Math.cbrt(t) : (k * t + 16) / 116);
  const fx = f(X / Xn);
  const fy = f(Y / Yn);
  const fz = f(Z / Zn);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz), alpha };
}

// ─── color-mix ─────────────────────────────────────────────────────

const SUPPORTED_MIX_SPACES = new Set(['srgb', 'oklab', 'oklch', 'lab', 'lch']);

/**
 * Minimal named-color table for `color-mix(in srgb, red 50%, blue)`.
 * We only include the ~16 primary CSS names most likely to appear as
 * literal operands; anything else passes through as null (caller
 * defers). RN's own `@react-native/normalize-colors` has the full
 * list but it's a runtime facility — we need static strings here.
 */
const NAMED_TO_HEX: Record<string, string> = {
  black: '000000',
  white: 'ffffff',
  red: 'ff0000',
  green: '008000',
  blue: '0000ff',
  yellow: 'ffff00',
  cyan: '00ffff',
  magenta: 'ff00ff',
  orange: 'ffa500',
  purple: '800080',
  pink: 'ffc0cb',
  brown: 'a52a2a',
  gray: '808080',
  grey: '808080',
  silver: 'c0c0c0',
  gold: 'ffd700',
  maroon: '800000',
  olive: '808000',
  lime: '00ff00',
  aqua: '00ffff',
  teal: '008080',
  navy: '000080',
  fuchsia: 'ff00ff',
  transparent: '00000000',
};

function parseColorMix(tok: Token): RGB | null {
  const args = tokenizeFunctionArgs(tok);
  // Expected: `in <colorspace>, <color> [<pct>], <color> [<pct>]`
  // Split by commas at top level
  const parts: Token[][] = [];
  let current: Token[] = [];
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) {
      parts.push(current);
      current = [];
    } else {
      current.push(t);
    }
  }
  if (current.length > 0) parts.push(current);
  if (parts.length !== 3) return null;

  // Part 0: `in <colorspace>`. `in srgb` per CSS Color 5 §3.1 mixes in
  // display-space (non-linear) sRGB; `oklab`/`oklch` use linear-light.
  const first = parts[0];
  if (first.length !== 2) return null;
  if (first[0].kind !== TokenKind.Ident || first[0].name !== 'in') return null;
  if (first[1].kind !== TokenKind.Ident) return null;
  const space = first[1].name!;
  if (!SUPPORTED_MIX_SPACES.has(space)) return null;

  const [ca, pa] = parseColorAndPct(parts[1]);
  const [cb, pb] = parseColorAndPct(parts[2]);
  if (ca === null || cb === null) return null;

  // Weights + alpha multiplier per CSS Color Level 5 §3.1. When both
  // percentages are present and sum < 100, the result alpha is scaled
  // by `sum/100` (intuitively: the "missing" percentage is transparency).
  // When sum > 100 OR only one percentage is given, we normalise as
  // usual and alpha stays untouched.
  let wA: number, wB: number;
  let alphaMult = 1;
  if (pa !== null && pb !== null) {
    const sum = pa + pb;
    if (sum === 0) return null; // undefined per spec
    wA = pa / sum;
    wB = pb / sum;
    if (sum < 100) alphaMult = sum / 100;
  } else if (pa !== null) {
    wA = pa / 100;
    wB = 1 - wA;
  } else if (pb !== null) {
    wB = pb / 100;
    wA = 1 - wB;
  } else {
    wA = 0.5;
    wB = 0.5;
  }

  // Mix in the requested space. `srgb` interpolates display-space sRGB
  // channels directly. `oklab`/`oklch`/`lab`/`lch` convert each operand
  // to that space, lerp there (polar form for the *ch variants honours
  // shorter-arc hue), then convert back to sRGB.
  if (space === 'srgb') {
    return {
      r: ca.r * wA + cb.r * wB,
      g: ca.g * wA + cb.g * wB,
      b: ca.b * wA + cb.b * wB,
      a: (ca.a * wA + cb.a * wB) * alphaMult,
    };
  }
  if (space === 'oklab' || space === 'oklch') {
    const A = srgbToOklab(ca.r, ca.g, ca.b, ca.a);
    const B = srgbToOklab(cb.r, cb.g, cb.b, cb.a);
    const m = mixLab(A, B, wA, wB, space === 'oklch');
    const out = oklabToRgb(m.L, m.a, m.b, m.alpha);
    return { r: out.r, g: out.g, b: out.b, a: out.a * alphaMult };
  }
  // 'lab' or 'lch'
  const A = srgbToCieLab(ca.r, ca.g, ca.b, ca.a);
  const B = srgbToCieLab(cb.r, cb.g, cb.b, cb.a);
  const m = mixLab(A, B, wA, wB, space === 'lch');
  const out = labToRgb(m.L, m.a, m.b, m.alpha);
  return { r: out.r, g: out.g, b: out.b, a: out.a * alphaMult };
}

/**
 * Linear interpolation in a Lab-family space. When `polar`, mixes the
 * polar `(L, C, h)` form (matching `oklch` / `lch` semantics) with
 * shorter-arc hue rotation. Otherwise straight channel-wise lerp.
 */
function mixLab(A: LabTriple, B: LabTriple, wA: number, wB: number, polar: boolean): LabTriple {
  const alpha = A.alpha * wA + B.alpha * wB;
  if (!polar) {
    return { L: A.L * wA + B.L * wB, a: A.a * wA + B.a * wB, b: A.b * wA + B.b * wB, alpha };
  }
  const cA = Math.hypot(A.a, A.b);
  const cB = Math.hypot(B.a, B.b);
  const hA = (Math.atan2(A.b, A.a) * 180) / Math.PI;
  const hB = (Math.atan2(B.b, B.a) * 180) / Math.PI;
  let dh = hB - hA;
  if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const h = hA + dh * wB;
  const c = cA * wA + cB * wB;
  const L = A.L * wA + B.L * wB;
  const hr = (h * Math.PI) / 180;
  return { L, a: c * Math.cos(hr), b: c * Math.sin(hr), alpha };
}

function parseColorAndPct(tokens: Token[]): [RGB | null, number | null] {
  let color: RGB | null = null;
  let pct: number | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === TokenKind.Percent) {
      pct = t.value!;
    } else if (t.kind === TokenKind.Hash) {
      color = parseHex(t.name!);
    } else if (t.kind === TokenKind.Ident) {
      const named = NAMED_TO_HEX[t.name!];
      if (named !== undefined) color = parseHex(named);
      else return [null, null];
    } else if (t.kind === TokenKind.Function) {
      const hex = staticColorFunctionToHex(t);
      if (hex !== null) color = parseHex(hex.slice(1));
      else return [null, null];
    } else {
      return [null, null];
    }
  }
  return [color, pct];
}

/** Parse a hex digit string (no leading `#`) to display-space sRGB 0..1. */
function parseHex(hex: string): RGB {
  let h = hex;
  if (h.length === 3 || h.length === 4) {
    let expanded = '';
    for (let i = 0; i < h.length; i++) expanded += h[i] + h[i];
    h = expanded;
  }
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
    a: h.length === 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1,
  };
}

function srgbToLinear(v: number): number {
  const x = Math.max(0, Math.min(1, v));
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function readChannels(tok: Token, count: number): [number, number, number, number] | null {
  const args = tokenizeFunctionArgs(tok);
  const vals: number[] = [];
  let alpha = 1;
  let sawSlash = false;
  for (let i = 0; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) continue;
    if (t.kind === TokenKind.Slash) {
      sawSlash = true;
      continue;
    }
    if (t.kind === TokenKind.Number) {
      if (sawSlash) alpha = t.value!;
      else vals.push(t.value!);
    } else if (t.kind === TokenKind.Percent) {
      // For L in oklch: 0-100% → 0-1
      const v = t.value! / 100;
      if (sawSlash) alpha = v;
      else vals.push(v);
    } else {
      // Ident (e.g. `none`, `from`) — we don't support dynamic forms
      return null;
    }
  }
  if (vals.length !== count) return null;
  return [vals[0], vals[1], vals[2], alpha];
}
