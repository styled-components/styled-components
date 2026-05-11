/**
 * Native-side style polyfills.
 *
 * Two stages, both no-ops on the platform that doesn't need them:
 *
 * 1. {@link normalizeStyleForWeb} - rewrites RN-style shapes that
 *    `react-native-web` translates incorrectly. Called inside
 *    `composeBase` so user-supplied inline styles get patched before
 *    merging. Currently fixes 16-element matrix transforms (rn-web's
 *    `mapTransform` emits invalid `matrix(...16 args)` for 3D matrices;
 *    we rename `matrix` -> `matrix3d` so the emit branch produces the
 *    valid `matrix3d(...)` CSS instead).
 *
 * 2. {@link applyStylePolyfills} - runs at the elementProps boundary,
 *    just before `React.createElement`. Currently synthesizes the
 *    `background-blend-mode` spec on RN native by injecting absolutely-
 *    positioned blend layers + `isolation: isolate` on the wrapper.
 *
 * New polyfills should be added as separate functions in this file and
 * chained into {@link applyStylePolyfills} (or, when the rewrite is on
 * the user-supplied side rather than the merged props, into
 * {@link normalizeStyleForWeb}).
 *
 * Each individual polyfill returns the input reference unchanged when
 * no rewrite applies, so cache identity downstream stays intact.
 */

import * as React from 'react';
import { splitTopLevelCommas } from '../parser/parser';

// ──────────────────────────────────────────────────────────────────
//  Platform detection
// ──────────────────────────────────────────────────────────────────

let isWebCached: boolean | null = null;

/**
 * Single source of truth for "are we running under react-native-web?".
 * Cached after first call. Platform.OS doesn't change at runtime.
 */
export function isWebPlatform(): boolean {
  if (__NATIVE_WEB__) return true;
  if (isWebCached !== null) return isWebCached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn: { Platform?: { OS?: string } } = require('react-native');
    isWebCached = rn.Platform?.OS === 'web';
  } catch {
    isWebCached = false;
  }
  return isWebCached;
}

/** Test-only: clear the cached platform result. */
export function __resetPlatformCacheForTesting(): void {
  if (__NATIVE_WEB__) return;
  isWebCached = null;
}

type RNComponentRefs = {
  View: React.ComponentType<any> | null;
  Image: React.ComponentType<any> | null;
};

let cachedRn: RNComponentRefs | undefined = undefined;

function getRNComponents(): RNComponentRefs {
  if (cachedRn === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rn = require('react-native') as {
        View?: React.ComponentType<any>;
        Image?: React.ComponentType<any>;
      };
      cachedRn = { View: rn.View ?? null, Image: rn.Image ?? null };
    } catch {
      cachedRn = { View: null, Image: null };
    }
  }
  return cachedRn;
}

// ──────────────────────────────────────────────────────────────────
//  Stage 1: user-side style normalizer (called from composeBase)
// ──────────────────────────────────────────────────────────────────

/**
 * Patch RN-style shapes for `react-native-web` translation gaps. No-op
 * on native. Returns the same reference when no rewrite is needed.
 */
export function normalizeStyleForWeb(style: any): any {
  if (!__NATIVE_WEB__) return style;
  if (style == null) return style;
  return rewriteStyleForWebTransport(style);
}

/**
 * Pure rewrite (no platform gate). Exported for tests that want to
 * verify the transformation without booting a web runtime. Production
 * callers use {@link normalizeStyleForWeb}, which short-circuits on
 * native.
 *
 * Lazy-allocates the output array: only clones the input when at least
 * one entry rewrites, so the identity-stable hot path costs zero
 * allocations.
 */
export function rewriteStyleForWebTransport(s: any): any {
  if (Array.isArray(s)) {
    let out: any[] | null = null;
    for (let i = 0; i < s.length; i++) {
      const w = rewriteStyleForWebTransport(s[i]);
      if (w !== s[i] && out === null) {
        out = s.slice(0, i);
      }
      if (out !== null) out[i] = w;
    }
    return out ?? s;
  }
  if (s == null || typeof s !== 'object') return s;
  const t = s.transform;
  if (!Array.isArray(t)) return s;
  const fixed = fixTransformMatrix3d(t);
  return fixed === t ? s : { ...s, transform: fixed };
}

/**
 * rn-web `mapTransform` emits `matrix(${arr.join(',')})` for any
 * `{matrix: [...]}` entry, but CSS `matrix()` is the 2D form (6 args).
 * 16-arg input is invalid; the browser drops the entire transform.
 * Renaming to `{matrix3d: arr16}` lets rn-web emit the correct
 * `matrix3d(...)` CSS. RN native rejects `matrix3d` so this is web-only.
 *
 * Lazy-allocates: only clones when an entry actually needs rewriting.
 */
function fixTransformMatrix3d(arr: any[]): any[] {
  let out: any[] | null = null;
  for (let i = 0; i < arr.length; i++) {
    const entry = arr[i];
    if (
      entry !== null &&
      typeof entry === 'object' &&
      Array.isArray(entry.matrix) &&
      entry.matrix.length === 16
    ) {
      if (out === null) out = arr.slice(0, i);
      out[i] = { matrix3d: entry.matrix };
    } else if (out !== null) {
      out[i] = entry;
    }
  }
  return out ?? arr;
}

// ──────────────────────────────────────────────────────────────────
//  Stage 2: elementProps polyfills (chained at render boundary)
// ──────────────────────────────────────────────────────────────────

/**
 * Run all native-side polyfills against the resolved element props
 * just before `React.createElement`. Each polyfill returns the input
 * reference unchanged on miss, so the chain is cheap on the hot path.
 */
export function applyStylePolyfills(
  elementProps: Record<string, unknown>
): Record<string, unknown> {
  if (__NATIVE_WEB__) return elementProps;
  return applyBackgroundBlendModePolyfill(elementProps);
}

// ── background-blend-mode ─────────────────────────────────────────

/**
 * Polyfill `background-blend-mode` on RN native. RN 0.85's
 * `experimental_backgroundImage` paints layered gradients but doesn't
 * composite them with `backgroundColor`. We synthesize the spec
 * (CSS Compositing L1) by injecting absolutely-positioned child Views,
 * one per `background-image` layer, each carrying the matching
 * `mix-blend-mode` value. The wrapper picks up `isolation: isolate` so
 * the blend stays in the element's own group:
 *
 *   "Background layers must blend with each other and with the
 *   element's background color. Background layers must not blend with
 *   the content that is behind the element, instead they must act as
 *   if they are rendered into an isolated group."
 *
 * Spec ordering: the first comma layer is on top. Absolute siblings
 * stack in DOM order, so we iterate the layer list in reverse (last
 * pushed first = bottom; first pushed last = top). Per-layer
 * `background-size`, `-position`, and `-repeat` cycle by index when
 * their comma counts mismatch the layer count, matching CSS shorthand
 * semantics.
 *
 * On rn-web the browser parses `background-blend-mode` natively; the
 * polyfill is a no-op there.
 *
 * COLOR-SPACE PIN. Every blend layer (photo, gradient, bgColor backdrop)
 * sets `shouldRasterizeIOS: true`. iOS rasterizes through Core Graphics
 * which is 8-bit sRGB, so the subsequent compositingFilter operates on
 * gamma-encoded byte values, matching browser CSS-spec blend math.
 *
 * No equivalent fix exists on Android: `renderToHardwareTextureAndroid`
 * forces an `RGBA_F16` linear-light HardwareLayer on wide-gamut devices,
 * which is the opposite of what we want. Toggling it doesn't move the
 * needle on color-burn / color-dodge / soft-light, which still blend in
 * the activity's surface color space (linear on Pixel-class devices).
 * Recovering full parity for those modes on Android requires either
 * configuring the activity for `COLOR_MODE_DEFAULT` or rendering through
 * an explicitly-sRGB Skia surface, both outside the polyfill's reach.
 *
 * BACKDROP PLACEMENT. RN's iOS view manager paints `backgroundColor`
 * via a dedicated `_backgroundColorLayer` at zPosition=-1024, which
 * sits outside normal sibling stacking. CALayer.compositingFilter on
 * the blend layers samples the parent's normal compositing buffer, so
 * a negative-zPosition backdrop gets ignored and the blend collapses
 * (color-burn becomes solid red, lighten stays solid bgColor). The
 * polyfill lifts bgColor out of the wrapper into an explicit
 * bottom-most sibling View so it lives in the same stacking order as
 * the blend layers. Android benefits too: the saveLayer offscreen
 * buffer fills with bgColor before drawChild runs the per-child blend.
 */
export function applyBackgroundBlendModePolyfill(
  elementProps: Record<string, unknown>
): Record<string, unknown> {
  if (__NATIVE_WEB__) return elementProps;
  if (!hasBackgroundBlendMode(elementProps.style)) return elementProps;

  const flat: Record<string, unknown> = {};
  flatten(elementProps.style, flat);
  const blendMode = flat.backgroundBlendMode;
  if (typeof blendMode !== 'string') return elementProps;
  const bgImage =
    typeof flat.experimental_backgroundImage === 'string'
      ? flat.experimental_backgroundImage
      : typeof flat.backgroundImage === 'string'
        ? flat.backgroundImage
        : null;
  if (bgImage === null) return elementProps;

  const { View, Image } = getRNComponents();
  if (View === null) return elementProps;

  const images = splitTopLevelCommas(bgImage, true);
  const modes = splitTopLevelCommas(blendMode, true);
  const sizes = readLayered(flat, 'experimental_backgroundSize', 'backgroundSize');
  const positions = readLayered(flat, 'experimental_backgroundPosition', 'backgroundPosition');
  const repeats = readLayered(flat, 'experimental_backgroundRepeat', 'backgroundRepeat');

  const layers: React.ReactElement[] = [];
  for (let i = images.length - 1; i >= 0; i--) {
    const image = images[i];
    if (image.length === 0) continue;
    const blend = modes[i % modes.length] ?? 'normal';
    const url = parseUrlLayer(image);
    const key = `__sc_bg_blend_${i}`;
    if (url !== null && Image !== null) {
      // Photo / asset layer. RN's gradient parser doesn't handle url();
      // render an Image with the resolved URI. The Image is wrapped in
      // a View that carries mixBlendMode because iOS's
      // RCTImageComponentView keeps the photo bitmap on an inner
      // _imageView sublayer; setting compositingFilter on the outer
      // image layer doesn't reliably composite the inner sublayer with
      // the parent's backdrop. A plain View with mixBlendMode + Image
      // child gives Core Animation a single-layer compositing subject.
      layers.push(
        createBlendLayer(
          View,
          key,
          blend,
          { overflow: 'hidden' },
          React.createElement(Image, {
            source: { uri: url },
            resizeMode: parseResizeMode(sizes ? sizes[i % sizes.length] : undefined),
            // Lock to absolute fill: `width/height: '100%'` on Image inside an
            // absolute-positioned parent doesn't always resolve on Android.
            style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
          })
        )
      );
      continue;
    }
    // Gradient layer. The View carries the gradient string directly.
    const layerStyle: Record<string, unknown> = {
      experimental_backgroundImage: image,
      backgroundImage: image,
    };
    applyLayered(layerStyle, sizes, i, 'experimental_backgroundSize', 'backgroundSize');
    applyLayered(layerStyle, positions, i, 'experimental_backgroundPosition', 'backgroundPosition');
    applyLayered(layerStyle, repeats, i, 'experimental_backgroundRepeat', 'backgroundRepeat');
    layers.push(createBlendLayer(View, key, blend, layerStyle));
  }
  if (layers.length === 0) return elementProps;

  const wrapperStyle: Record<string, unknown> = {};
  for (const k in flat) {
    if (!BG_BLEND_STRIP_KEYS.has(k)) wrapperStyle[k] = flat[k];
  }
  wrapperStyle.isolation = 'isolate';

  const bgColor = wrapperStyle.backgroundColor;
  if (bgColor !== undefined && bgColor !== null && bgColor !== 'transparent') {
    delete wrapperStyle.backgroundColor;
    layers.unshift(
      createBlendLayer(View, '__sc_bg_blend_color', null, { backgroundColor: bgColor })
    );
  }

  const origChildren = elementProps.children;
  const newChildren: React.ReactNode = !Array.isArray(origChildren)
    ? origChildren == null
      ? layers
      : [...layers, origChildren as React.ReactNode]
    : [...layers, ...(origChildren as React.ReactNode[])];

  return { ...elementProps, style: wrapperStyle, children: newChildren };
}

const BG_BLEND_STRIP_KEYS: ReadonlySet<string> = new Set([
  'backgroundImage',
  'experimental_backgroundImage',
  'backgroundSize',
  'experimental_backgroundSize',
  'backgroundPosition',
  'experimental_backgroundPosition',
  'backgroundRepeat',
  'experimental_backgroundRepeat',
  'backgroundBlendMode',
]);

/**
 * Build one absolutely-positioned blend layer. Shared shell for the
 * bgColor backdrop, photo wrappers, and gradient wrappers; the call
 * sites differ only in `extraStyle` and the optional Image child.
 *
 * `blend === null` is the bgColor backdrop case: no mixBlendMode
 * (compositing it would re-blend the bgColor with the wrapper's
 * parent), but raster pinning still applies so the backdrop bitmap
 * lives in the same sRGB-encoded buffer as the overlay layers.
 */
function createBlendLayer(
  View: React.ComponentType<any>,
  key: string,
  blend: string | null,
  extraStyle: Record<string, unknown>,
  child?: React.ReactNode
): React.ReactElement {
  const style: Record<string, unknown> = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...extraStyle,
  };
  if (blend !== null) style.mixBlendMode = blend;
  return React.createElement(
    View,
    {
      key,
      pointerEvents: 'none',
      shouldRasterizeIOS: true,
      style,
    },
    child
  );
}

/**
 * Cycle a layered `background-*` value into the per-layer style at
 * index `i`. Mirrors CSS shorthand semantics: when there are fewer
 * commas than image layers, values cycle by `i % length`. Empty-string
 * values are dropped (no behavioural difference vs. unset).
 */
function applyLayered(
  out: Record<string, unknown>,
  values: string[] | null,
  i: number,
  experimentalKey: string,
  standardKey: string
): void {
  if (values === null) return;
  const v = values[i % values.length];
  if (!v) return;
  out[experimentalKey] = v;
  out[standardKey] = v;
}

// ──────────────────────────────────────────────────────────────────
//  Shared helpers
// ──────────────────────────────────────────────────────────────────

/**
 * Flatten array-form style into a plain object (later entries win).
 * Function-form styles (Pressable state callbacks) and primitives are
 * skipped: the polyfill chain doesn't try to evaluate callbacks.
 */
function flatten(style: unknown, out: Record<string, unknown>): void {
  if (style === null || style === undefined) return;
  if (Array.isArray(style)) {
    for (let i = 0; i < style.length; i++) flatten(style[i], out);
    return;
  }
  if (typeof style !== 'object') return;
  for (const k in style as Record<string, unknown>) {
    const v = (style as Record<string, unknown>)[k];
    if (v !== undefined) out[k] = v;
  }
}

/**
 * Cheap pre-check that walks arrays without flattening, returning at
 * the first hit. The hot path for components without
 * `backgroundBlendMode` pays roughly one property-existence check.
 */
function hasBackgroundBlendMode(style: unknown): boolean {
  if (style === null || style === undefined || typeof style === 'function') {
    return false;
  }
  if (Array.isArray(style)) {
    for (let i = 0; i < style.length; i++) {
      if (hasBackgroundBlendMode(style[i])) return true;
    }
    return false;
  }
  if (typeof style !== 'object') return false;
  return (style as Record<string, unknown>).backgroundBlendMode !== undefined;
}

/**
 * Read a `background-*` value (preferring the `experimental_*` form
 * when both are present) and split it on top-level commas. Returns
 * `null` when the value isn't a string the polyfill can consume.
 */
function readLayered(
  flat: Record<string, unknown>,
  experimentalKey: string,
  standardKey: string
): string[] | null {
  const v = flat[experimentalKey] ?? flat[standardKey];
  return typeof v === 'string' ? splitTopLevelCommas(v, true) : null;
}

/**
 * Recognise `url(...)` background layers and extract the URL. Strips
 * surrounding single or double quotes per the CSS Values spec. Returns
 * `null` for anything that isn't a `url()` reference (gradient, color,
 * keyword) so the caller can fall back to the gradient render path.
 */
function parseUrlLayer(image: string): string | null {
  if (!image.startsWith('url(') || !image.endsWith(')')) return null;
  let inner = image.slice(4, -1).trim();
  if (inner.length >= 2) {
    const first = inner.charCodeAt(0);
    if (
      (first === 0x22 /* " */ || first === 0x27) /* ' */ &&
      inner.charCodeAt(inner.length - 1) === first
    ) {
      inner = inner.slice(1, -1);
    }
  }
  return inner.length === 0 ? null : inner;
}

/**
 * Map a `background-size` keyword to the `Image` `resizeMode` prop.
 * `cover` and `contain` map directly; the percentage / pixel forms,
 * `auto`, and unset all default to `'cover'` (the most common photo-
 * background expectation, matching CSS's `cover` keyword behaviour).
 */
function parseResizeMode(size: string | undefined): 'cover' | 'contain' | 'stretch' | 'center' {
  if (size === 'contain') return 'contain';
  if (size === 'stretch' || size === '100% 100%') return 'stretch';
  if (size === 'center') return 'center';
  return 'cover';
}
