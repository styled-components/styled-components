import { splitTopLevelCommas } from '../../parser/parser';
import { tokenize } from './tokenize';
import { Token, TokenKind } from './tokens';

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
  // CSS Images 4. <Image> only. RN 0.85's iOS and Android Image
  // components read `objectFit` from style and convert to resizeMode
  // internally; rn-web's Image ignores `objectFit` entirely and reads
  // `resizeMode` instead, so the rn-web branch is handled by a
  // dedicated handler in `polyfills/objectFit.ts` that lifts a
  // resizeMode prop. Identity passthrough is correct for native.
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

const HORIZONTAL_POSITION_KEYWORDS = new Set(['left', 'right']);
const VERTICAL_POSITION_KEYWORDS = new Set(['top', 'bottom']);
const POSITION_KEYWORDS = new Set(['left', 'right', 'top', 'bottom', 'center']);
const SIZE_KEYWORDS = new Set(['auto', 'cover', 'contain']);
const SINGLE_REPEAT_KEYWORDS = new Set(['repeat-x', 'repeat-y']);
const TWO_VALUE_REPEAT_KEYWORDS = new Set(['repeat', 'no-repeat', 'space', 'round']);

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

function isLengthPercentageToken(t: Token): boolean {
  if (t.kind === TokenKind.Function) {
    return t.name === 'calc' || t.name === 'min' || t.name === 'max' || t.name === 'clamp';
  }
  return (
    t.kind === TokenKind.Length ||
    t.kind === TokenKind.Percent ||
    // CSS accepts unitless zero anywhere a length is allowed; non-zero
    // numbers are not <length-percentage>.
    (t.kind === TokenKind.Number && t.value === 0)
  );
}

function isNonNegativeLengthPercentageToken(t: Token): boolean {
  return isLengthPercentageToken(t) && (t.value === undefined || t.value >= 0);
}

function isIdent(t: Token, values: ReadonlySet<string>): boolean {
  return t.kind === TokenKind.Ident && t.name !== undefined && values.has(t.name);
}

function positionAxis(t: Token): 'horizontal' | 'vertical' | 'center' | null {
  if (t.kind !== TokenKind.Ident || t.name === undefined) return null;
  if (HORIZONTAL_POSITION_KEYWORDS.has(t.name)) return 'horizontal';
  if (VERTICAL_POSITION_KEYWORDS.has(t.name)) return 'vertical';
  return t.name === 'center' ? 'center' : null;
}

function isValidTwoTokenPosition(first: Token, second: Token): boolean {
  const firstIsLp = isLengthPercentageToken(first);
  const secondIsLp = isLengthPercentageToken(second);
  if (firstIsLp) {
    const secondAxis = positionAxis(second);
    return secondIsLp || secondAxis === 'vertical' || secondAxis === 'center';
  }
  if (secondIsLp) {
    const firstAxis = positionAxis(first);
    return firstAxis === 'horizontal' || firstAxis === 'center';
  }

  const firstAxis = positionAxis(first);
  const secondAxis = positionAxis(second);
  if (firstAxis === null || secondAxis === null) return false;
  if (firstAxis === 'center' || secondAxis === 'center') return true;
  return firstAxis !== secondAxis;
}

function isValidEdgeOffsetPosition(tokens: Token[]): boolean {
  let sawHorizontal = false;
  let sawVertical = false;
  for (let i = 0; i < tokens.length; i++) {
    const axis = positionAxis(tokens[i]);
    if (axis === 'center') {
      if (!sawHorizontal) {
        sawHorizontal = true;
      } else if (!sawVertical) {
        sawVertical = true;
      } else {
        return false;
      }
      continue;
    }
    if (axis === null) return false;
    if (axis === 'horizontal') {
      if (sawHorizontal) return false;
      sawHorizontal = true;
    } else {
      if (sawVertical) return false;
      sawVertical = true;
    }
    const next = tokens[i + 1];
    if (next !== undefined && isLengthPercentageToken(next)) i++;
  }
  return sawHorizontal && sawVertical;
}

function isValidBackgroundPositionLayer(layer: string): boolean {
  const tokens = tokenize(layer);
  const len = tokens.length;
  if (len === 0 || len > 4) return false;
  if (len === 1) {
    return isLengthPercentageToken(tokens[0]) || isIdent(tokens[0], POSITION_KEYWORDS);
  }
  if (len === 2) return isValidTwoTokenPosition(tokens[0], tokens[1]);
  return isValidEdgeOffsetPosition(tokens);
}

function isValidBackgroundSizeLayer(layer: string): boolean {
  const tokens = tokenize(layer);
  const len = tokens.length;
  if (len === 0 || len > 2) return false;
  if (len === 1) {
    const t = tokens[0];
    return isNonNegativeLengthPercentageToken(t) || isIdent(t, SIZE_KEYWORDS);
  }
  for (let i = 0; i < len; i++) {
    const t = tokens[i];
    if (!isNonNegativeLengthPercentageToken(t) && (t.kind !== TokenKind.Ident || t.name !== 'auto'))
      return false;
  }
  return true;
}

function isValidBackgroundRepeatLayer(layer: string): boolean {
  const tokens = tokenize(layer);
  const len = tokens.length;
  if (len === 0 || len > 2) return false;
  if (len === 1) {
    const t = tokens[0];
    return isIdent(t, SINGLE_REPEAT_KEYWORDS) || isIdent(t, TWO_VALUE_REPEAT_KEYWORDS);
  }
  return (
    isIdent(tokens[0], TWO_VALUE_REPEAT_KEYWORDS) && isIdent(tokens[1], TWO_VALUE_REPEAT_KEYWORDS)
  );
}

function everyLayer(value: string, validate: (layer: string) => boolean): boolean {
  const parts = splitTopLevelCommas(value, true);
  if (parts.length === 0) return false;
  for (let i = 0; i < parts.length; i++) {
    if (!validate(parts[i])) return false;
  }
  return true;
}

export function isValidLayeredBackgroundValue(camel: string, value: string): boolean {
  if (camel === 'backgroundPosition') return everyLayer(value, isValidBackgroundPositionLayer);
  if (camel === 'backgroundSize') return everyLayer(value, isValidBackgroundSizeLayer);
  if (camel === 'backgroundRepeat') return everyLayer(value, isValidBackgroundRepeatLayer);
  return true;
}

function normalizeBackgroundPositionLayer(layer: string): string {
  const tokens = tokenize(layer);
  if (tokens.length !== 2) return layer;
  const first = tokens[0];
  const second = tokens[1];
  if (
    first.kind !== TokenKind.Ident ||
    second.kind !== TokenKind.Ident ||
    first.name === undefined ||
    second.name === undefined
  ) {
    return layer;
  }
  if (first.name === 'center') return second.name;
  if (second.name === 'center') return first.name;
  return layer;
}

export function normalizeBackgroundPositionValue(value: string): string {
  if (value.indexOf('center') === -1) return value;
  const parts = splitTopLevelCommas(value, true);
  let changed = false;
  for (let i = 0; i < parts.length; i++) {
    const normalized = normalizeBackgroundPositionLayer(parts[i]);
    if (normalized !== parts[i]) {
      changed = true;
      parts[i] = normalized;
    }
  }
  return changed ? parts.join(', ') : value;
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
 * Why `auto` is the right fold for our gradient-only path:
 *
 * `BackgroundImageDrawable.calculateBackgroundImageSize` is invoked with
 * `imageWidth = containerWidth, imageHeight = containerHeight` for every layer
 * (gradients have no intrinsic dimensions). When `backgroundSize` is null or
 * both axes are `auto`, that function skips the override branch and returns
 * `(containerWidth, containerHeight)`, so `cover ≡ contain ≡ auto` over a
 * gradient (all three paint over the full area).
 *
 * `auto` is the honest fold: it asks the renderer for the image's natural
 * dimensions, which the native side already resolves to container-fill for
 * aspect-less images. A literal `100% 100%` would paint identically but makes
 * a stronger (and potentially misleading) dimension claim for any future
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
 * > 1`), so any two-axis position (`0 0`, `0% 0%`, `top left`,
 * `50% 50%`) produces a console.error and the prop is dropped from
 * the style anyway. The native side (iOS / Android) accepts the
 * full two-axis grammar, so the prop is only problematic on the
 * rn-web key.
 *
 * The asymmetric dual-emit: any two-axis form skips the
 * `backgroundPosition` (rn-web) emission; the `experimental_*` key
 * still flows so iOS / Android see the value. rn-web therefore
 * falls back to its CSS default (`0% 0%`) silently; the same
 * paint it would have produced after dropping the invalid value,
 * minus the warning. Single-token forms (`center`, `top`, `left`,
 * `0`) pass through to both keys.
 */
export function isMultiTokenPosition(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Comma separates background layers; shorthand joins layers with ", ".
  // rn-web's parser also rejects multi-layer strings, so skip whenever a
  // layer boundary is present (covers `center,top` longhand with no
  // spaces around the comma).
  if (trimmed.indexOf(',') !== -1) return true;
  // Two or more whitespace-separated runs of non-whitespace = multi-token
  // within a single layer (`0 0`, `top left`).
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
