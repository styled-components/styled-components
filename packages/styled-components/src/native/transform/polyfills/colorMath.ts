import { warnOnce } from '../dev';
import { numberToken, Token, TokenKind } from '../tokens';
import { tokenizeFunctionArgs } from '../tokenize';
import { resolveStaticMathFunction } from './mathFns';

/**
 * Static fold for oklch/oklab/lch/lab, color(), color-mix(), and relative-color
 * when operands are literals. Returns null → runtime resolver / RN normalize.
 *
 * Gamut: OKLCh chroma bisection to sRGB.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function staticColorFunctionToHex(tok: Token): string | null {
  const rgb = staticColorFunctionToRgb(tok);
  return rgb === null ? null : rgbToHex(rgb);
}

/** Returns RGB directly. Mix-operand and animation paths consume RGB;
 *  routing through hex + re-parse allocates needlessly. */
export function staticColorFunctionToRgb(tok: Token): RGB | null {
  if (tok.kind !== TokenKind.Function) return null;
  switch (tok.name) {
    case 'oklch':
      return parseOklch(tok);
    case 'oklab':
      return parseOklab(tok);
    case 'lch':
      return parseLch(tok);
    case 'lab':
      return parseLab(tok);
    case 'hsl':
    case 'hsla':
      return parseHsl(tok);
    case 'hwb':
      return parseHwb(tok);
    case 'rgb':
    case 'rgba':
      return parseRgbFn(tok);
    case 'color-mix':
      return parseColorMix(tok);
    case 'color':
      return parseColorFn(tok);
    default:
      return null;
  }
}

/** Precomputed 0..255 → "00".."ff" lookup; replaces per-byte `padStart` allocations. */
const HEX_BYTE = (() => {
  const out = new Array<string>(256);
  for (let i = 0; i < 256; i++) {
    out[i] = (i < 16 ? '0' : '') + i.toString(16);
  }
  return out;
})();

function rgbToHex(c: RGB): string {
  const r = toByte(c.r);
  const g = toByte(c.g);
  const b = toByte(c.b);
  if (c.a >= 0.999) {
    return '#' + HEX_BYTE[r] + HEX_BYTE[g] + HEX_BYTE[b];
  }
  const a = toByte(c.a);
  return '#' + HEX_BYTE[r] + HEX_BYTE[g] + HEX_BYTE[b] + HEX_BYTE[a];
}

function toByte(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(255, Math.round(x * 255)));
}

function parseOklch(tok: Token): RGB | null {
  const args = readChannels(tok, OKLCH_SCALES, 'oklch');
  if (args === null) return null;
  const [l, c, h, alpha] = args;
  // `none` → 0 for the used value. L clamped 0..1, C clamped >=0.
  const lc = Math.max(0, Math.min(1, usedValue(l)));
  const cc = Math.max(0, usedValue(c));
  const hr = (usedValue(h) * Math.PI) / 180;
  const a = cc * Math.cos(hr);
  const b = cc * Math.sin(hr);
  return oklabToRgb(lc, a, b, usedValue(alpha));
}

function parseOklab(tok: Token): RGB | null {
  const args = readChannels(tok, OKLAB_SCALES, 'oklab');
  if (args === null) return null;
  const [l, a, b, alpha] = args;
  return oklabToRgb(
    Math.max(0, Math.min(1, usedValue(l))),
    usedValue(a),
    usedValue(b),
    usedValue(alpha)
  );
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
  // Tiny epsilon absorbs the float noise that linear-light conversion
  // accumulates after roundtripping through OKLab and back.
  const E = 1e-6;
  return c.r >= -E && c.r <= 1 + E && c.g >= -E && c.g <= 1 + E && c.b >= -E && c.b <= 1 + E;
}

/**
 * OKLab → sRGB. In-gamut input goes straight through {@link finalizeSrgb}.
 * Out-of-gamut input runs OKLCh chroma bisection (see {@link mapOklchToSrgb}).
 *
 * Exported so the animation runtime can interpolate keyframe colors in oklab
 * without duplicating Bottosson's matrices.
 */
export function oklabToRgb(L: number, a: number, b: number, alpha: number): RGB {
  if (L >= 1) return { r: 1, g: 1, b: 1, a: alpha };
  if (L <= 0) return { r: 0, g: 0, b: 0, a: alpha };
  const lin = oklabToLinearRgb(L, a, b);
  if (inSrgbGamut(lin)) return finalizeSrgb(lin, alpha);
  return mapOklchToSrgb(L, a, b, alpha);
}

/**
 * OKLCh chroma-reduction toward sRGB. Holds L and hue direction constant,
 * bisects C on [0, |chroma|] for the largest C whose linear sRGB conversion
 * fits in gamut. {@link linearToSrgb} clamps any sub-epsilon residual.
 */
function mapOklchToSrgb(L: number, a: number, b: number, alpha: number): RGB {
  const cHi = Math.hypot(a, b);
  // hue as unit vector so we can rebuild oklab(L, a, b) from any C
  const ax = cHi === 0 ? 0 : a / cHi;
  const ay = cHi === 0 ? 0 : b / cHi;
  let lo = 0;
  let hi = cHi;
  // ε in chroma. 0.0001 ≈ JND/30 in OKLab units; ~14 iterations on a
  // typical OOG input. Cheaper than the spec's ΔE-OK early termination
  // (which is asymptotically the same shape but requires a per-step Lab
  // back-conversion).
  while (hi - lo > 0.0001) {
    const mid = (lo + hi) * 0.5;
    if (inSrgbGamut(oklabToLinearRgb(L, ax * mid, ay * mid))) lo = mid;
    else hi = mid;
  }
  return finalizeSrgb(oklabToLinearRgb(L, ax * lo, ay * lo), alpha);
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

function parseLch(tok: Token): RGB | null {
  const args = readChannels(tok, LCH_SCALES, 'lch');
  if (args === null) return null;
  const [l, c, h, alpha] = args;
  const lc = Math.max(0, Math.min(100, usedValue(l)));
  const cc = Math.max(0, usedValue(c));
  const hr = (usedValue(h) * Math.PI) / 180;
  const a = cc * Math.cos(hr);
  const b = cc * Math.sin(hr);
  return labToRgb(lc, a, b, usedValue(alpha));
}

function parseLab(tok: Token): RGB | null {
  const args = readChannels(tok, LAB_SCALES, 'lab');
  if (args === null) return null;
  const [l, a, b, alpha] = args;
  return labToRgb(
    Math.max(0, Math.min(100, usedValue(l))),
    usedValue(a),
    usedValue(b),
    usedValue(alpha)
  );
}

/** Returns null when the callee shape isn't static-parseable. */
function parseHsl(tok: Token): RGB | null {
  const channels = readHsParts(tok);
  if (channels === null) return null;
  const [h, s, l, alpha] = channels;
  const rgb = hslToRgb(usedValue(h), usedValue(s), usedValue(l));
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: usedValue(alpha) };
}

/** Gray when w+b>=100%. */
function parseHwb(tok: Token): RGB | null {
  const channels = readHsParts(tok);
  if (channels === null) return null;
  const [h, w, b, alpha] = channels;
  const rgb = hwbToRgb(usedValue(h), usedValue(w), usedValue(b));
  return { r: rgb.r, g: rgb.g, b: rgb.b, a: usedValue(alpha) };
}

/**
 * `rgb(r g b [ / a])` / `rgba(r, g, b, a)` static parse. The channel
 * values come back in 0..255 (or 0..100 when percent) and we normalize
 * to 0..1. RN's normalizeColor already handles the runtime form; this
 * exists so `color-mix(in oklch, rgb(...), ...)` can fold statically.
 */
/** Standalone `rgb()` / `rgba()` → display-space sRGB. Collapses `none`
 *  to 0 (used value) and clamps OOR channels to 0..1 for the public RGB
 *  shape. The polar / rectangular mix paths call `readRgbFn` directly
 *  and do their own NaN carry-forward before collapsing. */
function parseRgbFn(tok: Token): RGB | null {
  const ch = readRgbFn(tok);
  if (ch === null) return null;
  return {
    r: Math.max(0, Math.min(1, usedValue(ch[0]))),
    g: Math.max(0, Math.min(1, usedValue(ch[1]))),
    b: Math.max(0, Math.min(1, usedValue(ch[2]))),
    a: Math.max(0, Math.min(1, usedValue(ch[3]))),
  };
}

/**
 * Standalone `color(<colorspace> c1 c2 c3 [ / a])` → display-space sRGB.
 * Predefined RGB spaces share the pipeline: decode gamma → linear-light →
 * matrix to linear sRGB → gamma-encode. XYZ skips the gamma step. Out-of-gamut
 * inputs route through the OKLCh bisection mapper. Collapses `none` to 0 and
 * clamps alpha; mix paths call `readColorFn` directly to preserve NaN.
 */
function parseColorFn(tok: Token): RGB | null {
  const native = readColorFn(tok);
  if (native === null) return null;
  return colorSpaceToRgb(
    native.space,
    usedValue(native.c1),
    usedValue(native.c2),
    usedValue(native.c3),
    Math.max(0, Math.min(1, usedValue(native.alpha)))
  );
}

/** Decode a color() colorspace to sRGB display. Returns null when the space
 *  identifier isn't a predefined one. Linear-light intermediates flow through
 *  {@link finalizeSrgb} so out-of-gamut values route through the OKLCh
 *  bisection mapper used by `lab()` / `oklch()`. */
function colorSpaceToRgb(
  space: string,
  c1: number,
  c2: number,
  c3: number,
  alpha: number
): RGB | null {
  switch (space) {
    case 'srgb':
      // Already display-space sRGB; clip OOR to keep `>1` / `<0` from
      // bleeding into hex.
      return {
        r: Math.max(0, Math.min(1, c1)),
        g: Math.max(0, Math.min(1, c2)),
        b: Math.max(0, Math.min(1, c3)),
        a: alpha,
      };
    case 'srgb-linear':
      return finalizeOrMap({ r: c1, g: c2, b: c3 }, alpha);
    case 'display-p3':
      return finalizeOrMap(
        displayP3ToLinearSrgb(srgbGamma(c1), srgbGamma(c2), srgbGamma(c3)),
        alpha
      );
    case 'display-p3-linear':
      return finalizeOrMap(displayP3ToLinearSrgb(c1, c2, c3), alpha);
    case 'a98-rgb':
      return finalizeOrMap(a98ToLinearSrgb(a98Gamma(c1), a98Gamma(c2), a98Gamma(c3)), alpha);
    case 'prophoto-rgb':
      return finalizeOrMap(
        prophotoToLinearSrgb(prophotoGamma(c1), prophotoGamma(c2), prophotoGamma(c3)),
        alpha
      );
    case 'rec2020':
      return finalizeOrMap(
        rec2020ToLinearSrgb(rec2020Gamma(c1), rec2020Gamma(c2), rec2020Gamma(c3)),
        alpha
      );
    case 'xyz':
    case 'xyz-d65':
      return finalizeOrMap(xyzD65ToLinearSrgb(c1, c2, c3), alpha);
    case 'xyz-d50':
      return finalizeOrMap(xyzD50ToLinearSrgb(c1, c2, c3), alpha);
    default:
      return null;
  }
}

/** Common tail for all color() linear-sRGB intermediates. Routes out-of-gamut
 *  triples through the OKLCh bisection mapper (chroma reduction; see
 *  {@link mapOklchToSrgb}); in-gamut goes straight to display gamma. */
function finalizeOrMap(c: LinearRGB, alpha: number): RGB {
  if (inSrgbGamut(c)) return finalizeSrgb(c, alpha);
  const ok = linearRgbToOklab(c.r, c.g, c.b);
  return oklabToRgb(ok.L, ok.a, ok.b, alpha);
}

/** sRGB / Display-P3 share the IEC 61966-2-1 transfer function. */
function srgbGamma(v: number): number {
  const a = Math.abs(v);
  const s = v < 0 ? -1 : 1;
  return s * (a <= 0.04045 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4));
}

/** A98 RGB: gamma = 256/563 ≈ 0.4547 (encoded), so decode = 563/256. */
function a98Gamma(v: number): number {
  const a = Math.abs(v);
  const s = v < 0 ? -1 : 1;
  return s * Math.pow(a, 563 / 256);
}

/** ProPhoto RGB: gamma 1.8 with a small linear segment for low values. */
function prophotoGamma(v: number): number {
  const a = Math.abs(v);
  const s = v < 0 ? -1 : 1;
  return s * (a <= 16 / 512 ? a / 16 : Math.pow(a, 1.8));
}

/** Rec.2020: ITU-R BT.2020 gamma (same family as Rec.709). */
function rec2020Gamma(v: number): number {
  const a = Math.abs(v);
  const s = v < 0 ? -1 : 1;
  const alpha = 1.09929682680944;
  const beta = 0.018053968510807;
  return s * (a < beta * 4.5 ? a / 4.5 : Math.pow((a + alpha - 1) / alpha, 1 / 0.45));
}

// Conversion matrices below run linear-light → XYZ D65 → linear sRGB. Numbers
// match the W3C reference values to 7 decimal places.

function displayP3ToLinearSrgb(r: number, g: number, b: number): LinearRGB {
  return {
    r: 1.224940176 * r - 0.224940176 * g + 0 * b,
    g: -0.042056954 * r + 1.042056954 * g + 0 * b,
    b: -0.019637543 * r - 0.078636465 * g + 1.098273008 * b,
  };
}

function a98ToLinearSrgb(r: number, g: number, b: number): LinearRGB {
  return {
    r: 1.397755823 * r - 0.397755823 * g + 0 * b,
    g: 0 * r + 1 * g + 0 * b,
    b: 0 * r - 0.043155493 * g + 1.043155493 * b,
  };
}

function prophotoToLinearSrgb(r: number, g: number, b: number): LinearRGB {
  // ProPhoto is D50-anchored; the matrix below folds Bradford D50 → D65
  // and ProPhoto-linear → linear sRGB into one step.
  return {
    r: 2.0345854 * r - 0.7276886 * g - 0.3065968 * b,
    g: -0.2289927 * r + 1.231708 * g - 0.0027153 * b,
    b: -0.008558 * r - 0.1532153 * g + 1.1617733 * b,
  };
}

function rec2020ToLinearSrgb(r: number, g: number, b: number): LinearRGB {
  return {
    r: 1.6605 * r - 0.5876 * g - 0.0728 * b,
    g: -0.1246 * r + 1.1329 * g - 0.0083 * b,
    b: -0.0182 * r - 0.1006 * g + 1.1187 * b,
  };
}

function xyzD65ToLinearSrgb(X: number, Y: number, Z: number): LinearRGB {
  return {
    r: 3.2409699 * X - 1.5373832 * Y - 0.4986108 * Z,
    g: -0.9692436 * X + 1.8759675 * Y + 0.0415551 * Z,
    b: 0.0556301 * X - 0.203977 * Y + 1.0569715 * Z,
  };
}

function xyzD50ToLinearSrgb(X: number, Y: number, Z: number): LinearRGB {
  // D50 → linear sRGB (Bradford-adapted matrix). Same form as
  // `labToRgb`'s tail block; kept inline because the matrix coefficients
  // are tiny and inlining keeps the call paths flat.
  return {
    r: 3.1338561 * X - 1.6168667 * Y - 0.4906146 * Z,
    g: -0.9787684 * X + 1.9161415 * Y + 0.033454 * Z,
    b: 0.0719453 * X - 0.2289914 * Y + 1.4052427 * Z,
  };
}

// ─── Inverse conversions (linear sRGB → wide-gamut space) ─────────────
// Matrix inverses of the forward functions above; we keep both expanded rather
// than inverting at runtime so the hot path stays branch-free and monomorphic.

function linearSrgbToDisplayP3(r: number, g: number, b: number): LinearRGB {
  return {
    r: 0.822461969 * r + 0.177538031 * g + 0 * b,
    g: 0.033194199 * r + 0.966805801 * g + 0 * b,
    b: 0.017082631 * r + 0.072397485 * g + 0.910519884 * b,
  };
}

function linearSrgbToA98(r: number, g: number, b: number): LinearRGB {
  return {
    r: 0.715518608 * r + 0.284481392 * g + 0 * b,
    g: 0 * r + 1 * g + 0 * b,
    b: 0 * r + 0.041155579 * g + 0.958844421 * b,
  };
}

function linearSrgbToProphoto(r: number, g: number, b: number): LinearRGB {
  return {
    r: 0.529317522 * r + 0.330510573 * g + 0.140171903 * b,
    g: 0.098368477 * r + 0.873656035 * g + 0.027975487 * b,
    b: 0.01687514 * r + 0.117659373 * g + 0.86546549 * b,
  };
}

function linearSrgbToRec2020(r: number, g: number, b: number): LinearRGB {
  return {
    r: 0.627403896 * r + 0.329283175 * g + 0.043312929 * b,
    g: 0.069097289 * r + 0.919540395 * g + 0.011362316 * b,
    b: 0.016391439 * r + 0.088013308 * g + 0.895595253 * b,
  };
}

interface XYZ {
  X: number;
  Y: number;
  Z: number;
}

function linearSrgbToXyzD65(r: number, g: number, b: number): XYZ {
  return {
    X: 0.412390799 * r + 0.357584339 * g + 0.180480788 * b,
    Y: 0.212639006 * r + 0.715168679 * g + 0.072192315 * b,
    Z: 0.019330819 * r + 0.11919478 * g + 0.950532152 * b,
  };
}

function xyzD65ToD50(X: number, Y: number, Z: number): XYZ {
  // Bradford chromatic adaptation (W3C reference).
  return {
    X: 1.0479298 * X + 0.0229017 * Y - 0.050127 * Z,
    Y: 0.0296946 * X + 0.9904844 * Y - 0.0170491 * Z,
    Z: -0.0092348 * X + 0.0150435 * Y + 0.7521331 * Z,
  };
}

function linearSrgbToXyzD50(r: number, g: number, b: number): XYZ {
  const xyz65 = linearSrgbToXyzD65(r, g, b);
  return xyzD65ToD50(xyz65.X, xyz65.Y, xyz65.Z);
}

/** Inverse of `srgbGamma` (decode): linear-light → display-encoded.
 * Preserves sign so out-of-gamut wide-space inputs round-trip through
 * `color-mix` without clipping to a positive-only branch. */
function srgbGammaEncode(v: number): number {
  const a = Math.abs(v);
  const s = v < 0 ? -1 : 1;
  return s * (a <= 0.0031308 ? a * 12.92 : 1.055 * Math.pow(a, 1 / 2.4) - 0.055);
}

/** Inverse of `a98Gamma`: 1 / (256/563) = 563/256 exponent. */
function a98GammaEncode(v: number): number {
  const a = Math.abs(v);
  const s = v < 0 ? -1 : 1;
  return s * Math.pow(a, 256 / 563);
}

/** Inverse of `prophotoGamma`: 1.8 → 1/1.8 with a linear segment. */
function prophotoGammaEncode(v: number): number {
  const a = Math.abs(v);
  const s = v < 0 ? -1 : 1;
  return s * (a <= 1 / 512 ? a * 16 : Math.pow(a, 1 / 1.8));
}

/** Inverse of `rec2020Gamma`: ITU-R BT.2020 OETF. */
function rec2020GammaEncode(v: number): number {
  const a = Math.abs(v);
  const s = v < 0 ? -1 : 1;
  const alpha = 1.09929682680944;
  const beta = 0.018053968510807;
  return s * (a < beta ? a * 4.5 : alpha * Math.pow(a, 0.45) - (alpha - 1));
}

/** Read the (h, s|w, l|b, alpha) channels of hsl()/hwb() function tokens.
 * Hue accepts bare number (deg) or Angle units; saturation/lightness or
 * whiteness/blackness accept percent or bare number 0..100. Accepts both
 * modern slash-form (`h s l / a`) and legacy comma-form (`h, s, l, a`). */
function readHsParts(tok: Token): [number, number, number, number] | null {
  const args = tokenizeFunctionArgs(tok);
  let h: number | null = null;
  const sb: number[] = [];
  let alpha = 1;
  let sawSlash = false;
  let startIdx = 0;
  let relative = false;

  // Relative HSL / HWB syntax (`hsl(from <color> h s l)` /
  // `hwb(from <color> h w b)`). The keyword space keys off the outer fn
  // name. Detection is unconditional: `from` is unreachable in valid
  // absolute hsl()/hwb().
  const fnName = tok.name === 'hwb' ? 'hwb' : 'hsl';
  const from = parseRelativeFrom(args, 0, tok.name || fnName);
  if (from !== null) {
    if ('sentinelBail' in from) return null;
    const bindings = rgbToTargetBindings(from.rgb, fnName);
    substituteRelativeBindings(args, from.consumed, RELATIVE_CHANNEL_KEYWORDS[fnName], bindings);
    // Omitted alpha defaults to the origin's alpha (not 100%).
    alpha = bindings[3];
    startIdx = from.consumed;
    relative = true;
  }

  for (let i = startIdx; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) {
      // Relative HSL / HWB syntax is only valid in the non-legacy
      // (space-separated) form; commas bail.
      if (relative) return null;
      continue;
    }
    if (t.kind === TokenKind.Slash) {
      sawSlash = true;
      continue;
    }
    // Alpha mode: after a slash (modern) or after h + 2 channels are
    // filled (legacy `hsla(h, s, l, a)` / `hwb(h, w, b, a)`).
    const inAlpha = sawSlash || (h !== null && sb.length === 2);
    if (t.kind === TokenKind.Number) {
      const v = t.value!;
      if (inAlpha) alpha = v;
      else if (h === null) h = v;
      else sb.push(v);
    } else if (t.kind === TokenKind.Angle) {
      if (h !== null) return null;
      h = angleToDeg(t.value!, t.unit);
    } else if (t.kind === TokenKind.Percent) {
      const v = t.value!;
      if (inAlpha) alpha = v / 100;
      else if (h === null) return null;
      else sb.push(v);
    } else if (t.kind === TokenKind.Ident && t.name === 'none') {
      // `none` ⇒ missing channel, encoded as NaN. Standalone parsers collapse
      // it to 0; color-mix carries the channel forward from the other operand.
      if (inAlpha) alpha = NaN;
      else if (h === null) h = NaN;
      else sb.push(NaN);
    } else if (t.kind === TokenKind.Function) {
      // Static math fn in a channel slot. Enables `calc()` in absolute
      // hsl()/hwb() as well as the relative form (after the keyword
      // pre-pass replaced bound keywords with numbers).
      const numeric = resolveStaticMathFunction(t, true);
      if (numeric === null) return null;
      if (numeric.unit === '') {
        // Bare number: hue (degrees) for the h slot, 0..100 for s/l/w/b,
        // 0..1 for alpha.
        if (inAlpha) alpha = numeric.value;
        else if (h === null) h = numeric.value;
        else sb.push(numeric.value);
      } else if (numeric.unit === '%') {
        if (inAlpha) alpha = numeric.value / 100;
        // Percent is invalid for the hue slot.
        else if (h === null) return null;
        else sb.push(numeric.value);
      } else if (numeric.unit === 'deg') {
        // An angle only makes sense for the hue slot.
        if (inAlpha || h !== null) return null;
        h = numeric.value;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  if (h === null || sb.length !== 2) return null;
  // Don't normalize NaN hue; preserve the missing flag through downstream
  // logic. Numeric hues wrap into 0..360.
  const hNorm = Number.isNaN(h) ? NaN : ((h % 360) + 360) % 360;
  return [hNorm, sb[0], sb[1], Math.max(0, Math.min(1, alpha))];
}

function angleToDeg(value: number, unit: string | undefined): number {
  if (unit === 'deg' || unit === '' || unit === undefined) return value;
  if (unit === 'rad') return (value * 180) / Math.PI;
  if (unit === 'grad') return value * 0.9;
  if (unit === 'turn') return value * 360;
  return NaN;
}

function hslToRgb(h: number, sPct: number, lPct: number): { r: number; g: number; b: number } {
  const s = Math.max(0, Math.min(1, sPct / 100));
  const l = Math.max(0, Math.min(1, lPct / 100));
  if (s === 0) return { r: l, g: l, b: l };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hN = h / 360;
  return {
    r: hue2rgb(p, q, hN + 1 / 3),
    g: hue2rgb(p, q, hN),
    b: hue2rgb(p, q, hN - 1 / 3),
  };
}

function hue2rgb(p: number, q: number, t: number): number {
  let tn = t;
  if (tn < 0) tn += 1;
  if (tn > 1) tn -= 1;
  if (tn < 1 / 6) return p + (q - p) * 6 * tn;
  if (tn < 1 / 2) return q;
  if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
  return p;
}

function hwbToRgb(h: number, wPct: number, bPct: number): { r: number; g: number; b: number } {
  let w = Math.max(0, Math.min(1, wPct / 100));
  let bl = Math.max(0, Math.min(1, bPct / 100));
  if (w + bl >= 1) {
    const g = w / (w + bl);
    return { r: g, g, b: g };
  }
  // hue at full saturation, lightness 0.5
  const hue = hslToRgb(h, 100, 50);
  return {
    r: hue.r * (1 - w - bl) + w,
    g: hue.g * (1 - w - bl) + w,
    b: hue.b * (1 - w - bl) + w,
  };
}

/** sRGB 0..1 → HSL components (h in deg, s/l in 0..100 percent). */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}

/** sRGB 0..1 → HWB components (h in deg, w/b in 0..100 percent). */
function rgbToHwb(r: number, g: number, b: number): [number, number, number] {
  const [h] = rgbToHsl(r, g, b);
  const w = Math.min(r, g, b) * 100;
  const bl = (1 - Math.max(r, g, b)) * 100;
  return [h, w, bl];
}

/**
 * A cylindrical sRGB-family triple: HSL (h, s, l) or HWB (h, w, b).
 * Both share the polar `h` axis plus two cartesian percent channels;
 * mixing logic is identical, only the conversion to sRGB at the end
 * differs.
 */
interface HsTriple {
  h: number;
  s: number;
  l: number;
  alpha: number;
}

/** Mix two HSL/HWB triples with premultiplied alpha. Hue is powerless when HSL
 *  saturation is 0% or at the L extremes (HWB: when w+b ≥ 100%); a powerless
 *  operand's hue carries from the other side. */
function mixHs(
  A: HsTriple,
  B: HsTriple,
  wA: number,
  wB: number,
  hue: HueMethod,
  isHsl: boolean
): HsTriple {
  const [Ah0, Bh0] = carryPair(A.h, B.h);
  const [As, Bs] = carryPair(A.s, B.s);
  const [Al, Bl] = carryPair(A.l, B.l);
  const [Aalpha, Balpha] = carryPair(A.alpha, B.alpha);
  const Apower = isHsPowerless(As, Al, isHsl);
  const Bpower = isHsPowerless(Bs, Bl, isHsl);
  const Ah = Apower ? (Bpower ? 0 : Bh0) : Ah0;
  const Bh = Bpower ? (Apower ? 0 : Ah0) : Bh0;
  const [hA, hB] = adjustHueArc(Ah, Bh, hue);
  const h = hA + (hB - hA) * wB;
  const alpha = Aalpha * wA + Balpha * wB;
  if (alpha === 0) {
    return { h, s: As * wA + Bs * wB, l: Al * wA + Bl * wB, alpha: 0 };
  }
  const wAp = Aalpha * wA;
  const wBp = Balpha * wB;
  const norm = 1 / alpha;
  return {
    h,
    s: (As * wAp + Bs * wBp) * norm,
    l: (Al * wAp + Bl * wBp) * norm,
    alpha,
  };
}

function isHsPowerless(s: number, l: number, isHsl: boolean): boolean {
  if (isHsl) {
    return s < HS_POWERLESS_EPS || l < HS_POWERLESS_EPS || l > 100 - HS_POWERLESS_EPS;
  }
  // HWB stores whiteness in `s` and blackness in `l`.
  return s + l >= 100 - HS_POWERLESS_EPS;
}

/**
 * Return an HSL or HWB triple for an operand, preferring a native parse
 * (when the operand is `hsl()` / `hwb()`) over an sRGB-roundtrip parse.
 * Saturation/lightness round-trip through sRGB is lossless, but
 * preserving native channels keeps NaN-channel handling explicit if it
 * becomes a need.
 */
function hsFromRGBForMix(opTokens: Token[], rgb: RGB, isHsl: boolean): HsTriple {
  const func = findFunctionToken(opTokens);
  if (func !== null) {
    const name = func.name;
    if (isHsl && (name === 'hsl' || name === 'hsla')) {
      const channels = readHsParts(func);
      if (channels !== null) {
        const [h, s, l, alpha] = channels;
        return { h, s, l, alpha };
      }
    } else if (!isHsl && name === 'hwb') {
      const channels = readHsParts(func);
      if (channels !== null) {
        const [h, w, b, alpha] = channels;
        return { h, s: w, l: b, alpha };
      }
    }
  }
  // Non-matching operand or non-function input: derive from sRGB.
  if (isHsl) {
    const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { h, s, l, alpha: rgb.a };
  }
  const [h, w, b] = rgbToHwb(rgb.r, rgb.g, rgb.b);
  return { h, s: w, l: b, alpha: rgb.a };
}

function labToRgb(L: number, a: number, b: number, alpha: number): RGB {
  // CIE Lab → XYZ (D50) → linear sRGB
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const fx3 = fx * fx * fx;
  const fy3 = fy * fy * fy;
  const fz3 = fz * fz * fz;
  const e = 216 / 24389;
  const k = 24389 / 27;
  const xr = fx3 > e ? fx3 : (116 * fx - 16) / k;
  const yr = L > k * e ? fy3 : L / k;
  const zr = fz3 > e ? fz3 : (116 * fz - 16) / k;
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
  // Out of sRGB: re-derive an OKLab triple from the (out-of-gamut) linear-light
  // representation and route through the OKLCh bisection gamut mapper.
  // OKLCh is the cylindrical form for chroma-focused mapping to narrower gamuts.
  const ok = linearRgbToOklab(direct.r, direct.g, direct.b);
  return oklabToRgb(ok.L, ok.a, ok.b, alpha);
}

/**
 * Mixing `in oklab` / `in oklch` / `in lab` / `in lch` MUST do the math
 * in those spaces, not in linear-light sRGB; the user-facing guarantee
 * is perceptual interpolation.
 */
export interface LabTriple {
  L: number;
  a: number;
  b: number;
  alpha: number;
}

/** Polar form of a Lab-family color: (L, C, h, alpha). Preserved as native
 *  (rather than collapsed to (L, a, b)) for `oklch` / `lch` interpolation so
 *  missing-channel carry-forward operates on the user-visible chroma and hue. */
interface LchTriple {
  L: number;
  C: number;
  h: number;
  alpha: number;
}

/**
 * sRGB display-space → Oklab. Inputs are 0..1 channels; alpha passes through
 * unchanged. Exported alongside {@link oklabToRgb} for the animation runtime as
 * the conversion pair for the modern keyframe color interpolation space.
 */
export function srgbToOklab(r: number, g: number, b: number, alpha: number): LabTriple {
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

/** Rectangular RGB-family interpolation spaces. Per-channel lerp with NaN
 *  carry-forward, premultiplied alpha, then back through `colorSpaceToRgb`.
 *  `xyz` aliases `xyz-d65`. */
const RGB_LIKE_MIX_SPACES = new Set([
  'srgb',
  'srgb-linear',
  'display-p3',
  'display-p3-linear',
  'a98-rgb',
  'prophoto-rgb',
  'rec2020',
  'xyz',
  'xyz-d65',
  'xyz-d50',
]);
const SUPPORTED_MIX_SPACES = new Set([
  ...RGB_LIKE_MIX_SPACES,
  'oklab',
  'oklch',
  'lab',
  'lch',
  'hsl',
  'hwb',
]);

/**
 * Floor for "achromatic enough that hue is meaningless." CIE Lab + OkLab
 * white round-tripped through linear sRGB → XYZ D65 → D50 → Lab leaves
 * residual `a`, `b` near 0.025 from the Bradford matrix; an exact-0
 * check misses those and feeds atan2 noise through the polar arc.
 */
const LAB_POWERLESS_CHROMA = 0.1;
/** Floor for the second cylindrical channel of HSL (saturation) and the
 *  combined whiteness+blackness of HWB. Smaller than the Lab epsilon
 *  because these channels are 0..100 and float-clean. */
const HS_POWERLESS_EPS = 0.01;

/** Linear scan for the function operand in a color-mix slot. Slots are
 *  short (1-3 tokens: pct prefix + function); the loop is intentionally
 *  inlined rather than expanded to `find` so the lab/lch/hs operand
 *  extractors all share the same pattern without each carrying its own
 *  imperative scan. */
function findFunctionToken(tokens: Token[]): Token | null {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind === TokenKind.Function) return tokens[i];
  }
  return null;
}

/** Hue-interpolation method. Returns the adjusted `(hA, hB)` so the per-channel
 *  lerp `hA + (hB - hA) * wB` lands on the desired arc; shared by every polar
 *  mix path. */
function adjustHueArc(hA: number, hB: number, method: HueMethod): [number, number] {
  const dh = hB - hA;
  if (method === 'shorter') {
    if (dh > 180) return [hA + 360, hB];
    if (dh < -180) return [hA, hB + 360];
  } else if (method === 'longer') {
    if (dh > 0 && dh < 180) return [hA + 360, hB];
    if (dh > -180 && dh <= 0) return [hA, hB + 360];
  } else if (method === 'increasing') {
    if (hB < hA) return [hA, hB + 360];
  } else {
    if (hA < hB) return [hA + 360, hB];
  }
  return [hA, hB];
}

/** Missing-channel carry-forward. If one channel is NaN, return the other for
 *  both; if both are NaN, return (0, 0). Pure. */
function carryPair(a: number, b: number): [number, number] {
  const aNaN = Number.isNaN(a);
  const bNaN = Number.isNaN(b);
  if (aNaN && bNaN) return [0, 0];
  if (aNaN) return [b, b];
  if (bNaN) return [a, a];
  return [a, b];
}

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

/** Precomputed RGB tuples for {@link NAMED_TO_HEX}. The mix path consults
 *  this directly instead of re-parsing the hex string on every operand,
 *  which was profiled at ~13% of total polyfill time. RGB objects are
 *  read-only by convention; mix helpers always construct new RGBs. */
const NAMED_TO_RGB: Record<string, RGB> = (() => {
  const out: Record<string, RGB> = {};
  for (const k in NAMED_TO_HEX) out[k] = parseHex(NAMED_TO_HEX[k]);
  return out;
})();

type HueMethod = 'shorter' | 'longer' | 'increasing' | 'decreasing';

/**
 * A native triple in any RGB-family rectangular interpolation space. For srgb /
 * display-p3 / a98-rgb / prophoto-rgb / rec2020 the channels are display-encoded;
 * for *-linear and xyz / xyz-d50 they're linear-light. `none` channels propagate
 * as NaN so the carry-forward pass keeps source-space identity through the mix.
 */
interface RgbSpaceTriple {
  c1: number;
  c2: number;
  c3: number;
  alpha: number;
}

/**
 * Read a `color(<space> c1 c2 c3 [/ a])` function preserving NaN for
 * `none` channels and leaving alpha unclamped. `parseColorFn` wraps
 * this with `usedValue` + alpha clamp + space conversion; the mix paths
 * consume raw channels so carry-forward sees the missing-component flag (NaN)
 * intact. Returns null on unknown space or malformed channel count.
 */
function readColorFn(
  tok: Token
): { space: string; c1: number; c2: number; c3: number; alpha: number } | null {
  const args = tokenizeFunctionArgs(tok);
  let space: string | null = null;
  const vals: number[] = [];
  let alpha = 1;
  let sawSlash = false;
  let startIdx = 0;
  let relative = false;
  let relativeRgb: RGB | null = null;

  // Relative color() syntax: `color(from <origin> <space> ...)`. The
  // `from` prefix precedes the colorspace ident. Detect + resolve the
  // origin here; the per-space binding substitution happens once the
  // space ident is read in the loop (the keyword set depends on it).
  const from = parseRelativeFrom(args, 0, tok.name || 'color');
  if (from !== null) {
    if ('sentinelBail' in from) return null;
    relativeRgb = from.rgb;
    startIdx = from.consumed;
    relative = true;
    // Omitted alpha defaults to the origin's alpha (not 100%).
    alpha = from.rgb.a;
  }

  for (let i = startIdx; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) return null;
    if (t.kind === TokenKind.Slash) {
      sawSlash = true;
      continue;
    }
    if (space === null) {
      if (t.kind !== TokenKind.Ident) return null;
      space = t.name || null;
      if (relative) {
        if (space === null) return null;
        const keywords = colorFnChannelKeywords(space);
        if (keywords === null) return null;
        // Origin RGB → the chosen space's native channel encoding.
        const lin = {
          r: srgbToLinear(relativeRgb!.r),
          g: srgbToLinear(relativeRgb!.g),
          b: srgbToLinear(relativeRgb!.b),
        };
        const native = linearSrgbToSpaceNative(lin.r, lin.g, lin.b, relativeRgb!.a, space);
        if (native === null) return null;
        const bindings: [number, number, number, number] = [
          native.c1,
          native.c2,
          native.c3,
          native.alpha,
        ];
        substituteRelativeBindings(args, i + 1, keywords, bindings);
      }
      continue;
    }
    if (t.kind === TokenKind.Number) {
      if (sawSlash) alpha = t.value!;
      else vals.push(t.value!);
    } else if (t.kind === TokenKind.Percent) {
      if (sawSlash) alpha = t.value! / 100;
      else vals.push(t.value! / 100);
    } else if (t.kind === TokenKind.Ident && t.name === 'none') {
      if (sawSlash) alpha = NaN;
      else vals.push(NaN);
    } else if (t.kind === TokenKind.Function) {
      const numeric = resolveStaticMathFunction(t, true);
      if (numeric === null) return null;
      if (numeric.unit === '') {
        if (sawSlash) alpha = numeric.value;
        else vals.push(numeric.value);
      } else if (numeric.unit === '%') {
        if (sawSlash) alpha = numeric.value / 100;
        else vals.push(numeric.value / 100);
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  if (space === null || vals.length !== 3) return null;
  return { space, c1: vals[0], c2: vals[1], c3: vals[2], alpha };
}

/** Read rgb()/rgba() channels preserving NaN for `none` and leaving alpha
 *  unclamped. Number-form channels are 0..255, percent-form 0..1; alpha is 0..1
 *  in both forms. Comma- and slash-form both accepted. `parseRgbFn` wraps this
 *  with `usedValue` + clamp; the mix path uses raw output to preserve NaN. */
function readRgbFn(tok: Token): [number, number, number, number] | null {
  const args = tokenizeFunctionArgs(tok);
  const channels: number[] = [];
  let alpha = 1;
  let sawSlash = false;
  let startIdx = 0;
  let relative = false;

  // Relative sRGB syntax (`rgb(from <color> r g b)`). Detection is
  // unconditional: `from` is unreachable in valid absolute rgb().
  const from = parseRelativeFrom(args, 0, tok.name || 'rgb');
  if (from !== null) {
    if ('sentinelBail' in from) return null;
    const bindings = rgbToTargetBindings(from.rgb, 'rgb');
    substituteRelativeBindings(args, from.consumed, RELATIVE_CHANNEL_KEYWORDS.rgb, bindings);
    // Omitted alpha defaults to the origin's alpha (not 100%).
    alpha = bindings[3];
    startIdx = from.consumed;
    relative = true;
  }

  for (let i = startIdx; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) {
      // "Relative sRGB color syntax is only applicable to the non-legacy
      // RGB syntactic forms"; commas are invalid inside the relative form.
      if (relative) return null;
      continue;
    }
    if (t.kind === TokenKind.Slash) {
      sawSlash = true;
      continue;
    }
    const inAlpha = sawSlash || channels.length === 3;
    if (t.kind === TokenKind.Number) {
      if (inAlpha) alpha = t.value!;
      else channels.push(t.value! / 255);
    } else if (t.kind === TokenKind.Percent) {
      if (inAlpha) alpha = t.value! / 100;
      else channels.push(t.value! / 100);
    } else if (t.kind === TokenKind.Ident && t.name === 'none') {
      if (inAlpha) alpha = NaN;
      else channels.push(NaN);
    } else if (t.kind === TokenKind.Function) {
      // Static math fn (`calc(infinity)` / `calc(NaN)` / `calc(50% * 2)`).
      const numeric = resolveStaticMathFunction(t, true);
      if (numeric === null) return null;
      if (numeric.unit === '') {
        if (inAlpha) alpha = numeric.value;
        else channels.push(numeric.value / 255);
      } else if (numeric.unit === '%') {
        if (inAlpha) alpha = numeric.value / 100;
        else channels.push(numeric.value / 100);
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  if (channels.length !== 3) return null;
  return [channels[0], channels[1], channels[2], alpha];
}

/**
 * Color-fn channels (already NaN-preserved from `readColorFn`) →
 * linear sRGB. Mirrors `colorSpaceToRgb` but stops at the linear-sRGB
 * intermediate (no gamut mapping, no clipping). NaN channels propagate
 * unchanged through the gamma decode + matrix multiply.
 */
function colorChannelsToLinearSrgb(
  space: string,
  c1: number,
  c2: number,
  c3: number
): LinearRGB | null {
  // For a NaN channel, the matrix dot product produces NaN; we collapse
  // to 0 only AFTER mixing has carried the value forward against the
  // peer operand. Until then, NaN must survive.
  switch (space) {
    case 'srgb':
      return {
        r: Number.isNaN(c1) ? NaN : srgbGamma(c1),
        g: Number.isNaN(c2) ? NaN : srgbGamma(c2),
        b: Number.isNaN(c3) ? NaN : srgbGamma(c3),
      };
    case 'srgb-linear':
      return { r: c1, g: c2, b: c3 };
    case 'display-p3':
      return displayP3ToLinearSrgb(
        Number.isNaN(c1) ? NaN : srgbGamma(c1),
        Number.isNaN(c2) ? NaN : srgbGamma(c2),
        Number.isNaN(c3) ? NaN : srgbGamma(c3)
      );
    case 'display-p3-linear':
      return displayP3ToLinearSrgb(c1, c2, c3);
    case 'a98-rgb':
      return a98ToLinearSrgb(
        Number.isNaN(c1) ? NaN : a98Gamma(c1),
        Number.isNaN(c2) ? NaN : a98Gamma(c2),
        Number.isNaN(c3) ? NaN : a98Gamma(c3)
      );
    case 'prophoto-rgb':
      return prophotoToLinearSrgb(
        Number.isNaN(c1) ? NaN : prophotoGamma(c1),
        Number.isNaN(c2) ? NaN : prophotoGamma(c2),
        Number.isNaN(c3) ? NaN : prophotoGamma(c3)
      );
    case 'rec2020':
      return rec2020ToLinearSrgb(
        Number.isNaN(c1) ? NaN : rec2020Gamma(c1),
        Number.isNaN(c2) ? NaN : rec2020Gamma(c2),
        Number.isNaN(c3) ? NaN : rec2020Gamma(c3)
      );
    case 'xyz':
    case 'xyz-d65':
      return xyzD65ToLinearSrgb(c1, c2, c3);
    case 'xyz-d50':
      return xyzD50ToLinearSrgb(c1, c2, c3);
    default:
      return null;
  }
}

/**
 * Linear sRGB triple → target space's NATIVE encoding (the form
 * `color(<space> ...)` expects). Used to project an operand from
 * linear sRGB into the interpolation space when source and target
 * differ.
 */
function linearSrgbToSpaceNative(
  r: number,
  g: number,
  b: number,
  alpha: number,
  targetSpace: string
): RgbSpaceTriple | null {
  switch (targetSpace) {
    case 'srgb':
      return {
        c1: Number.isNaN(r) ? NaN : srgbGammaEncode(r),
        c2: Number.isNaN(g) ? NaN : srgbGammaEncode(g),
        c3: Number.isNaN(b) ? NaN : srgbGammaEncode(b),
        alpha,
      };
    case 'srgb-linear':
      return { c1: r, c2: g, c3: b, alpha };
    case 'display-p3': {
      const lin = linearSrgbToDisplayP3(r, g, b);
      return {
        c1: Number.isNaN(lin.r) ? NaN : srgbGammaEncode(lin.r),
        c2: Number.isNaN(lin.g) ? NaN : srgbGammaEncode(lin.g),
        c3: Number.isNaN(lin.b) ? NaN : srgbGammaEncode(lin.b),
        alpha,
      };
    }
    case 'display-p3-linear': {
      const lin = linearSrgbToDisplayP3(r, g, b);
      return { c1: lin.r, c2: lin.g, c3: lin.b, alpha };
    }
    case 'a98-rgb': {
      const lin = linearSrgbToA98(r, g, b);
      return {
        c1: Number.isNaN(lin.r) ? NaN : a98GammaEncode(lin.r),
        c2: Number.isNaN(lin.g) ? NaN : a98GammaEncode(lin.g),
        c3: Number.isNaN(lin.b) ? NaN : a98GammaEncode(lin.b),
        alpha,
      };
    }
    case 'prophoto-rgb': {
      const lin = linearSrgbToProphoto(r, g, b);
      return {
        c1: Number.isNaN(lin.r) ? NaN : prophotoGammaEncode(lin.r),
        c2: Number.isNaN(lin.g) ? NaN : prophotoGammaEncode(lin.g),
        c3: Number.isNaN(lin.b) ? NaN : prophotoGammaEncode(lin.b),
        alpha,
      };
    }
    case 'rec2020': {
      const lin = linearSrgbToRec2020(r, g, b);
      return {
        c1: Number.isNaN(lin.r) ? NaN : rec2020GammaEncode(lin.r),
        c2: Number.isNaN(lin.g) ? NaN : rec2020GammaEncode(lin.g),
        c3: Number.isNaN(lin.b) ? NaN : rec2020GammaEncode(lin.b),
        alpha,
      };
    }
    case 'xyz':
    case 'xyz-d65': {
      const xyz = linearSrgbToXyzD65(r, g, b);
      return { c1: xyz.X, c2: xyz.Y, c3: xyz.Z, alpha };
    }
    case 'xyz-d50': {
      const xyz = linearSrgbToXyzD50(r, g, b);
      return { c1: xyz.X, c2: xyz.Y, c3: xyz.Z, alpha };
    }
    default:
      return null;
  }
}

/**
 * Get an operand's channels in `targetSpace`'s native encoding,
 * preserving NaN through every fast-path possible:
 *   1. `color(<targetSpace> …)` operand → read native channels.
 *   2. Cross-space `color()` operand → linear-sRGB pivot, then encode.
 *   3. Display-sRGB operand (hex / named / rgb() / hsl() / …) with
 *      `targetSpace = 'srgb'` → return RGB as-is (no gamma round-trip,
 *      since display sRGB already IS the `srgb` interpolation encoding).
 *   4. Display-sRGB operand with any other target → gamma-decode once,
 *      pivot, re-encode.
 *
 * `rgb()` operands with `none` channels preserve their NaN through paths 3 and
 * 4; other display-sRGB sources (hex / hsl / oklab / …) have already collapsed
 * `none` to 0 by the time the parsed `RGB` reaches us.
 */
function rgbSpaceTripleFromOperand(
  opTokens: Token[],
  rgb: RGB,
  targetSpace: string
): RgbSpaceTriple {
  const func = findFunctionToken(opTokens);
  if (func !== null && func.name === 'color') {
    const native = readColorFn(func);
    if (native !== null) {
      const sameSpace =
        native.space === targetSpace ||
        (native.space === 'xyz' && targetSpace === 'xyz-d65') ||
        (native.space === 'xyz-d65' && targetSpace === 'xyz');
      if (sameSpace) {
        return { c1: native.c1, c2: native.c2, c3: native.c3, alpha: native.alpha };
      }
      const lin = colorChannelsToLinearSrgb(native.space, native.c1, native.c2, native.c3);
      if (lin !== null) {
        const out = linearSrgbToSpaceNative(lin.r, lin.g, lin.b, native.alpha, targetSpace);
        if (out !== null) return out;
      }
    }
  }
  // For `rgb()` / `rgba()` operands, read the parsed channels so NaN
  // survives the `srgb` shortcut and the cross-space gamma decode.
  const rgbFnChannels =
    func !== null && (func.name === 'rgb' || func.name === 'rgba') ? readRgbFn(func) : null;
  if (targetSpace === 'srgb') {
    // sRGB IS the display encoding; skip the gamma round-trip.
    return rgbFnChannels !== null
      ? {
          c1: rgbFnChannels[0],
          c2: rgbFnChannels[1],
          c3: rgbFnChannels[2],
          alpha: rgbFnChannels[3],
        }
      : { c1: rgb.r, c2: rgb.g, c3: rgb.b, alpha: rgb.a };
  }
  // Pivot through linear sRGB. Preserve NaN through the gamma decode
  // for `rgb()` operands; other display-sRGB sources have already
  // collapsed `none` to 0.
  const r = rgbFnChannels !== null ? rgbFnChannels[0] : rgb.r;
  const g = rgbFnChannels !== null ? rgbFnChannels[1] : rgb.g;
  const b = rgbFnChannels !== null ? rgbFnChannels[2] : rgb.b;
  const alpha = rgbFnChannels !== null ? rgbFnChannels[3] : rgb.a;
  const linR = Number.isNaN(r) ? NaN : srgbGamma(r);
  const linG = Number.isNaN(g) ? NaN : srgbGamma(g);
  const linB = Number.isNaN(b) ? NaN : srgbGamma(b);
  const out = linearSrgbToSpaceNative(linR, linG, linB, alpha, targetSpace);
  if (out !== null) return out;
  // `targetSpace` always lives in RGB_LIKE_MIX_SPACES (parseColorMix
  // dispatches on it before calling here), so `linearSrgbToSpaceNative`
  // returning null would be a programmer error in the dispatcher.
  throw new Error(`rgbSpaceTripleFromOperand: unsupported target space "${targetSpace}"`);
}

/**
 * Per-channel rectangular mix with NaN carry-forward, premultiplied alpha, and
 * `transparent` substitution. Mirrors `mixLab` / `mixHs`; no polar axis.
 */
function mixRgbSpace(A: RgbSpaceTriple, B: RgbSpaceTriple, wA: number, wB: number): RgbSpaceTriple {
  let [Ac1, Bc1] = carryPair(A.c1, B.c1);
  let [Ac2, Bc2] = carryPair(A.c2, B.c2);
  let [Ac3, Bc3] = carryPair(A.c3, B.c3);
  const [Aalpha, Balpha] = carryPair(A.alpha, B.alpha);
  // `transparent` (0,0,0,0) substitutes its rectangular channels with the peer.
  if (isRgbAlphaZero(Ac1, Ac2, Ac3, Aalpha) && !isRgbAlphaZero(Bc1, Bc2, Bc3, Balpha)) {
    Ac1 = Bc1;
    Ac2 = Bc2;
    Ac3 = Bc3;
  } else if (isRgbAlphaZero(Bc1, Bc2, Bc3, Balpha) && !isRgbAlphaZero(Ac1, Ac2, Ac3, Aalpha)) {
    Bc1 = Ac1;
    Bc2 = Ac2;
    Bc3 = Ac3;
  }
  const alpha = Aalpha * wA + Balpha * wB;
  if (alpha === 0) {
    return {
      c1: Ac1 * wA + Bc1 * wB,
      c2: Ac2 * wA + Bc2 * wB,
      c3: Ac3 * wA + Bc3 * wB,
      alpha: 0,
    };
  }
  const wAp = Aalpha * wA;
  const wBp = Balpha * wB;
  const norm = 1 / alpha;
  return {
    c1: (Ac1 * wAp + Bc1 * wBp) * norm,
    c2: (Ac2 * wAp + Bc2 * wBp) * norm,
    c3: (Ac3 * wAp + Bc3 * wBp) * norm,
    alpha,
  };
}

function isRgbAlphaZero(c1: number, c2: number, c3: number, alpha: number): boolean {
  return alpha === 0 && Math.abs(c1) < 1e-3 && Math.abs(c2) < 1e-3 && Math.abs(c3) < 1e-3;
}

function parseColorMix(tok: Token): RGB | null {
  const args = tokenizeFunctionArgs(tok);

  // Split top-level commas. A `<color-interpolation-method>` token
  // group, when present, is the first comma-separated entry. The
  // remaining entries are color+percentage pairs (1+).
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
  if (parts.length === 0) return null;

  // Detect optional interpolation-method prefix `in <colorspace> [<hue-method>
  // hue]?`. Default is `oklab` when the prefix is omitted entirely.
  let space = 'oklab';
  let hueMethod: HueMethod = 'shorter';
  let colorParts = parts;
  if (parts[0].length > 0 && parts[0][0].kind === TokenKind.Ident && parts[0][0].name === 'in') {
    const head = parts[0];
    if (head.length < 2) return null;
    if (head[1].kind !== TokenKind.Ident) return null;
    const sp = head[1].name!;
    if (!SUPPORTED_MIX_SPACES.has(sp)) return null;
    space = sp;
    if (head.length === 4) {
      // `<hue-method> hue` form. Only meaningful for cylindrical spaces;
      // rectangular spaces accept and silently ignore the method.
      if (head[2].kind !== TokenKind.Ident) return null;
      if (head[3].kind !== TokenKind.Ident || head[3].name !== 'hue') return null;
      const m = head[2].name!;
      if (m !== 'shorter' && m !== 'longer' && m !== 'increasing' && m !== 'decreasing') {
        return null;
      }
      hueMethod = m;
    } else if (head.length !== 2) {
      return null;
    }
    colorParts = parts.slice(1);
  }
  if (colorParts.length === 0) return null;

  // Parse each color slot.
  type Item = { color: RGB; pct: number | null };
  const items: Item[] = [];
  for (let i = 0; i < colorParts.length; i++) {
    const [c, p] = parseColorPct(colorParts[i]);
    if (c === null) return null;
    if (p !== null && p < 0) return null; // negative % is disallowed
    // Clamp percentages > 100.
    items.push({ color: c, pct: p === null ? null : Math.min(p, 100) });
  }

  // color-mix uses non-forced normalization: sums > 100 still scale, sums < 100
  // leave a leftover that drives alpha.
  let specifiedSum = 0;
  let omittedCount = 0;
  for (const it of items) {
    if (it.pct === null) omittedCount++;
    else specifiedSum += it.pct;
  }
  if (specifiedSum > 100) specifiedSum = 100;
  if (omittedCount > 0) {
    const share = (100 - specifiedSum) / omittedCount;
    for (const it of items) if (it.pct === null) it.pct = share;
  }
  let total = 0;
  for (const it of items) total += it.pct!;
  if (total > 100) {
    const f = 100 / total;
    for (const it of items) it.pct = it.pct! * f;
    total = 100;
  }
  const leftover = total < 100 ? 100 - total : 0;

  // Leftover at 100% means transparent black, which round-trips to {0,0,0,0}
  // in display sRGB from every supported interpolation space.
  if (leftover === 100) return { r: 0, g: 0, b: 0, a: 0 };
  const alphaMult = 1 - leftover / 100;

  // Rectangular Lab-family (lab / oklab): mix in native (L, a, b) so
  // out-of-gamut operands don't lose chroma through an sRGB round-trip.
  if (space === 'lab' || space === 'oklab') {
    const useOklab = space === 'oklab';
    const triples: { triple: LabTriple; pct: number | null }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const native = labFromRGBForMix(colorParts[i], it.color, useOklab);
      triples.push({ triple: native, pct: it.pct });
    }
    if (triples.length === 1) {
      const t = triples[0].triple;
      const rgb = useOklab ? oklabToRgb(t.L, t.a, t.b, t.alpha) : labToRgb(t.L, t.a, t.b, t.alpha);
      return { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a * alphaMult };
    }
    const stack = triples.slice().reverse();
    while (stack.length >= 2) {
      const a = stack.pop()!;
      const b = stack.pop()!;
      const sum = a.pct! + b.pct!;
      const wA = sum === 0 ? 0.5 : a.pct! / sum;
      const wB = sum === 0 ? 0.5 : b.pct! / sum;
      const mixed = mixLab(a.triple, b.triple, wA, wB);
      stack.push({ triple: mixed, pct: sum });
    }
    const t = stack[0].triple;
    const rgb = useOklab ? oklabToRgb(t.L, t.a, t.b, t.alpha) : labToRgb(t.L, t.a, t.b, t.alpha);
    return { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a * alphaMult };
  }

  // Polar Lab-family (lch / oklch): preserve (L, C, h) natively so a
  // missing chroma or hue carries forward from the other operand
  // against the source channels rather than the derived (a, b) form.
  if (space === 'lch' || space === 'oklch') {
    const useOklch = space === 'oklch';
    const triples: { triple: LchTriple; pct: number | null }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const native = lchFromRGBForMix(colorParts[i], it.color, useOklch);
      triples.push({ triple: native, pct: it.pct });
    }
    if (triples.length === 1) {
      const t = triples[0].triple;
      const rgb = lchToRgb(t, useOklch);
      return { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a * alphaMult };
    }
    const stack = triples.slice().reverse();
    while (stack.length >= 2) {
      const a = stack.pop()!;
      const b = stack.pop()!;
      const sum = a.pct! + b.pct!;
      const wA = sum === 0 ? 0.5 : a.pct! / sum;
      const wB = sum === 0 ? 0.5 : b.pct! / sum;
      const mixed = mixLch(a.triple, b.triple, wA, wB, hueMethod);
      stack.push({ triple: mixed, pct: sum });
    }
    const t = stack[0].triple;
    const rgb = lchToRgb(t, useOklch);
    return { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a * alphaMult };
  }

  // Cylindrical sRGB-family spaces (hsl / hwb): same polar shape as
  // Lab-family but the cartesian channels are saturation/lightness or
  // whiteness/blackness rather than Lab a/b.
  if (space === 'hsl' || space === 'hwb') {
    const triples: { triple: HsTriple; pct: number | null }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const native = hsFromRGBForMix(colorParts[i], it.color, space === 'hsl');
      triples.push({ triple: native, pct: it.pct });
    }
    if (triples.length === 1) {
      const t = triples[0].triple;
      const rgb = space === 'hsl' ? hslToRgb(t.h, t.s, t.l) : hwbToRgb(t.h, t.s, t.l);
      return { r: rgb.r, g: rgb.g, b: rgb.b, a: t.alpha * alphaMult };
    }
    const stack = triples.slice().reverse();
    while (stack.length >= 2) {
      const a = stack.pop()!;
      const b = stack.pop()!;
      const sum = a.pct! + b.pct!;
      const wA = sum === 0 ? 0.5 : a.pct! / sum;
      const wB = sum === 0 ? 0.5 : b.pct! / sum;
      const mixed = mixHs(a.triple, b.triple, wA, wB, hueMethod, space === 'hsl');
      stack.push({ triple: mixed, pct: sum });
    }
    const t = stack[0].triple;
    const rgb = space === 'hsl' ? hslToRgb(t.h, t.s, t.l) : hwbToRgb(t.h, t.s, t.l);
    return { r: rgb.r, g: rgb.g, b: rgb.b, a: t.alpha * alphaMult };
  }

  // Rectangular RGB-family (srgb / srgb-linear / display-p3 (+linear) /
  // a98-rgb / prophoto-rgb / rec2020 / xyz / xyz-d65 / xyz-d50): mix in
  // the target space's native channels with NaN carry-forward, then
  // project back to display sRGB via `colorSpaceToRgb`.
  if (RGB_LIKE_MIX_SPACES.has(space)) {
    const triples: { triple: RgbSpaceTriple; pct: number | null }[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const native = rgbSpaceTripleFromOperand(colorParts[i], it.color, space);
      triples.push({ triple: native, pct: it.pct });
    }
    if (triples.length === 1) {
      const t = triples[0].triple;
      const rgb = colorSpaceToRgb(
        space,
        usedValue(t.c1),
        usedValue(t.c2),
        usedValue(t.c3),
        usedValue(t.alpha)
      );
      if (rgb === null) return null;
      return { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a * alphaMult };
    }
    const stack = triples.slice().reverse();
    while (stack.length >= 2) {
      const a = stack.pop()!;
      const b = stack.pop()!;
      const sum = a.pct! + b.pct!;
      const wA = sum === 0 ? 0.5 : a.pct! / sum;
      const wB = sum === 0 ? 0.5 : b.pct! / sum;
      const mixed = mixRgbSpace(a.triple, b.triple, wA, wB);
      stack.push({ triple: mixed, pct: sum });
    }
    const t = stack[0].triple;
    const rgb = colorSpaceToRgb(
      space,
      usedValue(t.c1),
      usedValue(t.c2),
      usedValue(t.c3),
      usedValue(t.alpha)
    );
    if (rgb === null) return null;
    return { r: rgb.r, g: rgb.g, b: rgb.b, a: rgb.a * alphaMult };
  }

  // Unreachable: `SUPPORTED_MIX_SPACES` contains only spaces handled by
  // one of the branches above.
  return null;
}

/**
 * Return a Lab/OkLab triple for an operand, preferring a NATIVE parse
 * over the gamut-mapped RGB round-trip so out-of-gamut inputs preserve
 * precision through the mix. Falls back to converting from the RGB
 * representation when the operand isn't in the matching Lab family.
 */
function labFromRGBForMix(opTokens: Token[], rgb: RGB, useOklab: boolean): LabTriple {
  const func = findFunctionToken(opTokens);
  if (func !== null) {
    const name = func.name;
    if (useOklab && (name === 'oklab' || name === 'oklch')) {
      const args = readChannels(func, name === 'oklab' ? OKLAB_SCALES : OKLCH_SCALES);
      if (args !== null) {
        const [l, x, y, alpha] = args;
        if (name === 'oklab') return { L: l, a: x, b: y, alpha };
        const hr = (y * Math.PI) / 180;
        return { L: l, a: x * Math.cos(hr), b: x * Math.sin(hr), alpha };
      }
    } else if (!useOklab && (name === 'lab' || name === 'lch')) {
      const args = readChannels(func, name === 'lab' ? LAB_SCALES : LCH_SCALES);
      if (args !== null) {
        const [l, x, y, alpha] = args;
        if (name === 'lab') return { L: l, a: x, b: y, alpha };
        const hr = (y * Math.PI) / 180;
        return { L: l, a: x * Math.cos(hr), b: x * Math.sin(hr), alpha };
      }
    }
  }
  // Non-matching operand (hex / named / rgb, or cross-space like lab() into an
  // oklab mix). Convert from the RGB representation. sRGB is the lowest gamut
  // so this path doesn't lose data; cross-space inputs lose precision out of
  // sRGB regardless of the interpolation space.
  return useOklab
    ? srgbToOklab(rgb.r, rgb.g, rgb.b, rgb.a)
    : srgbToCieLab(rgb.r, rgb.g, rgb.b, rgb.a);
}

/**
 * Lch (or OkLch) triple for an operand. Mirrors {@link labFromRGBForMix}
 * but preserves the polar (L, C, h) form natively, so a `none` in the
 * chroma or hue slot stays as NaN through the mix and carry-forward
 * runs against the other operand's chroma / hue rather than the
 * collapsed (a, b) form.
 */
function lchFromRGBForMix(opTokens: Token[], rgb: RGB, useOklch: boolean): LchTriple {
  const func = findFunctionToken(opTokens);
  if (func !== null) {
    const name = func.name;
    if (useOklch && (name === 'oklch' || name === 'oklab')) {
      const args = readChannels(func, name === 'oklch' ? OKLCH_SCALES : OKLAB_SCALES);
      if (args !== null) {
        const [l, x, y, alpha] = args;
        if (name === 'oklch') return { L: l, C: x, h: y, alpha };
        return labABToLch(l, x, y, alpha);
      }
    } else if (!useOklch && (name === 'lch' || name === 'lab')) {
      const args = readChannels(func, name === 'lch' ? LCH_SCALES : LAB_SCALES);
      if (args !== null) {
        const [l, x, y, alpha] = args;
        if (name === 'lch') return { L: l, C: x, h: y, alpha };
        return labABToLch(l, x, y, alpha);
      }
    }
  }
  // Non-matching operand: convert from sRGB through Lab → polar.
  const lab = useOklch
    ? srgbToOklab(rgb.r, rgb.g, rgb.b, rgb.a)
    : srgbToCieLab(rgb.r, rgb.g, rgb.b, rgb.a);
  return labABToLch(lab.L, lab.a, lab.b, lab.alpha);
}

function lchToRgb(t: LchTriple, useOklch: boolean): RGB {
  // NaN that survived (both operands missing) collapses to 0.
  const L = usedValue(t.L);
  const C = usedValue(t.C);
  const h = usedValue(t.h);
  const alpha = usedValue(t.alpha);
  const cc = Math.max(0, C);
  const hr = (h * Math.PI) / 180;
  const a = cc * Math.cos(hr);
  const b = cc * Math.sin(hr);
  if (useOklch) {
    return oklabToRgb(Math.max(0, Math.min(1, L)), a, b, alpha);
  }
  return labToRgb(Math.max(0, Math.min(100, L)), a, b, alpha);
}

function labABToLch(L: number, a: number, b: number, alpha: number): LchTriple {
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return { L, C: NaN, h: NaN, alpha };
  }
  const C = Math.hypot(a, b);
  // At chroma 0, hue is powerless ⇒ encode as NaN so carry-forward applies.
  const h = C < LAB_POWERLESS_CHROMA ? NaN : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  return { L, C, h, alpha };
}

/** Mix two LCH/OkLCH triples natively. */
function mixLch(A: LchTriple, B: LchTriple, wA: number, wB: number, hue: HueMethod): LchTriple {
  let [Al, Bl] = carryPair(A.L, B.L);
  let [Ac, Bc] = carryPair(A.C, B.C);
  let [Ah, Bh] = carryPair(A.h, B.h);
  const [Aalpha, Balpha] = carryPair(A.alpha, B.alpha);
  // `transparent` (Lab origin at black / zero alpha) substitutes the peer's
  // components, keeping alpha 0.
  if (isLchAlphaZero(Al, Ac, Aalpha) && !isLchAlphaZero(Bl, Bc, Balpha)) {
    Al = Bl;
    Ac = Bc;
    Ah = Bh;
  } else if (isLchAlphaZero(Bl, Bc, Balpha) && !isLchAlphaZero(Al, Ac, Aalpha)) {
    Bl = Al;
    Bc = Ac;
    Bh = Ah;
  }
  const [hA, hB] = adjustHueArc(Ah, Bh, hue);
  const h = hA + (hB - hA) * wB;
  const alpha = Aalpha * wA + Balpha * wB;
  if (alpha === 0) {
    return { L: Al * wA + Bl * wB, C: Ac * wA + Bc * wB, h, alpha: 0 };
  }
  const wAp = Aalpha * wA;
  const wBp = Balpha * wB;
  const norm = 1 / alpha;
  return {
    L: (Al * wAp + Bl * wBp) * norm,
    C: (Ac * wAp + Bc * wBp) * norm,
    h,
    alpha,
  };
}

function isLchAlphaZero(L: number, C: number, alpha: number): boolean {
  return alpha === 0 && L === 0 && C === 0;
}

/**
 * Mix two `lab` / `oklab` triples premultiplied in rectangular space with
 * NaN carry-forward and `transparent` substitution. The polar siblings
 * (`lch`, `oklch`) use `mixLch` so (L, C, h) is preserved through the mix.
 */
function mixLab(A: LabTriple, B: LabTriple, wA: number, wB: number): LabTriple {
  let [Al, Bl] = carryPair(A.L, B.L);
  let [Aa, Ba] = carryPair(A.a, B.a);
  let [Ab, Bb] = carryPair(A.b, B.b);
  const [Aalpha, Balpha] = carryPair(A.alpha, B.alpha);
  // `transparent` substitutes the peer's components, keeping alpha 0.
  if (isLabAlphaZero(Al, Aa, Ab, Aalpha) && !isLabAlphaZero(Bl, Ba, Bb, Balpha)) {
    Al = Bl;
    Aa = Ba;
    Ab = Bb;
  } else if (isLabAlphaZero(Bl, Ba, Bb, Balpha) && !isLabAlphaZero(Al, Aa, Ab, Aalpha)) {
    Bl = Al;
    Ba = Aa;
    Bb = Ab;
  }
  const alpha = Aalpha * wA + Balpha * wB;
  if (alpha === 0) {
    return { L: Al * wA + Bl * wB, a: Aa * wA + Ba * wB, b: Ab * wA + Bb * wB, alpha: 0 };
  }
  const wAp = Aalpha * wA;
  const wBp = Balpha * wB;
  const norm = 1 / alpha;
  return {
    L: (Al * wAp + Bl * wBp) * norm,
    a: (Aa * wAp + Ba * wBp) * norm,
    b: (Ab * wAp + Bb * wBp) * norm,
    alpha,
  };
}

function isLabAlphaZero(L: number, a: number, b: number, alpha: number): boolean {
  return alpha === 0 && Math.abs(L) < 1e-3 && Math.abs(a) < 1e-3 && Math.abs(b) < 1e-3;
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
      const named = NAMED_TO_RGB[t.name!];
      if (named !== undefined) color = named;
      else return [null, null];
    } else if (t.kind === TokenKind.Function) {
      // First try the slot as a nested color function (the original
      // case;`color-mix(…, oklch(…), red)`). Goes RGB → RGB without a
      // hex string round-trip.
      const nested = staticColorFunctionToRgb(t);
      if (nested !== null) {
        color = nested;
        continue;
      }
      // Otherwise fold static math fns whose result is a percentage.
      // Lets `color-mix(in srgb, X calc(100% - 30%), Y)` work the same
      // way a literal `70%` would.
      const numeric = resolveStaticMathFunction(t, true);
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

/** Parse a hex digit string (no leading `#`) to display-space sRGB 0..1.
 *  Profiled at 13% of total polyfill time using `substring + parseInt`;
 *  bit-math + a charCode → nibble lookup eliminates substring allocations
 *  and the parseInt call boundary. The named-color path skips this
 *  entirely via {@link NAMED_TO_RGB}. */
function parseHex(hex: string): RGB {
  const len = hex.length;
  const inv255 = 1 / 255;
  if (len === 6 || len === 8) {
    const r = (nibble(hex.charCodeAt(0)) << 4) | nibble(hex.charCodeAt(1));
    const g = (nibble(hex.charCodeAt(2)) << 4) | nibble(hex.charCodeAt(3));
    const b = (nibble(hex.charCodeAt(4)) << 4) | nibble(hex.charCodeAt(5));
    const a =
      len === 8 ? ((nibble(hex.charCodeAt(6)) << 4) | nibble(hex.charCodeAt(7))) * inv255 : 1;
    return { r: r * inv255, g: g * inv255, b: b * inv255, a };
  }
  // 3 / 4 digit short form: expand each nibble to a byte (×17).
  const r = nibble(hex.charCodeAt(0)) * 17;
  const g = nibble(hex.charCodeAt(1)) * 17;
  const b = nibble(hex.charCodeAt(2)) * 17;
  const a = len === 4 ? nibble(hex.charCodeAt(3)) * 17 * inv255 : 1;
  return { r: r * inv255, g: g * inv255, b: b * inv255, a };
}

/** charCode → nibble (0-15). Returns 0 for any non-hex input; callers
 *  should validate the hex character set upstream (the tokenizer does).
 *  Exported for the animation hex fast-path in `parseAnimColor`. */
export function nibble(c: number): number {
  // '0'..'9' = 48..57 → 0..9
  if (c <= 57) return c - 48;
  // 'A'..'F' = 65..70 → 10..15
  if (c <= 70) return c - 55;
  // 'a'..'f' = 97..102 → 10..15
  return c - 87;
}

function srgbToLinear(v: number): number {
  const x = Math.max(0, Math.min(1, v));
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/**
 * Relative-color binding map for the four modern color-space forms. Maps each
 * form's channel-keyword identifier to its index in `bindings` (where
 * `bindings[3]` is always `alpha`). All operations happen in the relative
 * color's space: `oklch(from red l c h)` resolves `l, c, h` against red's
 * OKLCh coordinates.
 */
const RELATIVE_CHANNEL_KEYWORDS: Record<string, Record<string, number>> = {
  oklch: { l: 0, c: 1, h: 2, alpha: 3 },
  oklab: { l: 0, a: 1, b: 2, alpha: 3 },
  lch: { l: 0, c: 1, h: 2, alpha: 3 },
  lab: { l: 0, a: 1, b: 2, alpha: 3 },
  rgb: { r: 0, g: 1, b: 2, alpha: 3 },
  hsl: { h: 0, s: 1, l: 2, alpha: 3 },
  hwb: { h: 0, w: 1, b: 2, alpha: 3 },
};

/**
 * Walk an args tree (Function token contents) and return true if any
 * Sentinel token is reachable. Used to detect "sentinel-base relative
 * color", e.g. `oklch(from \0sc:colors.brand:#abc l c h)`, which v7 can't
 * statically fold without cascade-direction visibility plumbed to the
 * render-time resolver.
 */
function containsSentinel(tok: Token): boolean {
  if (tok.kind === TokenKind.Sentinel) return true;
  if (tok.kind === TokenKind.Function) {
    const inner = tokenizeFunctionArgs(tok);
    for (let i = 0; i < inner.length; i++) {
      if (containsSentinel(inner[i])) return true;
    }
  }
  return false;
}

/**
 * Parse the `from <color>` prefix. Returns the origin color as RGB along with
 * the args consumed, or a `sentinelBail` marker if the base contains an
 * unresolvable theme reference (see `project_native_theme_reactivity` memory).
 * Returns null if `from` isn't present or the base isn't statically resolvable.
 *
 * `outerFn` (e.g. `'oklch'`) feeds the dev warning emitted when the origin is
 * `currentColor`, which can't be folded without compile-time cascade visibility.
 */
function parseRelativeFrom(
  args: Token[],
  startIdx: number,
  outerFn: string
): { rgb: RGB; consumed: number } | { sentinelBail: true } | null {
  if (
    startIdx >= args.length ||
    args[startIdx].kind !== TokenKind.Ident ||
    args[startIdx].name !== 'from'
  ) {
    return null;
  }
  const baseTok = args[startIdx + 1];
  if (baseTok === undefined) return null;
  if (containsSentinel(baseTok)) return { sentinelBail: true };

  let rgb: RGB | null = null;
  if (baseTok.kind === TokenKind.Hash) {
    rgb = parseHex(baseTok.name!);
  } else if (baseTok.kind === TokenKind.Ident) {
    const name = baseTok.name!;
    // `currentColor` origin needs cascade visibility; the static fold has
    // none, so warn and drop. The browser resolves currentColor itself, so
    // rn-web stays silent and lets the authored text through.
    if (name === 'currentcolor') {
      if (__DEV__ && !__NATIVE_WEB__) {
        warnOnce(
          'native-relative-color-currentcolor',
          `\`${outerFn}(from currentColor ...)\` cannot be converted for React Native because \`currentColor\` depends on inherited styles. Use a theme value as the base color, or write the resolved color directly.`
        );
      }
      return null;
    }
    const named = NAMED_TO_RGB[name];
    if (named === undefined) return null;
    rgb = named;
  } else if (baseTok.kind === TokenKind.Function) {
    rgb = staticColorFunctionToRgb(baseTok);
    if (rgb === null) return null;
  } else {
    return null;
  }
  return { rgb, consumed: 2 };
}

/**
 * Convert origin RGB → target-space coordinate bindings as a four-tuple
 * [c1, c2, c3, alpha]. Component ranges: lab L 0..100 / a, b ±125; lch L 0..100
 * / c 0..150 / h 0..360; oklab L 0..1 / a, b ±0.4; oklch L 0..1 / c 0..0.4 /
 * h 0..360.
 */
function rgbToTargetBindings(
  rgb: RGB,
  targetSpace: 'oklch' | 'oklab' | 'lab' | 'lch' | 'rgb' | 'hsl' | 'hwb'
): [number, number, number, number] {
  if (targetSpace === 'rgb') {
    // sRGB keywords are <number>s where 255 == 100%. readRgbFn's Number
    // branch divides by 255, so the bound value is the 0..255 form.
    return [rgb.r * 255, rgb.g * 255, rgb.b * 255, rgb.a];
  }
  if (targetSpace === 'hsl') {
    const [h, s, l] = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return [h, s, l, rgb.a];
  }
  if (targetSpace === 'hwb') {
    const [h, w, b] = rgbToHwb(rgb.r, rgb.g, rgb.b);
    return [h, w, b, rgb.a];
  }
  if (targetSpace === 'oklab') {
    const ok = srgbToOklab(rgb.r, rgb.g, rgb.b, rgb.a);
    return [ok.L, ok.a, ok.b, ok.alpha];
  }
  if (targetSpace === 'oklch') {
    const ok = srgbToOklab(rgb.r, rgb.g, rgb.b, rgb.a);
    const c = Math.sqrt(ok.a * ok.a + ok.b * ok.b);
    let h = (Math.atan2(ok.b, ok.a) * 180) / Math.PI;
    if (h < 0) h += 360;
    return [ok.L, c, h, ok.alpha];
  }
  if (targetSpace === 'lab') {
    const lab = srgbToCieLab(rgb.r, rgb.g, rgb.b, rgb.a);
    return [lab.L, lab.a, lab.b, lab.alpha];
  }
  // lch
  const lab = srgbToCieLab(rgb.r, rgb.g, rgb.b, rgb.a);
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [lab.L, c, h, lab.alpha];
}

/**
 * Walk a calc-tree's tokens and replace any ident matching a binding keyword
 * with a number token carrying the bound value (e.g. `oklch(from var(--color)
 * calc(l / 2) c h)` halves lightness). Substitution lets the existing
 * static-math evaluator handle the expression without color-space awareness.
 *
 * Mutates in place; safe because each transformDecl pass tokenizes fresh and
 * each function's argTokens is read at most once per channel slot.
 */
function substituteCalcBindings(
  fnTok: Token,
  keywords: Record<string, number>,
  bindings: readonly number[]
): void {
  const inner = tokenizeFunctionArgs(fnTok);
  for (let i = 0; i < inner.length; i++) {
    const t = inner[i];
    if (t.kind === TokenKind.Ident && t.name !== undefined) {
      const bIdx = keywords[t.name];
      if (bIdx !== undefined) {
        const v = bindings[bIdx];
        // Missing origin components (NaN, e.g. hue at chroma 0) collapse to 0
        // inside calc().
        inner[i] = numberToken(String(v !== v ? 0 : v), v !== v ? 0 : v);
      }
    } else if (t.kind === TokenKind.Function) {
      substituteCalcBindings(t, keywords, bindings);
    }
  }
}

/**
 * Channel-keyword map for a `color(<space> ...)` relative form. Predefined
 * RGB spaces bind `r`/`g`/`b`; XYZ spaces bind `x`/`y`/`z`. Both add
 * `alpha`. Returns null for an unknown space so the caller bails the fold.
 */
function colorFnChannelKeywords(space: string): Record<string, number> | null {
  switch (space) {
    case 'srgb':
    case 'srgb-linear':
    case 'display-p3':
    case 'display-p3-linear':
    case 'a98-rgb':
    case 'prophoto-rgb':
    case 'rec2020':
      return { r: 0, g: 1, b: 2, alpha: 3 };
    case 'xyz':
    case 'xyz-d65':
    case 'xyz-d50':
      return { x: 0, y: 1, z: 2, alpha: 3 };
    default:
      return null;
  }
}

/**
 * Pre-pass for a relative-color reader: walk the top-level arg tokens from
 * `startIdx` and substitute every bound channel keyword with the bound
 * number, including keywords nested inside `calc()` trees. After this runs,
 * the reader's existing loop sees plain Number tokens and applies its
 * per-spec scaling (e.g. `/255` for rgb, `/100` for percent channels). Bare
 * `none` idents and non-keyword idents are left for the reader to handle or
 * reject.
 */
function substituteRelativeBindings(
  args: Token[],
  startIdx: number,
  keywords: Record<string, number>,
  bindings: readonly number[]
): void {
  for (let i = startIdx; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Ident && t.name !== undefined && t.name !== 'none') {
      const bIdx = keywords[t.name];
      if (bIdx !== undefined) {
        const v = bindings[bIdx];
        // Missing origin components (NaN, e.g. hue at chroma 0) collapse to 0.
        args[i] = numberToken(String(v !== v ? 0 : v), v !== v ? 0 : v);
      }
    } else if (t.kind === TokenKind.Function) {
      substituteCalcBindings(t, keywords, bindings);
    }
  }
}

/**
 * True when `value` opens with a `from` relative-color prefix immediately
 * inside the function's parentheses, e.g. `rgb(from red ...)`. `parenIdx`
 * is the index of the `(`. Matches `from` case-insensitively and requires a
 * whitespace boundary after it so identifiers like `fromage` don't match.
 * Used by the native dispatch to route relative rgb / hsl / hwb into the
 * fold while leaving the absolute (RN-native) forms untouched.
 */
export function hasRelativeFromPrefix(value: string, parenIdx: number): boolean {
  let i = parenIdx + 1;
  const len = value.length;
  // Skip whitespace after `(`.
  while (i < len) {
    const c = value.charCodeAt(i);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) i++;
    else break;
  }
  // Match `from` ASCII case-insensitively (lowercase via | 0x20).
  if (
    (value.charCodeAt(i) | 0x20) !== 0x66 /* f */ ||
    (value.charCodeAt(i + 1) | 0x20) !== 0x72 /* r */ ||
    (value.charCodeAt(i + 2) | 0x20) !== 0x6f /* o */ ||
    (value.charCodeAt(i + 3) | 0x20) !== 0x6d /* m */
  ) {
    return false;
  }
  // Require a whitespace boundary after `from` so `fromage` doesn't match.
  const after = value.charCodeAt(i + 4);
  return after === 0x20 || after === 0x09 || after === 0x0a || after === 0x0d;
}

/**
 * Read three channel values + optional alpha from an `oklab`/`oklch`/`lab`/`lch`
 * function token. Each color space scales percents differently:
 * `scales[i]` is what `100%` maps to for channel `i`. Pass `NaN` to reject
 * percent for that channel (used for hue, where percent isn't valid).
 *
 * Number form (no `%`) is taken as-is. Alpha after `/` is normalized to 0..1
 * regardless of input form.
 *
 * `relativeSpace`, when provided, enables relative-color syntax: detects
 * a `from <color>` prefix, binds the origin's channels in the target
 * space, and substitutes channel keywords (l/c/h/a/b, alpha) in any
 * slot, including inside `calc()`. Omitted alpha defaults to the
 * origin's alpha (not 1).
 */
function readChannels(
  tok: Token,
  scales: readonly [number, number, number],
  relativeSpace?: 'oklch' | 'oklab' | 'lab' | 'lch'
): [number, number, number, number] | null {
  const args = tokenizeFunctionArgs(tok);
  const vals: number[] = [];
  let alpha = 1;
  let sawSlash = false;
  let startIdx = 0;
  let bindings: readonly number[] | null = null;
  let keywords: Record<string, number> | null = null;

  if (relativeSpace !== undefined) {
    const from = parseRelativeFrom(args, 0, tok.name || relativeSpace);
    if (from !== null) {
      if ('sentinelBail' in from) {
        // Sentinel-base relative color (`oklch(from <theme-token> l c h)`)
        // defers to `colorFnResolver`'s render-time substitution; the
        // post-substitution string re-enters readChannels with a literal hex
        // base. Bail the static fold silently.
        return null;
      }
      bindings = rgbToTargetBindings(from.rgb, relativeSpace);
      keywords = RELATIVE_CHANNEL_KEYWORDS[relativeSpace];
      // Relative-color alpha omitted ⇒ defaults to the origin's alpha (not 100%).
      alpha = bindings[3];
      startIdx = from.consumed;
    }
  }

  for (let i = startIdx; i < args.length; i++) {
    const t = args[i];
    if (t.kind === TokenKind.Comma) continue;
    if (t.kind === TokenKind.Slash) {
      sawSlash = true;
      continue;
    }
    if (t.kind === TokenKind.Number) {
      if (sawSlash) alpha = t.value!;
      else vals.push(t.value!);
    } else if (t.kind === TokenKind.Angle) {
      // Angle units only make sense for the hue channel of lch / oklch.
      // The scales table marks hue with NaN so any non-hue slot bails.
      if (sawSlash) return null;
      const idx = vals.length;
      const scale = idx < scales.length ? scales[idx] : NaN;
      if (!Number.isNaN(scale)) return null;
      vals.push(angleToDeg(t.value!, t.unit));
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
      // Substitute channel keywords inside `calc()` with their bound numeric
      // values before the static math evaluator runs.
      if (bindings !== null && keywords !== null) {
        substituteCalcBindings(t, keywords, bindings);
      }
      // Static-foldable math fns (`calc`, `min`, `max`, `clamp`) are
      // valid channel sources when the result is a bare number, a
      // percentage, or (only in the hue slot of lch/oklch) a degree
      // angle. Other units (px / em / vw / …) don't make sense as a
      // color channel and bail back to null.
      const numeric = resolveStaticMathFunction(t, true);
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
      } else if (numeric.unit === 'deg') {
        if (sawSlash) return null;
        const idx = vals.length;
        const scale = idx < scales.length ? scales[idx] : NaN;
        // `scale === NaN` marks the hue channel of lch/oklch; only there
        // is an angle a valid value.
        if (!Number.isNaN(scale)) return null;
        vals.push(numeric.value);
      } else {
        return null;
      }
    } else if (t.kind === TokenKind.Ident && t.name === 'none') {
      // Standalone parsing collapses missing channels to 0; color-mix preserves
      // the NaN flag to drive carry-forward.
      if (sawSlash) alpha = NaN;
      else vals.push(NaN);
    } else if (t.kind === TokenKind.Ident && t.name !== undefined && keywords !== null) {
      // Channel keyword bound from the origin color. Keywords are accepted in
      // any slot order so `oklch(from #f00 c l h)` works too.
      const bIdx = keywords[t.name];
      if (bIdx === undefined) return null;
      const v = bindings![bIdx];
      if (sawSlash) alpha = v;
      else vals.push(v);
    } else {
      return null;
    }
  }
  if (vals.length !== 3) return null;
  return [vals[0], vals[1], vals[2], alpha];
}

/** "Used value" of a possibly-missing channel: NaN collapses to 0.
 *  Standalone color parsers use this; the color-mix pipeline preserves
 *  NaN until carry-forward runs. */
function usedValue(v: number): number {
  return v !== v ? 0 : v;
}
