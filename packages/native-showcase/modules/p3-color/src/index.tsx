import { requireNativeView } from 'expo';
import React from 'react';
import { Platform, View, ViewProps } from 'react-native';

interface P3SwatchProps extends ViewProps {
  /** Display-P3 red, 0..1 (gamma-corrected display value, not linear). */
  r: number;
  /** Display-P3 green, 0..1. */
  g: number;
  /** Display-P3 blue, 0..1. */
  b: number;
  /** Alpha, 0..1; defaults to 1. */
  a?: number;
}

const NativeP3View =
  Platform.OS === 'ios'
    ? (requireNativeView('P3Color') as React.ComponentType<P3SwatchProps>)
    : null;

/**
 * View whose background renders in Display-P3 on iOS — UIKit preserves
 * the wide-gamut tag through to CALayer. On Android / Web we fall back
 * to a sRGB approximation since neither stack exposes a P3 path through
 * RN's color processing.
 *
 * Inputs are gamma-corrected display values in [0, 1]. Use the
 * {@link oklchToP3} helper to derive them from an OKLCh design token.
 */
export function P3Swatch({ r, g, b, a = 1, style, ...rest }: P3SwatchProps) {
  if (NativeP3View) {
    return <NativeP3View r={r} g={g} b={b} a={a} style={style} {...rest} />;
  }
  // Android / Web fallback: sRGB approximation.
  const r8 = Math.round(clamp01(r) * 255);
  const g8 = Math.round(clamp01(g) * 255);
  const b8 = Math.round(clamp01(b) * 255);
  return (
    <View
      style={[style, { backgroundColor: `rgba(${r8}, ${g8}, ${b8}, ${a})` }]}
      {...rest}
    />
  );
}

/**
 * Convert OKLCh to Display-P3 RGB (gamma-corrected, 0..1 each).
 *
 * Pipeline: OKLab → linear sRGB (Bottosson matrices, no clipping) → XYZ
 * D65 → linear Display-P3 D65 → sRGB-style transfer function. Colors that
 * fit in P3 but not sRGB end up with all-positive linear-P3 channels even
 * though the linear-sRGB intermediate had negatives — the conversion
 * passes through XYZ without clipping. Out-of-P3 inputs are naively
 * clamped (rare for realistic palettes; full P3 gamut mapping is overkill
 * for a showcase).
 */
export function oklchToP3(L: number, c: number, hueDeg: number): {
  r: number;
  g: number;
  b: number;
} {
  const hr = (hueDeg * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);

  // OKLab → linear sRGB (Bottosson). Negative channels are fine; the next
  // step normalizes through XYZ.
  const lq = L + 0.3963377774 * a + 0.2158037573 * b;
  const mq = L - 0.1055613458 * a - 0.0638541728 * b;
  const sq = L - 0.0894841775 * a - 1.291485548 * b;
  const ll = lq * lq * lq;
  const mm = mq * mq * mq;
  const ss = sq * sq * sq;
  const rs = 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss;
  const gs = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss;
  const bs = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss;

  // Linear sRGB → XYZ (D65)
  const X = 0.4124564 * rs + 0.3575761 * gs + 0.1804375 * bs;
  const Y = 0.2126729 * rs + 0.7151522 * gs + 0.0721750 * bs;
  const Z = 0.0193339 * rs + 0.1191920 * gs + 0.9503041 * bs;

  // XYZ → linear Display-P3 (D65, P3 primaries, sRGB whitepoint)
  const rp3 = 2.4934969 * X - 0.9313836 * Y - 0.4027108 * Z;
  const gp3 = -0.8294890 * X + 1.7626641 * Y + 0.0236247 * Z;
  const bp3 = 0.0358458 * X - 0.0761724 * Y + 0.9568845 * Z;

  return { r: gamma(rp3), g: gamma(gp3), b: gamma(bp3) };
}

function gamma(v: number): number {
  const x = clamp01(v);
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
