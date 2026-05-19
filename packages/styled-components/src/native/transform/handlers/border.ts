import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import {
  colorTokenToRnStyleValue,
  consumeColor,
  consumeDimensionLike,
  directionalColor,
  tokenToValue,
  withoutSlashes,
} from '../shorthandHelpers';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

const BORDER_COLOR_KEYS = [
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
] as const;
const RN_BORDER_STYLES = new Set(['solid', 'dotted', 'dashed', 'none']);
const CSS_LINE_STYLES = new Set([
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);
const RN_OUTLINE_STYLES = new Set(['solid', 'dotted', 'dashed']);
const WEB_ONLY_OUTLINE_STYLES = new Set(['auto', 'double', 'groove', 'ridge', 'inset', 'outset']);

function warnUnsupportedBorderStyle(name: string): void {
  if (!__DEV__) return;
  warnOnce(
    'native-border-style-unsupported',
    '`border-style: ' +
      name +
      "` is ignored on React Native. iOS and Android render only 'solid', 'dotted', 'dashed', or 'none'.",
    name
  );
}

function warnMultipleBorderStyles(value: string): void {
  if (!__DEV__) return;
  warnOnce(
    'native-border-style-multiple',
    '`border-style: ' +
      value +
      '` uses per-side styles that React Native cannot express. iOS and Android use the first style.',
    value
  );
}

function normalizeNativeBorderStyle(name: string): Dict<any> | null {
  if (name === 'hidden') return { borderStyle: 'none', borderWidth: 0 };
  if (RN_BORDER_STYLES.has(name)) return { borderStyle: name };
  if (__DEV__) warnUnsupportedBorderStyle(name);
  return null;
}

/**
 * `border: <width> || <style> || <color>`; order-agnostic composite.
 * v7 fix vs. CSSTN: `border: none` now emits `borderStyle: 'none'`
 * (not `'solid'`), matching web.
 */
export function borderShorthand(tokens: Token[]): Dict<any> | null {
  if (
    tokens.length === 1 &&
    tokens[0].kind === TokenKind.Ident &&
    (tokens[0].name === 'none' || tokens[0].name === 'hidden')
  ) {
    return { borderWidth: 0, borderStyle: 'none', borderColor: 'transparent' };
  }
  const stream = new TokenStream(withoutSlashes(tokens));
  let width: Token | null = null;
  let style: string | null = null;
  let color: Token | null = null;

  while (!stream.eof()) {
    const t = stream.peek()!;
    if (t.kind === TokenKind.Ident && CSS_LINE_STYLES.has(t.name!)) {
      if (style !== null) return null;
      style = t.name!;
      stream.consume();
      continue;
    }
    if (width === null) {
      const w = consumeDimensionLike(stream);
      if (w !== null) {
        width = w;
        continue;
      }
    }
    if (color === null) {
      const c = consumeColor(stream);
      if (c !== null) {
        color = c;
        continue;
      }
    }
    return null; // unrecognized token
  }

  if (!__NATIVE_WEB__ && style !== null) {
    const nativeStyle = normalizeNativeBorderStyle(style);
    if (nativeStyle === null) return {};
  }

  const out: Dict<any> = {};
  out.borderWidth =
    !__NATIVE_WEB__ && style === 'hidden' ? 0 : width !== null ? tokenToValue(width) : 1;
  out.borderStyle =
    style !== null ? (__NATIVE_WEB__ || style !== 'hidden' ? style : 'none') : 'solid';
  out.borderColor = color !== null ? colorTokenToRnStyleValue(color) : 'black';
  return out;
}

/** `border-color: <color> [<color> [<color> [<color>]]]`. */
export function borderColorShorthand(tokens: Token[]) {
  return directionalColor(tokens, 'borderColor', BORDER_COLOR_KEYS);
}

/**
 * `outline: <width> || <style> || <color>`. RN 0.85 has the longhands but not
 * the shorthand; outlineStyle on RN is restricted to solid / dotted / dashed.
 * Web-only styles warn and pass through so rn-web honors them.
 */
export function outlineShorthand(tokens: Token[]): Dict<any> | null {
  if (tokens.length === 1 && tokens[0].kind === TokenKind.Ident && tokens[0].name === 'none') {
    return { outlineWidth: 0, outlineStyle: 'solid', outlineColor: 'transparent' };
  }
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === TokenKind.Ident && t.name === 'hidden') {
      if (__DEV__) {
        warnOnce(
          'native-outline-style-hidden',
          '`outline: hidden` is invalid CSS; `hidden` is not a legal outline style. Use `outline-style: none` to remove the outline.',
          'hidden'
        );
      }
      return {};
    }
  }
  const stream = new TokenStream(withoutSlashes(tokens));
  let width: Token | null = null;
  let style: string | null = null;
  let color: Token | null = null;

  while (!stream.eof()) {
    const t = stream.peek()!;
    if (t.kind === TokenKind.Ident) {
      const name = t.name!;
      const webOnly = WEB_ONLY_OUTLINE_STYLES.has(name);
      if (webOnly || RN_OUTLINE_STYLES.has(name)) {
        if (style !== null) return null;
        style = name;
        stream.consume();
        if (__DEV__ && webOnly && !__NATIVE_WEB__) {
          warnOnce(
            'native-outline-style',
            '`outline-style: ' +
              name +
              "` is ignored on React Native. iOS and Android render only 'solid', 'dotted', or 'dashed'.",
            name
          );
        }
        continue;
      }
    }
    if (width === null) {
      const w = consumeDimensionLike(stream);
      if (w !== null) {
        width = w;
        continue;
      }
    }
    if (color === null) {
      const c = consumeColor(stream);
      if (c !== null) {
        color = c;
        continue;
      }
    }
    return null;
  }

  if (width === null && style === null && color === null) return null;
  const out: Dict<any> = {};
  if (width !== null) out.outlineWidth = tokenToValue(width);
  if (style !== null) out.outlineStyle = style;
  if (color !== null) out.outlineColor = colorTokenToRnStyleValue(color);
  return out;
}

/**
 * `border-style: <style>`; RN only accepts a single style, not per-side.
 * When multiple styles are supplied, we dev-warn and use the first.
 */
export function borderStyleShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const names: string[] = [];
  while (!stream.eof()) {
    const t = stream.consume();
    if (!t || t.kind !== TokenKind.Ident || !CSS_LINE_STYLES.has(t.name!)) {
      return null;
    }
    names.push(t.name!);
  }
  if (names.length === 0 || names.length > 4) return null;
  if (__NATIVE_WEB__) return { borderStyle: names.join(' ') };
  if (__DEV__ && names.length > 1 && hasMixedValues(names))
    warnMultipleBorderStyles(names.join(' '));
  return normalizeNativeBorderStyle(names[0]) ?? {};
}

function hasMixedValues(values: string[]): boolean {
  const first = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== first) return true;
  }
  return false;
}
