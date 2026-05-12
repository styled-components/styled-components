import { splitTopLevelCommas } from '../../parser/parser';

/**
 * Properties that are handed to the host platform unchanged: the value
 * reaches RN (or `react-native-web`) as a CSS string, and that side
 * parses it. Our transform layer would only introduce translation bugs.
 *
 * Keys are the camelCase CSS property name our parser hands us; values
 * are the runtime keys the host platform expects on the style object.
 *
 * Most map identity. The four `background*` props diverge: RN 0.85 still
 * gates its native gradient parser behind the `experimental_` prefix and
 * silently drops the standard name, while `react-native-web` only knows
 * the standard CSS names and silently drops the `experimental_` form.
 *
 * To cover both targets without a runtime platform check, we emit BOTH
 * keys for those four props. The ordering mirrors CSS vendor-prefix
 * convention: vendor / experimental form FIRST, standard CSS name LAST.
 * On web, rn-web's `preprocess` iterates keys in insertion order; the
 * later (standard) key wins. On native, RN's view-prop filter only
 * registers the `experimental_*` key and silently drops the unknown
 * standard form.
 *
 * Additions to this list should be justified by a concrete RN / rn-web
 * version. The entry in `knowledge_rn_0_80_to_0_85_css.md` (memory) records
 * when each prop shipped on native.
 */
export const PASSTHROUGH_PROPS: ReadonlyMap<string, readonly string[]> = new Map([
  // Transforms; RN parses CSS string form since 0.74
  ['transform', ['transform']],
  ['transformOrigin', ['transformOrigin']],
  // Shadows as CSS strings since 0.76; array form also fine
  ['boxShadow', ['boxShadow']],
  // Filters; RN parses string/array since 0.83
  ['filter', ['filter']],
  // Backgrounds: dual-emit. RN reads `experimental_*`; rn-web reads the
  // standard name. Each silently ignores the other.
  ['backgroundImage', ['experimental_backgroundImage', 'backgroundImage']],
  ['backgroundSize', ['experimental_backgroundSize', 'backgroundSize']],
  ['backgroundPosition', ['experimental_backgroundPosition', 'backgroundPosition']],
  ['backgroundRepeat', ['experimental_backgroundRepeat', 'backgroundRepeat']],
  // Blending + isolation added 0.85
  ['mixBlendMode', ['mixBlendMode']],
  ['isolation', ['isolation']],
  // background-blend-mode renders on rn-web (browser parses it natively).
  // RN 0.85 has no native equivalent (processBackgroundImage doesn't
  // composite the gradient with backgroundColor), so the prop drops
  // silently on iOS/Android. Re-evaluate when RN exposes it.
  ['backgroundBlendMode', ['backgroundBlendMode']],
  // Interactivity
  ['cursor', ['cursor']],
  ['pointerEvents', ['pointerEvents']],
  ['userSelect', ['userSelect']],
  // box-sizing: RN 0.85 Yoga implements BoxSizing::{BorderBox, ContentBox}
  // and ReactNativeStyleAttributes.js:84 registers `boxSizing: true`. Pure
  // identity passthrough; no transformation needed.
  ['boxSizing', ['boxSizing']],
  // CSS Writing Modes 4. `direction: ltr | rtl` sets inline base direction
  // (Unicode bidi level). Inherited, applies to all elements. RN's Yoga
  // already honors `direction` for the `*-inline-*` logical mapping on
  // iOS / Android; rn-web maps it onto the browser's bidi engine. Pure
  // identity passthrough.
  ['direction', ['direction']],
  // CSS Images 4. <Image> only. RN 0.85 registers `objectFit`.
  ['objectFit', ['objectFit']],
  // CSS Inline 3. <Text> only. RN 0.85 accepts the keyword grammar
  // (`auto | top | bottom | middle`); length/percent forms are rn-web only.
  ['verticalAlign', ['verticalAlign']],
  // CSS Transforms 2. Visibility of back face on 3D-transformed elements.
  // RN 0.85 registers `backfaceVisibility`.
  ['backfaceVisibility', ['backfaceVisibility']],
  // CSS UI 4. The `outline` shorthand handler doesn't parse offsets, so
  // this exposes the longhand independently. RN 0.85 registers `outlineOffset`.
  ['outlineOffset', ['outlineOffset']],
]);

/**
 * Resolve the host-platform runtime keys for a passthrough property.
 * Returns `undefined` for non-passthrough names; otherwise an array of
 * one or more keys, all of which should receive the raw value at the
 * RN / rn-web boundary.
 */
export function getPassthroughKeys(camel: string): readonly string[] | undefined {
  return PASSTHROUGH_PROPS.get(camel);
}

/**
 * `background-position`, `-size`, and `-repeat` cycle per layer per the
 * CSS Backgrounds shorthand (one value applies to all layers). The
 * dual-emit pipeline forwards comma-form values verbatim, which
 * react-native-web's StyleSheet validator rejects with `Invalid style
 * property of "backgroundPosition". Value is "0% 0%,0% 0%" but only
 * single values are supported.` Collapsing identical comma values to
 * the lone single value is semantically equivalent on iOS / Android
 * (CSS cycling) and keeps rn-web happy.
 */
const LAYERED_COMMA_PROPS: ReadonlySet<string> = new Set([
  'backgroundPosition',
  'backgroundSize',
  'backgroundRepeat',
]);

export function isLayeredCommaProp(camel: string): boolean {
  return LAYERED_COMMA_PROPS.has(camel);
}

/**
 * Collapse a comma-form value to its single-value equivalent when every
 * layer carries the same string. Returns the input unchanged when the
 * commas reflect a real layered intent (values differ) or when there's
 * no top-level comma at all.
 */
export function collapseIdenticalCommas(value: string): string {
  if (value.indexOf(',') === -1) return value;
  const parts = splitTopLevelCommas(value, true);
  if (parts.length <= 1) return value;
  const first = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (parts[i] !== first) return value;
  }
  return first;
}

/**
 * Primary runtime key for a passthrough prop, used by the animation
 * adapter to match transition descriptors against `baseValues` keys.
 * For dual-emit props (the four `background*`) the native key wins:
 * gradient transitions only make sense on native anyway (rn-web has
 * its own CSS animation pathway and doesn't go through our adapter).
 */
export function getPrimaryPassthroughKey(camel: string): string | undefined {
  const keys = PASSTHROUGH_PROPS.get(camel);
  return keys === undefined ? undefined : keys[0];
}

/**
 * `experimental_backgroundSize` native bug workaround.
 *
 * RN 0.85's `BackgroundSize.kt` parser only accepts `ReadableType.Map`
 * (`{ x, y }`) for each layer. JS-side `processBackgroundSize.js`
 * preserves `cover` / `contain` as bare strings, so the native parse
 * returns null for those entries. When ALL layers' sizes are keyword
 * form the resulting list is empty, then `BackgroundImageDrawable.kt`
 * does `index % size` on draw → `ArithmeticException: divide by zero`
 * → process self-kills via SIGKILL. The user sees the app vanish.
 *
 * Why `auto` is the spec-correct fold for our gradient-only path:
 *
 * `BackgroundImageDrawable.calculateBackgroundImageSize` is invoked
 * with `imageWidth = containerWidth, imageHeight = containerHeight`
 * for every layer (the native side has no intrinsic dimensions for
 * a gradient and uses the box as the implicit image size). When
 * `backgroundSize` is null or both axes are `auto`, the function
 * skips the override branch and returns `(containerWidth,
 * containerHeight)` — which is exactly what CSS Backgrounds 3 §3.10
 * specifies for cover / contain over an image with no intrinsic
 * dimensions and no preferred aspect ratio. So for a gradient,
 * `cover` ≡ `contain` ≡ `auto` (all three paint over the full area).
 *
 * `auto` is the honest fold here: it asks the renderer for "the
 * image's natural dimensions," which the native side already
 * resolves to container-fill for aspect-less images. A literal
 * `100% 100%` would also paint identically but makes a stronger
 * (and potentially misleading) dimension claim for any future
 * non-gradient image path.
 *
 * The url() image path in v7 doesn't traverse `experimental_*`:
 * `applyBackgroundBlendModePolyfill` rebuilds url() layers as
 * `<Image resizeMode>` (cover / contain handled there directly).
 *
 * The standard `backgroundSize` key still ships the original
 * keyword for rn-web, where the browser handles cover / contain
 * semantics natively against any image type.
 *
 * Once RN's native parser handles String tokens for cover / contain
 * directly, drop this substitution.
 */
const SIZE_KEYWORD_NATIVE_SUBSTITUTE = 'auto';
const SIZE_KEYWORD_PATTERN = /\b(?:cover|contain)\b/g;

export function substituteBackgroundSizeKeywordsForNative(value: string): string {
  if (value.indexOf('cover') === -1 && value.indexOf('contain') === -1) return value;
  return value.replace(SIZE_KEYWORD_PATTERN, SIZE_KEYWORD_NATIVE_SUBSTITUTE);
}

/**
 * `backgroundPosition` rn-web validator workaround.
 *
 * rn-web's `validate.js` flags `backgroundPosition` whenever the
 * string has more than one top-level value (`valueParser.nodes.length
 * > 1`), so any two-axis position — `0 0`, `0% 0%`, `top left`,
 * `50% 50%` — produces a console.error and the prop is dropped from
 * the style anyway. The native side (iOS / Android) accepts the
 * full two-axis grammar, so the prop is only problematic on the
 * rn-web key.
 *
 * The asymmetric dual-emit: any two-axis form skips the
 * `backgroundPosition` (rn-web) emission; the `experimental_*` key
 * still flows so iOS / Android see the value. rn-web therefore
 * falls back to its CSS default (`0% 0%`) silently — the same
 * paint it would have produced after dropping the invalid value,
 * minus the warning. Single-token forms (`center`, `top`, `left`,
 * `0`) pass through to both keys.
 */
export function isMultiTokenPosition(value: string): boolean {
  // Top-level comma → multi-layer; each layer parsed separately
  // upstream, so this helper only sees a single layer's value.
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Two or more whitespace-separated runs of non-whitespace = multi-token.
  for (let i = 0; i < trimmed.length; i++) {
    const c = trimmed.charCodeAt(i);
    if (c === 32 || c === 9 || c === 10 || c === 13) {
      // First whitespace: check that at least one non-whitespace follows.
      for (let j = i + 1; j < trimmed.length; j++) {
        const c2 = trimmed.charCodeAt(j);
        if (c2 !== 32 && c2 !== 9 && c2 !== 10 && c2 !== 13) return true;
      }
      return false;
    }
  }
  return false;
}
