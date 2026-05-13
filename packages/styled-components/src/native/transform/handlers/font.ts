import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { isGenericFamily, resolveGenericFamily } from '../polyfills/genericFamily';
import { tokenToValue, withoutSlashes } from '../shorthandHelpers';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

const FONT_STYLES = new Set(['italic', 'oblique']);
const FONT_WEIGHTS = new Set([
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  'bold',
  'bolder',
  'lighter',
  'normal',
]);
const FONT_VARIANTS = new Set(['small-caps']);

function rawTokens(tokens: Token[]): string {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === TokenKind.Comma) {
      out += ',';
      continue;
    }
    if (out.length !== 0) out += ' ';
    out += t.raw;
  }
  return out;
}

/**
 * `font: [<style>] [<weight>] [<variant>] <size>[/<line-height>] <family>`
 * Slash handled inline; pre-stripping loses line-height association.
 */
export function fontShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);

  let fontStyle: string | undefined;
  let fontWeight: string | number | undefined;
  let fontVariant: string[] | undefined;

  // Up to 3 leading keywords (style/weight/variant), any order
  for (let i = 0; i < 3 && !stream.eof(); i++) {
    const t = stream.peek()!;
    if (t.kind === TokenKind.Ident && t.name === 'normal') {
      stream.consume();
      continue;
    }
    if (fontStyle === undefined && t.kind === TokenKind.Ident && FONT_STYLES.has(t.name!)) {
      fontStyle = t.name!;
      stream.consume();
      continue;
    }
    if (
      fontWeight === undefined &&
      ((t.kind === TokenKind.Ident && FONT_WEIGHTS.has(t.name!)) ||
        (t.kind === TokenKind.Number && FONT_WEIGHTS.has(String(t.value))))
    ) {
      fontWeight = t.kind === TokenKind.Number ? t.value! : t.name!;
      stream.consume();
      continue;
    }
    if (fontVariant === undefined && t.kind === TokenKind.Ident && FONT_VARIANTS.has(t.name!)) {
      fontVariant = [t.name!];
      stream.consume();
      continue;
    }
    break;
  }

  // Required: font-size
  const sizeTok = stream.consume();
  if (!sizeTok || (sizeTok.kind !== TokenKind.Length && sizeTok.kind !== TokenKind.Percent)) {
    return null;
  }
  const fontSize = tokenToValue(sizeTok);

  let lineHeight: number | string | undefined;
  if (!stream.eof() && stream.peek()!.kind === TokenKind.Slash) {
    stream.consume();
    const lhTok = stream.consume();
    if (!lhTok) return null;
    if (lhTok.kind === TokenKind.Number) lineHeight = lhTok.value!;
    else if (lhTok.kind === TokenKind.Length || lhTok.kind === TokenKind.Percent) {
      lineHeight = tokenToValue(lhTok);
    } else return null;
  }

  // Required: font-family (one or more idents/strings)
  const familyStart = stream.pos;
  const fontFamily = readFontFamily(stream);
  if (fontFamily === null) return null;

  const hasFamilyFallbacks = !stream.eof();
  if (__DEV__ && hasFamilyFallbacks && !__NATIVE_WEB__) {
    warnOnce(
      'native-font-family-fallbacks-dropped',
      '`font-family` accepts one family on React Native. Extra comma-separated fallbacks are ignored on iOS and Android; rn-web keeps the full list.',
      fontFamily.name
    );
  }

  const resolvedFamily = __NATIVE_WEB__
    ? rawTokens(stream.tokens.slice(familyStart))
    : !fontFamily.quoted && isGenericFamily(fontFamily.name)
      ? resolveGenericFamily(fontFamily.name)
      : fontFamily.name;

  const out: Dict<any> = {
    fontStyle: fontStyle !== undefined ? fontStyle : 'normal',
    fontWeight: fontWeight !== undefined ? fontWeight : 'normal',
    fontVariant: fontVariant !== undefined ? fontVariant : [],
    fontSize,
    fontFamily: resolvedFamily,
  };
  if (lineHeight !== undefined) out.lineHeight = lineHeight;
  return out;
}

/**
 * `font-family: <family-name>+, …` (CSS Fonts 4 §2.1).
 *
 * RN's `fontFamily` is a single string — comma-separated fallback lists
 * collapse to just the first family. We warn once per truncated list so
 * the silent narrowing surfaces; rn-web hands the full list to the
 * browser and its CSS engine selects.
 *
 * Generic family keywords (`serif`, `sans-serif`, `system-ui`,
 * `ui-monospace`, etc., per §2.1.5) resolve to a platform-specific
 * face name on native; rn-web passes them through.
 */
export function fontFamilyShorthand(tokens: Token[]): Dict<any> | null {
  if (__NATIVE_WEB__) return tokens.length === 0 ? null : { fontFamily: rawTokens(tokens) };

  const stream = new TokenStream(tokens);
  const family = readFontFamily(stream);
  if (family === null) return null;

  const hasFallbacks = !stream.eof();
  if (__DEV__ && hasFallbacks) {
    warnOnce(
      'native-font-family-fallbacks-dropped',
      '`font-family` accepts one family on React Native. Extra comma-separated fallbacks are ignored on iOS and Android; rn-web keeps the full list.',
      family.name
    );
  }

  // Generic keyword resolution — only on native, only for bare idents;
  // quoted strings opt out per CSS Fonts 4 §3.1.1, and rn-web keeps the
  // keyword so the browser's user-agent stylesheet resolves.
  if (!__NATIVE_WEB__ && !family.quoted && isGenericFamily(family.name)) {
    return { fontFamily: resolveGenericFamily(family.name) };
  }
  return { fontFamily: family.name };
}

/**
 * `font-style: normal | italic | oblique [ <angle [-90deg,90deg]> | left | right ]?`
 * per CSS Fonts 4 §2.4. RN's fontStyle only accepts `normal | italic`;
 * the `oblique` keyword (and its `left` / `right` italic-direction
 * shorthands) map to `italic` on native. The optional angle is dropped
 * on RN with a one-time dev warn that names the angle. A `transform:
 * skewX` polyfill was considered but rejected — element-level skew
 * shears the whole box (kerning, descenders, background, padding) which
 * is not the same as the browser's per-glyph font synthesis. rn-web
 * passes the declaration through so the browser handles the slant axis
 * natively. Angles outside the spec range [-90deg, 90deg] are rejected
 * on both branches (`null` → declaration drops).
 */
const OBLIQUE_DIRECTION = new Set(['left', 'right']);

export function fontStyleHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const first = stream.consume();
  if (!first || first.kind !== TokenKind.Ident) return null;
  const name = first.name;
  if (name === undefined) return null;

  if (name === 'normal' || name === 'italic') {
    if (!stream.eof()) return null;
    return { fontStyle: name };
  }

  if (name === 'oblique') {
    if (stream.eof()) return { fontStyle: __NATIVE_WEB__ ? 'oblique' : 'italic' };
    const arg = stream.consume();
    if (!arg || !stream.eof()) return null;
    if (arg.kind === TokenKind.Ident && arg.name && OBLIQUE_DIRECTION.has(arg.name)) {
      if (__NATIVE_WEB__) return { fontStyle: 'oblique ' + arg.name };
      return { fontStyle: 'italic' };
    }
    if (arg.kind !== TokenKind.Angle) return null;
    const deg = degreesOf(arg);
    if (deg === null || deg < -90 || deg > 90) return null;
    if (__NATIVE_WEB__) return { fontStyle: 'oblique ' + arg.raw };
    if (__DEV__) {
      warnOnce(
        'native-font-oblique-angle-dropped',
        '`font-style: oblique <angle>` maps to `italic` on React Native because RN cannot control glyph slant. For exact slant, use an italic font face or a slant-axis variable font.',
        arg.raw
      );
    }
    return { fontStyle: 'italic' };
  }
  return null;
}

/** Convert an Angle token's value into degrees regardless of source unit. */
function degreesOf(t: Token): number | null {
  if (t.value === undefined) return null;
  switch (t.unit) {
    case 'deg':
      return t.value;
    case 'rad':
      return (t.value * 180) / Math.PI;
    case 'grad':
      return (t.value * 360) / 400;
    case 'turn':
      return t.value * 360;
    default:
      return null;
  }
}

/**
 * `line-height` characterization lock per CSS Inline 3. RN accepts
 * unitless multipliers and px lengths; percentage and em / rem values
 * silently drop. We warn once at the property boundary so the gap
 * surfaces. rn-web defers to the browser.
 */
export function lineHeightHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || !stream.eof()) return null;

  if (__NATIVE_WEB__) {
    return { lineHeight: t.raw };
  }

  if (t.kind === TokenKind.Number) return { lineHeight: t.value };
  if (t.kind === TokenKind.Length) {
    if (t.unit === 'px' || t.unit === '') return { lineHeight: t.value };
    if (__DEV__) {
      warnOnce(
        'native-line-height-unit-unsupported',
        '`line-height: ' +
          t.raw +
          '` is ignored on React Native. Use a unitless multiplier (`line-height: 1.4`) or px (`line-height: 20px`) on iOS and Android.',
        t.unit
      );
    }
    return {};
  }
  if (t.kind === TokenKind.Percent) {
    if (__DEV__) {
      warnOnce(
        'native-line-height-percent-unsupported',
        '`line-height` percentages are ignored on React Native. Use a unitless multiplier instead; `line-height: 1.4` is equivalent to `140%`.',
        t.raw
      );
    }
    return {};
  }
  if (t.kind === TokenKind.Ident && t.name === 'normal') return {};
  return null;
}

/**
 * `letter-spacing` characterization lock per CSS Text 3 §11.1. RN's
 * letterSpacing accepts unitless numbers and px lengths only; em / rem /
 * percentage values silently drop on native. rn-web defers to the browser.
 */
export function letterSpacingHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || !stream.eof()) return null;

  if (__NATIVE_WEB__) {
    return { letterSpacing: t.raw };
  }

  if (t.kind === TokenKind.Number) return { letterSpacing: t.value };
  if (t.kind === TokenKind.Length) {
    if (t.unit === 'px' || t.unit === '') return { letterSpacing: t.value };
    if (__DEV__) {
      warnOnce(
        'native-letter-spacing-unit-unsupported',
        '`letter-spacing: ' +
          t.raw +
          '` is ignored on React Native. Use a number or px value on iOS and Android.',
        t.unit
      );
    }
    return {};
  }
  if (t.kind === TokenKind.Ident && t.name === 'normal') return { letterSpacing: 0 };
  return null;
}

/** `font-variant: <ident>+`. RN keeps the array form. */
export function fontVariantShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const out: string[] = [];
  while (!stream.eof()) {
    const t = stream.consume();
    if (!t || (t.kind !== TokenKind.Ident && t.kind !== TokenKind.Comma)) return null;
    if (t.kind === TokenKind.Ident) out.push(t.name!);
  }
  if (out.length === 0) return null;
  return { fontVariant: out };
}

/**
 * CSS Sizing 4 §4.1 (`aspect-ratio`). Syntax: `auto || <ratio>`. The
 * shorthand accepts `auto`, a `<ratio>`, or both in any order.
 *
 * - `auto` alone: emits `aspectRatio: 'auto'`. Replaced elements
 *   (`<Image>`) use their intrinsic ratio; other styled views see no
 *   constraint (matches the initial value).
 * - `<ratio>` alone: emits the resolved number.
 * - `auto <ratio>` / `<ratio> auto`: emits the ratio. On replaced
 *   elements the intrinsic ratio is used if available, falling back to
 *   the explicit number; on non-replaced views the `auto` half is a
 *   no-op (RN has no intrinsic ratio surface). Emits a dev warn so the
 *   author knows the auto half doesn't carry on styled views.
 */
export function aspectRatioShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  let auto = false;
  let ratio: number | null = null;

  while (!stream.eof()) {
    const t = stream.peek()!;
    if (!auto && t.kind === TokenKind.Ident && t.name === 'auto') {
      auto = true;
      stream.consume();
      continue;
    }
    if (ratio === null && t.kind === TokenKind.Number) {
      const numerator = t.value!;
      stream.consume();
      if (!stream.eof() && stream.peek()!.kind === TokenKind.Slash) {
        stream.consume();
        const divisor = stream.consume();
        if (!divisor || divisor.kind !== TokenKind.Number) return null;
        if (numerator <= 0 || divisor.value! <= 0) return null;
        ratio = numerator / divisor.value!;
      } else {
        if (numerator <= 0) return null;
        ratio = numerator;
      }
      continue;
    }
    return null;
  }

  if (auto && ratio === null) return { aspectRatio: 'auto' };
  if (ratio !== null) {
    if (__DEV__ && auto) {
      warnOnce(
        'native-aspect-ratio-auto-intrinsic',
        '`aspect-ratio: auto <ratio>` only uses `auto` for image-like components with natural dimensions. Other styled views use the ratio and ignore `auto`; remove `auto` to silence this warning.',
        String(ratio)
      );
    }
    return { aspectRatio: ratio };
  }
  return null;
}

interface FontFamilyName {
  name: string;
  quoted: boolean;
}

function readFontFamily(stream: TokenStream): FontFamilyName | null {
  // Read the first family name. CSS allows multiple fallback families
  // separated by commas; RN's `fontFamily` is a single string; we
  // return the first family and document the limitation. Use `raw` not
  // `name` for the bare-ident path so the family's original casing is
  // preserved (RN is case-sensitive when matching platform fonts). The
  // `quoted` flag flows back to the generic-family gate — quotes opt the
  // family out of generic resolution regardless of the spelling inside.
  const t = stream.consume();
  if (!t) return null;
  if (t.kind === TokenKind.String) return { name: t.text!, quoted: true };
  if (t.kind === TokenKind.Ident) {
    const parts = [t.raw];
    while (!stream.eof()) {
      const next = stream.peek()!;
      if (next.kind === TokenKind.Ident) {
        parts.push(next.raw);
        stream.consume();
        continue;
      }
      break;
    }
    return { name: parts.join(' '), quoted: false };
  }
  return null;
}
