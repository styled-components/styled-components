import { Dict } from '../../../types';
import {
  consumeDimensionLike,
  directional,
  tokenToValue,
  withoutSlashes,
} from '../shorthandHelpers';
import { warnOnce } from '../dev';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

// Pre-computed key sets; avoids per-call `prefix + dir + suffix`
// concatenation that showed up as ~6% of cold-compile time.
const MARGIN_KEYS = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] as const;
const PADDING_KEYS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
const BORDER_WIDTH_KEYS = [
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
] as const;
const BORDER_RADIUS_KEYS = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
] as const;

export function marginShorthand(tokens: Token[]) {
  return directional(tokens, 'margin', MARGIN_KEYS);
}

export function paddingShorthand(tokens: Token[]) {
  return directional(tokens, 'padding', PADDING_KEYS);
}

/** `border-width: X [Y [Z [W]]]` → four directional widths. */
export function borderWidthShorthand(tokens: Token[]) {
  return directional(tokens, 'borderWidth', BORDER_WIDTH_KEYS);
}

/** `border-radius: X [Y [Z [W]]]` (simple form). Slash-separated
 * elliptical radii are browser-only; RN exposes circular corner radii. */
export function borderRadiusShorthand(tokens: Token[]) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind === TokenKind.Slash) {
      const raw = rawTokens(tokens);
      if (__NATIVE_WEB__) return { borderRadius: raw };
      const circular = collapseCircularSlashRadius(tokens);
      if (circular !== null) return circular;
      if (__DEV__) {
        warnOnce(
          'native-border-radius-elliptical',
          '`border-radius: ' +
            raw +
            '` is ignored on React Native because iOS and Android cannot draw separate horizontal and vertical corner radii.',
          raw
        );
      }
      return {};
    }
  }
  return directional(tokens, 'borderRadius', BORDER_RADIUS_KEYS);
}

/**
 * `gap` handler. RN 0.85 has native `gap` (single value) plus separate `rowGap`
 * / `columnGap`; the two-value shorthand splits accordingly.
 */
export function gapShorthand(tokens: Token[]): Dict<any> | null {
  if (tokens.length === 1 && tokens[0].kind === TokenKind.Ident && tokens[0].name === 'normal') {
    return { gap: 'normal' };
  }
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = consumeDimensionLike(stream);
  if (first === null) return null;
  if (stream.eof()) return { gap: tokenToValue(first) };
  const second = consumeDimensionLike(stream);
  if (second === null || !stream.eof()) return null;
  return { rowGap: tokenToValue(first), columnGap: tokenToValue(second) };
}

function rawTokens(tokens: Token[]): string {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === TokenKind.Slash) {
      out += out.length === 0 ? '/' : ' /';
      continue;
    }
    if (out.length !== 0) out += ' ';
    out += t.raw;
  }
  return out;
}

function collapseCircularSlashRadius(tokens: Token[]): Dict<any> | null {
  const horizontal: Token[] = [];
  const vertical: Token[] = [];
  let target = horizontal;
  let sawSlash = false;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === TokenKind.Slash) {
      if (sawSlash || target.length === 0) return null;
      sawSlash = true;
      target = vertical;
      continue;
    }
    if (!isRadiusValue(t)) return null;
    target.push(t);
  }

  if (!sawSlash || vertical.length === 0 || horizontal.length > 4 || vertical.length > 4) {
    return null;
  }

  const h = expandRadiusValues(horizontal);
  const v = expandRadiusValues(vertical);
  for (let i = 0; i < 4; i++) {
    if (tokenToValue(h[i]) !== tokenToValue(v[i])) return null;
  }

  if (
    tokenToValue(h[0]) === tokenToValue(h[1]) &&
    tokenToValue(h[0]) === tokenToValue(h[2]) &&
    tokenToValue(h[0]) === tokenToValue(h[3])
  ) {
    return { borderRadius: tokenToValue(h[0]) };
  }

  return {
    borderTopLeftRadius: tokenToValue(h[0]),
    borderTopRightRadius: tokenToValue(h[1]),
    borderBottomRightRadius: tokenToValue(h[2]),
    borderBottomLeftRadius: tokenToValue(h[3]),
  };
}

function expandRadiusValues(values: Token[]): [Token, Token, Token, Token] {
  const topLeft = values[0];
  const topRight = values[1] ?? topLeft;
  const bottomRight = values[2] ?? topLeft;
  const bottomLeft = values[3] ?? topRight;
  return [topLeft, topRight, bottomRight, bottomLeft];
}

function isRadiusValue(t: Token): boolean {
  if (t.kind === TokenKind.Length || t.kind === TokenKind.Number || t.kind === TokenKind.Percent) {
    return true;
  }
  if (t.kind === TokenKind.Sentinel) return true;
  if (t.kind === TokenKind.Function) {
    const name = t.name || '';
    return (
      name === 'env' || name === 'calc' || name === 'min' || name === 'max' || name === 'clamp'
    );
  }
  return false;
}
