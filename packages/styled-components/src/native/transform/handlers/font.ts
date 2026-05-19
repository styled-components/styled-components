import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { isGenericFamily, resolveGenericFamily } from '../polyfills/genericFamily';
import { buildResolver } from '../polyfills/resolvers';
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

// CSS Values 4 §5.2 absolute length conversion table. 1in === 96px is the
// reference anchor; the rest derive from it via the standard relations.
const ABSOLUTE_LENGTH_PX_PER_UNIT: Record<string, number> = {
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / (25.4 * 4),
  pt: 96 / 72,
  pc: 16,
};

const FONT_WIDTH_KEYWORDS = new Set([
  'ultra-condensed',
  'extra-condensed',
  'condensed',
  'semi-condensed',
  'semi-expanded',
  'expanded',
  'extra-expanded',
  'ultra-expanded',
]);
const ABSOLUTE_SIZE_PX: Record<string, number> = {
  'xx-small': 9,
  'x-small': 10,
  small: 13,
  medium: 16,
  large: 18,
  'x-large': 24,
  'xx-large': 32,
  'xxx-large': 48,
};
const RELATIVE_SIZE_SENTINELS: Record<string, string> = {
  larger: '\0+',
  smaller: '\0-',
};
const SYSTEM_FONT_KEYWORDS = new Set([
  'caption',
  'icon',
  'menu',
  'message-box',
  'small-caption',
  'status-bar',
]);

function warnFontUnsupported(reason: 'width' | 'relative' | 'system', value: string): void {
  if (!__DEV__) return;
  if (reason === 'width') {
    warnOnce(
      'native-font-width-unsupported',
      '`font: ' +
        value +
        '` uses a font-width / font-stretch keyword. React Native does not control glyph width; the declaration is ignored. rn-web keeps the authored value.',
      value
    );
    return;
  }
  if (reason === 'relative') {
    warnOnce(
      'native-font-relative-size-unsupported',
      '`font: ' +
        value +
        '` uses a relative-size keyword (smaller / larger). The cascade does not track which keyword produced the inherited size, so the browser ramp navigation cannot be matched. Use a specific length such as `14px`.',
      value
    );
    return;
  }
  warnOnce(
    'native-font-system-name-unsupported',
    '`font: ' +
      value +
      '` is a system font name. There is no cross-platform mapping; pick a font-family explicitly.',
    value
  );
}

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

/** `font: [<style>] [<weight>] [<variant>] <size>[/<line-height>] <family>`. */
export function fontShorthand(tokens: Token[]): Dict<any> | null {
  if (tokens.length === 1 && tokens[0].kind === TokenKind.Ident) {
    const name = tokens[0].name!;
    if (SYSTEM_FONT_KEYWORDS.has(name)) {
      warnFontUnsupported('system', name);
      return {};
    }
  }
  // Substitute keyword font-sizes with deterministic values so web,
  // iOS, and Android resolve identically. Absolute-size keywords fold
  // to the CSS reference pixel value; relative-size keywords emit a
  // sentinel string the cascade resolver turns into the next ramp
  // entry (or a 1.2 / 1/1.2 factor) at render time.
  const normalized: Token[] = new Array(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === TokenKind.Ident && t.name !== undefined) {
      if (FONT_WIDTH_KEYWORDS.has(t.name)) {
        warnFontUnsupported('width', rawTokens(tokens));
        return {};
      }
      const sentinel = RELATIVE_SIZE_SENTINELS[t.name];
      if (sentinel !== undefined) {
        normalized[i] = { kind: TokenKind.Sentinel, raw: sentinel } as Token;
        continue;
      }
      const px = ABSOLUTE_SIZE_PX[t.name];
      if (px !== undefined) {
        normalized[i] = {
          kind: TokenKind.Length,
          raw: px + 'px',
          value: px,
          unit: 'px',
        } as Token;
        continue;
      }
    }
    normalized[i] = t;
  }
  const stream = new TokenStream(normalized);

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
  if (
    !sizeTok ||
    (sizeTok.kind !== TokenKind.Length &&
      sizeTok.kind !== TokenKind.Percent &&
      sizeTok.kind !== TokenKind.Sentinel)
  ) {
    return null;
  }
  const fontSize: number | string =
    sizeTok.kind === TokenKind.Sentinel ? sizeTok.raw : (tokenToValue(sizeTok) as number | string);

  let lineHeight: number | string | undefined;
  if (!stream.eof() && stream.peek()!.kind === TokenKind.Slash) {
    stream.consume();
    const lhTok = stream.consume();
    if (!lhTok) return null;
    if (lhTok.kind === TokenKind.Number) lineHeight = lhTok.value!;
    else if (lhTok.kind === TokenKind.Length || lhTok.kind === TokenKind.Percent) {
      if (!__NATIVE_WEB__ && lhTok.kind === TokenKind.Percent && typeof fontSize === 'number') {
        lineHeight = (fontSize * lhTok.value!) / 100;
      } else {
        lineHeight = tokenToValue(lhTok);
      }
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
      '`font-family` accepts one family on React Native. Extra comma-separated fallbacks are ignored on iOS and Android.',
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
 * `font-family: <family-name>+, …`. RN's `fontFamily` is a single string, so
 * comma-separated fallback lists collapse to the first family with a one-time
 * warn. Generic keywords (`serif`, `system-ui`, etc.) resolve to a platform
 * face on native; rn-web passes the full list through.
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
      '`font-family` accepts one family on React Native. Extra comma-separated fallbacks are ignored on iOS and Android.',
      family.name
    );
  }

  // Generic keyword resolution: native-only, bare idents only (quoted strings
  // are author-supplied face names).
  if (!__NATIVE_WEB__ && !family.quoted && isGenericFamily(family.name)) {
    return { fontFamily: resolveGenericFamily(family.name) };
  }
  return { fontFamily: family.name };
}

/**
 * `font-style: normal | italic | oblique [ <angle [-90deg,90deg]> | left | right ]?`.
 * RN's fontStyle only accepts `normal | italic`, so `oblique` (and its angle /
 * direction arguments) collapses to `italic` on native with a dev warn naming
 * the dropped argument. rn-web passes the declaration through. Out-of-range
 * angles are rejected on both branches.
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
 * `line-height` handler. RN accepts unitless multipliers and px lengths;
 * percentage and em / rem drop with a dev warn. rn-web defers to the browser.
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
    if (t.unit === 'em' || t.unit === 'rem' || t.unit === 'lh' || t.unit === 'rlh') {
      return { lineHeight: t.raw };
    }
    if (__DEV__) {
      warnOnce(
        'native-line-height-unit-unsupported',
        '`line-height: ' +
          t.raw +
          '` is ignored on React Native. Use a unitless multiplier (`line-height: 1.4`), px (`line-height: 20px`), or a font-relative unit (em / rem / lh / rlh).',
        t.unit
      );
    }
    return {};
  }
  if (t.kind === TokenKind.Percent) {
    // Defer to the cascade-resolver em path; percent and em both anchor
    // at the inherited font-size.
    if (t.value === undefined) return null;
    return { lineHeight: t.value / 100 + 'em' };
  }
  if (t.kind === TokenKind.Ident && t.name === 'normal') return {};
  return null;
}

/**
 * `letter-spacing` handler. Numeric and px values resolve at compile time;
 * font-relative units (em / rem / lh / rlh) defer to the cascade resolver so
 * the inherited font-size folds in at render time. rn-web passes through.
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
    if (t.unit === 'em' || t.unit === 'rem' || t.unit === 'lh' || t.unit === 'rlh') {
      return { letterSpacing: t.raw };
    }
    if (__DEV__) {
      warnOnce(
        'native-letter-spacing-unit-unsupported',
        '`letter-spacing: ' +
          t.raw +
          '` is ignored on React Native. Use a number, px, or font-relative unit (em / rem / lh).',
        t.unit
      );
    }
    return {};
  }
  if (t.kind === TokenKind.Ident && t.name === 'normal') return { letterSpacing: 0 };
  return null;
}

/**
 * Standalone `font-size` handler. Routes through the same sentinels the
 * `font:` shorthand emits so the cascade resolver can fold relative-size
 * keywords and percentages at render time.
 */
export function fontSizeHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || !stream.eof()) return null;

  if (__NATIVE_WEB__) {
    return { fontSize: t.raw };
  }

  if (t.kind === TokenKind.Ident && t.name !== undefined) {
    const name = t.name;
    const sentinel = RELATIVE_SIZE_SENTINELS[name];
    if (sentinel !== undefined) return { fontSize: sentinel };
    const px = ABSOLUTE_SIZE_PX[name];
    if (px !== undefined) return { fontSize: px };
    return null;
  }

  if (t.kind === TokenKind.Number && t.value === 0) {
    return { fontSize: 0 };
  }

  if (t.kind === TokenKind.Length) {
    if (t.value === undefined || t.value < 0) return null;
    if (t.unit === 'px' || t.unit === '') return { fontSize: t.value };
    // Absolute lengths convert statically to px per CSS Values 4 §5.2.
    // No render-time resolver needed.
    const absRatio = t.unit !== undefined ? ABSOLUTE_LENGTH_PX_PER_UNIT[t.unit] : undefined;
    if (absRatio !== undefined) return { fontSize: t.value * absRatio };
    // Everything else (em / rem / lh / rlh / viewport / container) is
    // accepted raw iff `buildResolver` knows how to fold it at render
    // time. Single source of truth — the parser acceptance set tracks
    // resolver coverage automatically. Remaining rejects are the
    // font-metric units (ex / cap / ch / ic + r-variants) RN can't
    // measure cross-platform.
    if (buildResolver(t.raw) !== null) return { fontSize: t.raw };
    return null;
  }

  if (t.kind === TokenKind.Percent) {
    if (t.value === undefined || t.value < 0) return null;
    return { fontSize: t.value / 100 + 'em' };
  }

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
 * `aspect-ratio: auto || <ratio>`. `auto` alone yields `'auto'` (replaced
 * elements like `<Image>` use intrinsic ratio; styled views have none).
 * `<ratio>` alone emits the number. Combined forms emit the ratio plus a dev
 * warn since RN has no intrinsic-ratio surface on non-replaced views.
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
  // `quoted` flag flows back to the generic-family gate; quotes opt the
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
