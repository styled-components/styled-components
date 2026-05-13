import { Dict } from '../../../types';
import { getReactNativePlatformOS, warnOnce } from '../dev';
import {
  consumeColor,
  consumeDimensionLike,
  tokenToValue,
  withoutSlashes,
} from '../shorthandHelpers';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * Compile-time marker for `text-align: start | end | match-parent`.
 * The runtime resolver in `polyfills/resolvers.ts` reads
 * `env.direction` to map the keyword to `'left'` or `'right'`.
 *
 * Format: `\0scta:<start|end|match-parent>`. The 4-character tag
 * `scta` differentiates from the theme sentinel `\0sc:<path>:<fallback>`
 * at the fourth code point (`t` vs `:`).
 */
export const TEXT_ALIGN_DIRECTION_PREFIX = '\0scta:';

const DECORATION_LINES = new Set(['none', 'underline', 'line-through', 'overline', 'blink']);
const DECORATION_STYLES = new Set(['solid', 'double', 'dotted', 'dashed', 'wavy']);

/**
 * CSS Text 4 §7.1 (`text-align`). Initial value is `start`.
 *
 * RN's `textAlign` only accepts `'auto' | 'left' | 'right' | 'center' |
 * 'justify'` (per `TextStyleIOS.js` / `TextStyleAndroid.js`); `start` /
 * `end` / `match-parent` are spec values RN doesn't recognise and
 * would silently drop. rn-web honors the full spec set.
 *
 * Direction-aware resolution: v7 plumbs `cascade.direction` through
 * NativeStyleContext, so `start` and `end` resolve to `'left'` or
 * `'right'` at render time based on the inherited writing direction.
 * `match-parent` is an alias of `start` in horizontal-tb (which is
 * Yoga's only writing mode), so it maps identically.
 *
 * `justify-all` (CSS Text 4 §7.1) forces justification on the last
 * line; RN has no last-line surface so it degrades to `justify`
 * with a one-time dev warn.
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

  if (value === 'start' || value === 'end' || value === 'match-parent') {
    return { textAlign: TEXT_ALIGN_DIRECTION_PREFIX + value };
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

/**
 * CSS Text 4 §7.3 — `text-align-all` is the descendant-applying base
 * property; `text-align` is a shorthand over it plus `text-align-last`.
 * Routes through the same handler so direction-aware folding and
 * `justify-all` degradation apply uniformly.
 */
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
        if (
          next.kind === TokenKind.Ident &&
          DECORATION_LINES.has(next.name!) &&
          collected[0] !== 'none'
        ) {
          collected.push(next.name!);
          stream.consume();
        } else break;
      }
      collected.sort().reverse();
      line = collected.join(' ');
      continue;
    }
    if (t.kind === TokenKind.Ident && DECORATION_STYLES.has(t.name!)) {
      if (style !== null) return null;
      style = t.name!;
      stream.consume();
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
    textDecorationColor: color !== null ? color.raw : 'black',
  };
}

/**
 * `text-decoration-line: <line>{1,4}`. Per CSS Text Decoration 4 §3.1
 * the `none` keyword is exclusive — it can't be combined with any
 * other line keyword.
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
  color: string;
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
    color: color !== null ? color.raw : 'black',
  };
}
