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
