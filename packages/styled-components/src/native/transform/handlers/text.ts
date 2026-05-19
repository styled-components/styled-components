import { Dict } from '../../../types';
import { getReactNativePlatformOS, warnOnce } from '../dev';
import {
  colorTokenToRnStyleValue,
  consumeColor,
  consumeDimensionLike,
  tokenToValue,
  withoutSlashes,
} from '../shorthandHelpers';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

const DECORATION_LINES = new Set(['none', 'underline', 'line-through', 'overline', 'blink']);
const DECORATION_STYLES = new Set(['solid', 'double', 'dotted', 'dashed', 'wavy']);

/**
 * `text-align` handler. RN's `textAlign` accepts only `auto | left | right |
 * center | justify`. `start` / `match-parent` compile to `'left'` and `end`
 * compiles to `'right'`; RN's platform text engine (Android TextLayoutManager
 * + iOS RCTTextAttributes) re-swaps the visual edge when the inherited
 * paragraph direction is rtl, so pre-flipping here would double-correct and
 * land the text on the wrong edge. `justify-all` degrades to `justify` with a
 * dev warn. rn-web passes the full grammar through.
 */
const TEXT_ALIGN_NATIVE_PASS = new Set(['auto', 'left', 'right', 'center', 'justify']);

export function textAlignHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const value = t.name!;

  if (__NATIVE_WEB__) {
    return { textAlign: value };
  }

  if (value === 'start' || value === 'match-parent') {
    return { textAlign: 'left' };
  }
  if (value === 'end') {
    return { textAlign: 'right' };
  }
  if (value === 'justify-all') {
    if (__DEV__) {
      warnOnce(
        'native-text-align-justify-all-degrades',
        '`text-align: justify-all` falls back to `justify` on React Native because iOS and Android cannot justify the final line separately. rn-web keeps the authored value.',
        value
      );
    }
    return { textAlign: 'justify' };
  }
  if (TEXT_ALIGN_NATIVE_PASS.has(value)) {
    return { textAlign: value };
  }
  return null;
}

// `text-align-all` shares the `text-align` grammar; route through the same
// handler so direction-aware folding and `justify-all` degradation match.
register('textAlignAll', textAlignHandler);

/**
 * `text-decoration: <line> || <style> || <color>` → split into longhands.
 * Supports the dual-line form `underline line-through`, which is stored as
 * a single space-separated value in canonical order (underline first).
 */
export function textDecorationShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  let line: string | null = null;
  let style: string | null = null;
  let color: Token | null = null;

  while (!stream.eof()) {
    const t = stream.peek()!;
    if (t.kind === TokenKind.Ident && DECORATION_LINES.has(t.name!)) {
      if (line !== null) return null;
      const collected: string[] = [t.name!];
      stream.consume();
      while (!stream.eof()) {
        const next = stream.peek()!;
        if (next.kind === TokenKind.Ident && DECORATION_LINES.has(next.name!)) {
          collected.push(next.name!);
          stream.consume();
        } else break;
      }
      if (collected.length > 1 && collected.indexOf('none') !== -1) return null;
      collected.sort().reverse();
      line = collected.join(' ');
      continue;
    }
    if (t.kind === TokenKind.Ident && DECORATION_STYLES.has(t.name!)) {
      if (style !== null) return null;
      style = t.name!;
      stream.consume();
      if (!__NATIVE_WEB__ && style === 'wavy') {
        if (__DEV__) {
          warnOnce(
            'native-text-decoration-style-wavy',
            '`text-decoration-style: wavy` is ignored on React Native because iOS and Android cannot draw wavy underlines. Falling back to solid.',
            style
          );
        }
        style = 'solid';
      }
      continue;
    }
    const c = consumeColor(stream);
    if (c !== null) {
      if (color !== null) return null;
      color = c;
      continue;
    }
    return null;
  }

  if (__DEV__ && color !== null && getReactNativePlatformOS() === 'android') {
    warnOnce(
      'native-text-decoration-color-android',
      '`text-decoration-color` is ignored on Android in React Native. Underlines use the text color there; iOS and rn-web keep the authored color.',
      color.raw
    );
  }
  return {
    textDecorationLine: line !== null ? line : 'none',
    textDecorationStyle: style !== null ? style : 'solid',
    textDecorationColor: color !== null ? colorTokenToRnStyleValue(color) : 'black',
  };
}

/**
 * `text-decoration-line: <line>{1,4}`. The `none` keyword is exclusive; it
 * can't combine with any other line keyword.
 */
export function textDecorationLineShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const lines: string[] = [];
  while (!stream.eof()) {
    const t = stream.consume()!;
    if (t.kind !== TokenKind.Ident || !DECORATION_LINES.has(t.name!)) return null;
    lines.push(t.name!);
  }
  if (lines.length === 0) return null;
  if (lines.length > 1 && lines.indexOf('none') !== -1) return null;
  lines.sort().reverse();
  return { textDecorationLine: lines.join(' ') };
}

/**
 * `text-shadow: <offset-x> <offset-y> [<blur>] [<color>]` (any order
 * relative to the color) → RN's three split longhands.
 */
export function textShadowShorthand(tokens: Token[]): Dict<any> | null {
  const s = parseShadow(tokens);
  if (s === null) return null;
  return {
    textShadowOffset: s.offset,
    textShadowRadius: s.radius,
    textShadowColor: s.color,
  };
}

/** `shadow-offset` / `text-shadow-offset`: `<x> [<y>]` → `{width, height}`. */
export function shadowOffsetShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const x = consumeDimensionLike(stream);
  if (x === null) return null;
  const y = !stream.eof() ? consumeDimensionLike(stream) : x;
  if (y === null || !stream.eof()) return null;
  return { shadowOffset: { width: tokenToValue(x), height: tokenToValue(y) } };
}

export function textShadowOffsetShorthand(tokens: Token[]): Dict<any> | null {
  const r = shadowOffsetShorthand(tokens);
  if (r === null) return null;
  return { textShadowOffset: r.shadowOffset };
}

interface ParsedShadow {
  offset: { width: number | string; height: number | string };
  radius: number | string;
  color: unknown;
}

function parseShadow(tokens: Token[]): ParsedShadow | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = stream.peek();
  if (
    first &&
    first.kind === TokenKind.Ident &&
    first.name === 'none' &&
    stream.tokens.length === 1
  ) {
    return { offset: { width: 0, height: 0 }, radius: 0, color: 'black' };
  }

  let offsetX: Token | null = null;
  let offsetY: Token | null = null;
  let radius: Token | null = null;
  let color: Token | null = null;

  while (!stream.eof()) {
    if (offsetX === null) {
      const x = consumeDimensionLike(stream);
      if (x !== null) {
        offsetX = x;
        const y = consumeDimensionLike(stream);
        if (y === null) return null;
        offsetY = y;
        const save = stream.save();
        const r = consumeDimensionLike(stream);
        if (r !== null) radius = r;
        else stream.rewind(save);
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

  if (offsetX === null || offsetY === null) return null;
  return {
    offset: { width: tokenToValue(offsetX), height: tokenToValue(offsetY) },
    radius: radius !== null ? tokenToValue(radius) : 0,
    color: color !== null ? colorTokenToRnStyleValue(color) : 'black',
  };
}
