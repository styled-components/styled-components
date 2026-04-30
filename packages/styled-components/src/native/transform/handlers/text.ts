import { Dict } from '../../../types';
import {
  consumeColor,
  consumeDimensionLike,
  tokenToValue,
  withoutSlashes,
} from '../shorthandHelpers';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

const DECORATION_LINES = new Set(['none', 'underline', 'line-through', 'overline', 'blink']);
const DECORATION_STYLES = new Set(['solid', 'double', 'dotted', 'dashed']);

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
      // Collect contiguous line tokens
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
      collected.sort().reverse(); // underline > line-through > …
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

  return {
    textDecorationLine: line !== null ? line : 'none',
    textDecorationStyle: style !== null ? style : 'solid',
    textDecorationColor: color !== null ? color.raw : 'black',
  };
}

/** `text-decoration-line: <line> [<line>]`. */
export function textDecorationLineShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const lines: string[] = [];
  while (!stream.eof()) {
    const t = stream.consume()!;
    if (t.kind !== TokenKind.Ident || !DECORATION_LINES.has(t.name!)) return null;
    lines.push(t.name!);
  }
  if (lines.length === 0) return null;
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
