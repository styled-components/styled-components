import { Token, TokenKind } from '../tokens';
import { tokenizeFunctionArgs } from '../tokenize';
import { resolveStaticMathFunction } from './mathFns';

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
 * Out-of-gamut input (e.g. `oklch(0.7 0.4 130)`) goes through Björn
 * Ottosson's analytic sRGB clip with adaptive L0=0.5 and α=0.05 (the
 * recommended default in his post). The projection target smoothly
 * blends the input lightness toward 0.5 as chroma exceeds gamut,
 * trading a small L drift for retained chroma at hue/lightness
 * combinations where preserve-lightness over-desaturates (notably
 * yellow/green near the gamut cusp). Hue stays exact.
 *
 * References:
 * - https://www.w3.org/TR/css-color-4/#rgb-to-lab
 * - https://bottosson.github.io/posts/gamutclipping/ (clip algo)
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
  // CSS Color L4: oklch L percent → 0..1, C percent → 0..0.4, hue rejects percent.
  const args = readChannels(tok, OKLCH_SCALES);
  if (args === null) return null;
  const [l, c, h, alpha] = args;
  const [a, b] = polarToLabAB(c, h);
  return oklabToRgb(l, a, b, alpha);
}

function parseOklab(tok: Token): RGB | null {
  // CSS Color L4: oklab L percent → 0..1, a/b percent → ±0.4.
  const args = readChannels(tok, OKLAB_SCALES);
  if (args === null) return null;
  const [l, a, b, alpha] = args;
  return oklabToRgb(l, a, b, alpha);
}

const OKLAB_SCALES: [number, number, number] = [1, 0.4, 0.4];
const OKLCH_SCALES: [number, number, number] = [1, 0.4, NaN];
const LAB_SCALES: [number, number, number] = [100, 125, 125];
const LCH_SCALES: [number, number, number] = [100, 150, NaN];

interface LinearRGB {
  r: number;
  g: number;
  b: number;
}

/** Pure Oklab → linear sRGB conversion (Bottosson's matrices). No clipping. */
function oklabToLinearRgb(L: number, a: number, b: number): LinearRGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/** Linear sRGB → Oklab. Inverse of {@link oklabToLinearRgb}. */
function linearRgbToOklab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function inSrgbGamut(c: LinearRGB): boolean {
  // Tiny epsilon absorbs the float noise that gamut-clipped output
  // accumulates after roundtripping through OKLab and back.
  const E = 1e-6;
  return c.r >= -E && c.r <= 1 + E && c.g >= -E && c.g <= 1 + E && c.b >= -E && c.b <= 1 + E;
}

/**
 * Björn Ottosson's compute-max-saturation: given a unit-length OKLab
 * direction `(a, b)` (`a*a + b*b == 1`), return the largest saturation
 * `S = C/L` that stays inside sRGB. The polynomial in `(a, b)` is a
 * tight initial guess; one Halley step refines it to numerical accuracy.
 *
 * Three branches pick the linear-sRGB row whose `f(S)=0` defines the
 * gamut boundary for this hue (R, G, or B reaching zero first). The
 * predicates are halfspace-cuts of the OKLab a/b plane.
 */
function computeMaxSaturation(a: number, b: number): number {
  let k0: number, k1: number, k2: number, k3: number, k4: number;
  let wL: number, wM: number, wS: number;
  if (-1.88170328 * a - 0.80936493 * b > 1) {
    k0 = 1.19086277;
    k1 = 1.76576728;
    k2 = 0.59662641;
    k3 = 0.75515197;
    k4 = 0.56771245;
    wL = 4.0767416621;
    wM = -3.3077115913;
    wS = 0.2309699292;
  } else if (1.81444104 * a - 1.19445276 * b > 1) {
    k0 = 0.73956515;
    k1 = -0.45954404;
    k2 = 0.08285427;
    k3 = 0.1254107;
    k4 = 0.14503204;
    wL = -1.2684380046;
    wM = 2.6097574011;
    wS = -0.3413193965;
  } else {
    k0 = 1.35733652;
    k1 = -0.00915799;
    k2 = -1.1513021;
    k3 = -0.50559606;
    k4 = 0.00692167;
    wL = -0.0041960863;
    wM = -0.7034186147;
    wS = 1.707614701;
  }
  let S = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b;

  const kL = 0.3963377774 * a + 0.2158037573 * b;
  const kM = -0.1055613458 * a - 0.0638541728 * b;
  const kS = -0.0894841775 * a - 1.291485548 * b;

  const lq = 1 + S * kL;
  const mq = 1 + S * kM;
  const sq = 1 + S * kS;
  const l = lq * lq * lq;
  const m = mq * mq * mq;
  const s = sq * sq * sq;
  const ldS = 3 * kL * lq * lq;
  const mdS = 3 * kM * mq * mq;
  const sdS = 3 * kS * sq * sq;
  const ldS2 = 6 * kL * kL * lq;
  const mdS2 = 6 * kM * kM * mq;
  const sdS2 = 6 * kS * kS * sq;
  const f = wL * l + wM * m + wS * s;
  const f1 = wL * ldS + wM * mdS + wS * sdS;
  const f2 = wL * ldS2 + wM * mdS2 + wS * sdS2;
  return S - (f * f1) / (f1 * f1 - 0.5 * f * f2);
}

/**
 * Find the cusp `(L_cusp, C_cusp)` of the sRGB gamut for hue `(a, b)`
 * (unit-length). The cusp is the apex of the gamut triangle in the
 * (L, C) plane at this hue; chroma above it is unrepresentable at any
 * lightness. Above the cusp (L > L_cusp) the boundary slopes toward
 * white at L=1; below, toward black at L=0.
 */
function findCusp(a: number, b: number): { L: number; C: number } {
  const Smax = computeMaxSaturation(a, b);
  // Linear sRGB at oklab(1, S*a, S*b); the cube root rescales L so
  // the brightest channel sits on the upper boundary.
  const rgb = oklabToLinearRgb(1, Smax * a, Smax * b);
  const Lc = Math.cbrt(1 / Math.max(rgb.r, rgb.g, rgb.b));
  return { L: Lc, C: Lc * Smax };
}

/**
 * Find `t` along the line from `(L0, 0)` to `(L1, C1)` where the line
 * intersects the sRGB gamut boundary in OKLCh space. The result `t * C1`
 * is the largest chroma that fits on this projection line; the caller
 * scales back into OKLab.
 *
 * Lower half (`L1 <= cusp.L` along the projection): the boundary is a
 * straight line from black to the cusp, so the intersection has a
 * closed form.
 *
 * Upper half: the boundary curves toward white, so a triangle estimate
 * is followed by one Halley step that finds the smallest `t` where any
 * of R, G, B linear channels reaches 1.
 */
function findGamutIntersection(a: number, b: number, L1: number, C1: number, L0: number): number {
  const cusp = findCusp(a, b);
  if ((L1 - L0) * cusp.C - (cusp.L - L0) * C1 <= 0) {
    return (cusp.C * L0) / (C1 * cusp.L + cusp.C * (L0 - L1));
  }
  let t = (cusp.C * (L0 - 1)) / (C1 * (cusp.L - 1) + cusp.C * (L0 - L1));
  const dL = L1 - L0;
  const dC = C1;
  const kL = 0.3963377774 * a + 0.2158037573 * b;
  const kM = -0.1055613458 * a - 0.0638541728 * b;
  const kS = -0.0894841775 * a - 1.291485548 * b;
  const ldT = dL + dC * kL;
  const mdT = dL + dC * kM;
  const sdT = dL + dC * kS;
  const Lcur = L0 * (1 - t) + t * L1;
  const Ccur = t * C1;
  const lq = Lcur + Ccur * kL;
  const mq = Lcur + Ccur * kM;
  const sq = Lcur + Ccur * kS;
  const l = lq * lq * lq;
  const m = mq * mq * mq;
  const s = sq * sq * sq;
  const ldt = 3 * ldT * lq * lq;
  const mdt = 3 * mdT * mq * mq;
  const sdt = 3 * sdT * sq * sq;
  const ldt2 = 6 * ldT * ldT * lq;
  const mdt2 = 6 * mdT * mdT * mq;
  const sdt2 = 6 * sdT * sdT * sq;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s - 1;
  const r1 = 4.0767416621 * ldt - 3.3077115913 * mdt + 0.2309699292 * sdt;
  const r2 = 4.0767416621 * ldt2 - 3.3077115913 * mdt2 + 0.2309699292 * sdt2;
  const uR = r1 / (r1 * r1 - 0.5 * r * r2);
  const tR = uR >= 0 ? -r * uR : Number.MAX_VALUE;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s - 1;
  const g1 = -1.2684380046 * ldt + 2.6097574011 * mdt - 0.3413193965 * sdt;
  const g2 = -1.2684380046 * ldt2 + 2.6097574011 * mdt2 - 0.3413193965 * sdt2;
  const uG = g1 / (g1 * g1 - 0.5 * g * g2);
  const tG = uG >= 0 ? -g * uG : Number.MAX_VALUE;
  const bv = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s - 1;
  const b1 = -0.0041960863 * ldt - 0.7034186147 * mdt + 1.707614701 * sdt;
  const b2 = -0.0041960863 * ldt2 - 0.7034186147 * mdt2 + 1.707614701 * sdt2;
  const uB = b1 / (b1 * b1 - 0.5 * bv * b2);
  const tB = uB >= 0 ? -bv * uB : Number.MAX_VALUE;
  return t + Math.min(tR, Math.min(tG, tB));
}

/**
 * Adaptive L0 = 0.5 sRGB gamut clip with α = 0.05 (Ottosson's
 * recommended default). The projection target `L0` smoothly blends
 * between the input lightness `L` (when chroma fits) and 0.5 (when
 * chroma exceeds gamut), trading slight L drift for retained chroma.
 *
 * Hue stays exact regardless. For inputs that fit, this returns the
 * direct conversion unchanged via the in-gamut fast path.
 */
function oklabToRgb(L: number, a: number, b: number, alpha: number): RGB {
  if (L >= 1) return { r: 1, g: 1, b: 1, a: alpha };
  if (L <= 0) return { r: 0, g: 0, b: 0, a: alpha };

  const direct = oklabToLinearRgb(L, a, b);
  if (inSrgbGamut(direct)) return finalizeSrgb(direct, alpha);

  const C = Math.hypot(a, b);
  if (C === 0) return finalizeSrgb(direct, alpha);

  const aHat = a / C;
  const bHat = b / C;

  // Adaptive L0: smoothly drift L toward 0.5 as chroma exceeds gamut.
  // α=0.05 is the spec-recommended default — small enough to keep the
  // result close to the input L but enough to preserve chroma at the
  // yellow/green boundary where preserve-lightness over-desaturates.
  const ALPHA = 0.05;
  const Ld = L - 0.5;
  const absLd = Math.abs(Ld);
  const e1 = 0.5 + absLd + ALPHA * C;
  const sgn = Ld === 0 ? 0 : Ld < 0 ? -1 : 1;
  const L0 = 0.5 * (1 + sgn * (e1 - Math.sqrt(e1 * e1 - 2 * absLd)));

  const t = findGamutIntersection(aHat, bHat, L, C, L0);
  const Lclipped = L0 * (1 - t) + t * L;
  const Cclipped = t * C;
  return finalizeSrgb(oklabToLinearRgb(Lclipped, Cclipped * aHat, Cclipped * bHat), alpha);
}

/** Linear sRGB → display-space sRGB with gamma correction; final 8-bit-ready. */
function finalizeSrgb(c: LinearRGB, alpha: number): RGB {
  return {
    r: linearToSrgb(c.r),
    g: linearToSrgb(c.g),
    b: linearToSrgb(c.b),
    a: alpha,
  };
}

function linearToSrgb(v: number): number {
  const x = v < 0 ? 0 : v > 1 ? 1 : v;
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

// ─── lch / lab → sRGB ─────────────────────────────────────────────

function parseLch(tok: Token): RGB | null {
  // CSS Color L4: lch L percent → 0..100, C percent → 0..150, hue rejects percent.
  const args = readChannels(tok, LCH_SCALES);
  if (args === null) return null;
  const [l, c, h, alpha] = args;
  const [a, b] = polarToLabAB(c, h);
  return labToRgb(l, a, b, alpha);
}

function parseLab(tok: Token): RGB | null {
  // CSS Color L4: lab L percent → 0..100, a/b percent → ±125.
  const args = readChannels(tok, LAB_SCALES);
  if (args === null) return null;
  const [l, a, b, alpha] = args;
  return labToRgb(l, a, b, alpha);
}

function labToRgb(L: number, a: number, b: number, alpha: number): RGB {
  // CIE Lab → XYZ (D50) → linear sRGB
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
  const direct: LinearRGB = {
    r: 3.1338561 * X - 1.6168667 * Y - 0.4906146 * Z,
    g: -0.9787684 * X + 1.9161415 * Y + 0.033454 * Z,
    b: 0.0719453 * X - 0.2289914 * Y + 1.4052427 * Z,
  };
  // Already in gamut: gamma-correct and ship. Common case.
  if (inSrgbGamut(direct)) return finalizeSrgb(direct, alpha);
  // Out of sRGB: re-derive an OKLab triple from the (out-of-gamut)
  // linear-light representation and route through the OKLCh bisection
  // gamut mapper. Per CSS Color 4 §13 the algorithm uses OKLCh
  // regardless of source space.
  const ok = linearRgbToOklab(direct.r, direct.g, direct.b);
  return oklabToRgb(ok.L, ok.a, ok.b, alpha);
}

// ─── sRGB ↔ Oklab + sRGB ↔ Lab round-trips ──────────────────────────
//
// Mixing `in oklab` / `in oklch` / `in lab` / `in lch` MUST do the
// math in those spaces; not in linear-light sRGB. The user-facing
// guarantee is perceptual interpolation; substituting linear-RGB
// produces visibly different (worse) results.

interface LabTriple {
  L: number;
  a: number;
  b: number;
  alpha: number;
}

function srgbToOklab(r: number, g: number, b: number, alpha: number): LabTriple {
  const ok = linearRgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
  return { L: ok.L, a: ok.a, b: ok.b, alpha };
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
 * list but it's a runtime facility; we need static strings here.
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

  const [ca, pa] = parseColorPct(parts[1]);
  const [cb, pb] = parseColorPct(parts[2]);
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

function parseColorPct(tokens: Token[]): [RGB | null, number | null] {
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
      // First try the slot as a nested color function (the original
      // case — `color-mix(…, oklch(…), red)`).
      const hex = staticColorFunctionToHex(t);
      if (hex !== null) {
        color = parseHex(hex.slice(1));
        continue;
      }
      // Otherwise fold static math fns whose result is a percentage.
      // Lets `color-mix(in srgb, X calc(100% - 30%), Y)` work the same
      // way a literal `70%` would.
      const numeric = resolveStaticMathFunction(t);
      if (numeric !== null && numeric.unit === '%') {
        pct = numeric.value;
        continue;
      }
      return [null, null];
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

/**
 * Read three channel values + optional alpha from an `oklab`/`oklch`/`lab`/`lch`
 * function token. Each color space scales percents differently per CSS Color L4:
 * `scales[i]` is what `100%` maps to for channel `i`. Pass `NaN` to reject
 * percent for that channel (used for hue, where percent isn't valid).
 *
 * Number form (no `%`) is taken as-is. Alpha after `/` is normalised to 0..1
 * regardless of input form.
 */
function readChannels(
  tok: Token,
  scales: readonly [number, number, number]
): [number, number, number, number] | null {
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
      if (sawSlash) {
        alpha = t.value! / 100;
      } else {
        const idx = vals.length;
        const scale = idx < scales.length ? scales[idx] : NaN;
        if (Number.isNaN(scale)) return null;
        vals.push((t.value! / 100) * scale);
      }
    } else if (t.kind === TokenKind.Function) {
      // Static-foldable math fns (`calc`, `min`, `max`, `clamp`) are
      // valid channel sources when the result is a bare number or a
      // percentage. Other units (px / em / vw / …) don't make sense as
      // a color channel and bail back to null.
      const numeric = resolveStaticMathFunction(t);
      if (numeric === null) return null;
      if (numeric.unit === '') {
        if (sawSlash) alpha = numeric.value;
        else vals.push(numeric.value);
      } else if (numeric.unit === '%') {
        if (sawSlash) {
          alpha = numeric.value / 100;
        } else {
          const idx = vals.length;
          const scale = idx < scales.length ? scales[idx] : NaN;
          if (Number.isNaN(scale)) return null;
          vals.push((numeric.value / 100) * scale);
        }
      } else {
        return null;
      }
    } else {
      // Ident (e.g. `none`, `from`); we don't support dynamic forms
      return null;
    }
  }
  if (vals.length !== 3) return null;
  return [vals[0], vals[1], vals[2], alpha];
}
