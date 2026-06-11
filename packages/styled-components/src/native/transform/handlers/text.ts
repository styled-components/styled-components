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
  let thickness: string | null = null;

  while (!stream.eof()) {
    const t = stream.peek()!;
    // `text-decoration-thickness` component: a <length-percentage> or the
    // `auto` / `from-font` keywords. RN can't honor it, but the rest of
    // the shorthand should still apply; consume the token, remember it,
    // and warn after the loop instead of failing the whole declaration.
    if (
      t.kind === TokenKind.Length ||
      t.kind === TokenKind.Percent ||
      (t.kind === TokenKind.Ident && (t.name === 'auto' || t.name === 'from-font'))
    ) {
      if (thickness !== null) return null;
      thickness = t.raw;
      stream.consume();
      continue;
    }
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
  const out: Dict<any> = {
    textDecorationLine: line !== null ? line : 'none',
    textDecorationStyle: style !== null ? style : 'solid',
    // An omitted color resets to the initial currentcolor. RN paints the
    // line in the text color when the key is absent, so emit an explicit
    // undefined: it clobbers any earlier text-decoration-color in the same
    // block while leaving the platform to its currentcolor behavior.
    textDecorationColor: color !== null ? colorTokenToRnStyleValue(color) : undefined,
  };
  if (thickness !== null) {
    if (__NATIVE_WEB__) {
      out.textDecorationThickness = thickness;
    } else if (__DEV__) {
      warnOnce(
        'native-text-decoration-thickness-unsupported',
        '`text-decoration-thickness: ' +
          thickness +
          '` has no effect on React Native; iOS and Android draw a fixed-position underline with no thickness, offset, or position control. For a heavier or offset underline, put a `border-bottom` on a wrapping View.',
        thickness
      );
    }
  }
  return out;
}

/**
 * `text-decoration-thickness`, `text-underline-offset`, and
 * `text-underline-position` have no React Native surface: RN draws a
 * fixed-position, fixed-weight underline with no control over thickness,
 * vertical offset, or which side of the text it sits on. Each native
 * handler drops the declaration and points at the border-bottom workaround.
 * rn-web passes the authored value straight through to the browser.
 */
function makeUnsupportedTextDecorationLonghand(
  styleKey: 'textDecorationThickness' | 'textUnderlineOffset' | 'textUnderlinePosition',
  cssName: string,
  code: string
): (tokens: Token[]) => Dict<any> | null {
  return (tokens: Token[]): Dict<any> | null => {
    const raw = tokens
      .map(t => t.raw)
      .join(' ')
      .trim();
    if (raw.length === 0) return null;
    if (__NATIVE_WEB__) {
      return { [styleKey]: raw };
    }
    if (__DEV__) {
      warnOnce(
        code,
        '`' +
          cssName +
          ': ' +
          raw +
          '` has no effect on React Native; iOS and Android draw a fixed-position underline with no thickness, offset, or position control. For a heavier or offset underline, put a `border-bottom` on a wrapping View.',
        raw
      );
    }
    return {};
  };
}

export const textDecorationThicknessHandler = makeUnsupportedTextDecorationLonghand(
  'textDecorationThickness',
  'text-decoration-thickness',
  'native-text-decoration-thickness-unsupported'
);
export const textUnderlineOffsetHandler = makeUnsupportedTextDecorationLonghand(
  'textUnderlineOffset',
  'text-underline-offset',
  'native-text-underline-offset-unsupported'
);
export const textUnderlinePositionHandler = makeUnsupportedTextDecorationLonghand(
  'textUnderlinePosition',
  'text-underline-position',
  'native-text-underline-position-unsupported'
);

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
 * `text-shadow: none | <shadow>#`, each layer `<offset-x> <offset-y>
 * [<blur>] [<color>]` (any order relative to the color) → RN's three
 * split longhands. RN renders one shadow, so a comma-separated list keeps
 * the first (topmost) layer and warns. rn-web passes the authored value
 * through raw: the browser ships the full grammar, and react-native-web
 * deprecates the textShadow* longhands in favor of a `textShadow` string.
 */
export function textShadowShorthand(tokens: Token[], rawValue: string): Dict<any> | null {
  if (__NATIVE_WEB__) {
    return { textShadow: rawValue };
  }
  const layers = splitShadowLayers(tokens);
  const parsed: ParsedShadow[] = [];
  for (let i = 0; i < layers.length; i++) {
    // `none` alternates with the <shadow># list; it is not a <shadow>, so
    // it is invalid as a list item. parseShadow accepts it standalone.
    if (layers.length > 1 && isNoneLayer(layers[i])) return null;
    const s = parseShadow(layers[i]);
    if (s === null) return null;
    parsed.push(s);
  }
  if (parsed.length === 0) return null;
  if (parsed.length > 1 && __DEV__) {
    warnOnce(
      'native-text-shadow-multiple',
      '`text-shadow: ' +
        rawValue +
        '` declares ' +
        parsed.length +
        ' shadow layers, but React Native renders a single shadow per Text. Only the first (topmost) layer was applied. To layer more shadows, stack duplicate Text elements with one shadow each.',
      rawValue
    );
  }
  const s = parsed[0];
  return {
    textShadowOffset: s.offset,
    textShadowRadius: s.radius,
    textShadowColor: s.color,
  };
}

function splitShadowLayers(tokens: Token[]): Token[][] {
  const layers: Token[][] = [];
  let current: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind === TokenKind.Comma) {
      layers.push(current);
      current = [];
    } else {
      current.push(tokens[i]);
    }
  }
  layers.push(current);
  return layers;
}

function isNoneLayer(layer: Token[]): boolean {
  return layer.length === 1 && layer[0].kind === TokenKind.Ident && layer[0].name === 'none';
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
