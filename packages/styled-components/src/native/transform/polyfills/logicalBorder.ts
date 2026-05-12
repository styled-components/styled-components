import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { register } from '../shorthands';
import {
  consumeColor,
  consumeDimensionLike,
  tokenToValue,
  withoutSlashes,
} from '../shorthandHelpers';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * CSS Logical Properties 1 §4.5 — `border-inline-*` and `border-block-*`
 * longhands + shorthands. Under RN's horizontal-tb writing mode:
 *
 *   inline-start → RN `borderStart*`
 *   inline-end   → RN `borderEnd*`
 *   block-start  → RN `borderTop*`
 *   block-end    → RN `borderBottom*`
 *
 * RN 0.85 has no per-edge `borderStyle`; the whole-element `borderStyle`
 * is the only surface. Style longhands warn on native and drop; rn-web
 * honors the per-edge style via the browser (we emit the camelCase form
 * so the atomic-CSS pipeline hyphenates and the browser parses it).
 */

const VALID_BORDER_STYLES = new Set(['solid', 'dotted', 'dashed', 'none']);

interface EdgeMapping {
  width: string;
  color: string;
}

const EDGE_MAP: Record<'inline-start' | 'inline-end' | 'block-start' | 'block-end', EdgeMapping> = {
  'inline-start': { width: 'borderStartWidth', color: 'borderStartColor' },
  'inline-end': { width: 'borderEndWidth', color: 'borderEndColor' },
  'block-start': { width: 'borderTopWidth', color: 'borderTopColor' },
  'block-end': { width: 'borderBottomWidth', color: 'borderBottomColor' },
};

function warnNoPerEdgeStyle(edge: string, value: string): void {
  if (!__DEV__) return;
  warnOnce(
    'native-border-per-edge-style',
    'Per-edge `border-' +
      edge +
      '-style: ' +
      value +
      '` has no React Native surface in 0.85 (RN only exposes the whole-element `borderStyle`). The declaration drops on iOS / Android; rn-web honors via the browser. Set `border-style` at the element level if you want a uniform style across all four edges.',
    edge + ':' + value
  );
}

function camelEdge(edge: string): string {
  return edge
    .split('-')
    .map(p => p[0].toUpperCase() + p.slice(1))
    .join('');
}

/* ─────────── 12 single-edge longhands ─────────── */

function singleColor(tokens: Token[], rnKey: string): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const c = consumeColor(stream);
  if (c === null || !stream.eof()) return null;
  return { [rnKey]: c.raw };
}

function singleWidth(tokens: Token[], rnKey: string): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const w = consumeDimensionLike(stream);
  if (w === null || !stream.eof()) return null;
  return { [rnKey]: tokenToValue(w) };
}

function singleStyle(tokens: Token[], edge: string): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name === undefined || !VALID_BORDER_STYLES.has(name)) return null;
  if (__NATIVE_WEB__) {
    return { ['border' + camelEdge(edge) + 'Style']: name };
  }
  warnNoPerEdgeStyle(edge, name);
  return {};
}

/* ─────────── 6 axis shorthands ─────────── */

function axisColor(tokens: Token[], axis: 'inline' | 'block'): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = consumeColor(stream);
  if (first === null) return null;
  let second = first;
  if (!stream.eof()) {
    const s = consumeColor(stream);
    if (s === null) return null;
    second = s;
  }
  if (!stream.eof()) return null;
  const startEdge = axis === 'inline' ? 'inline-start' : 'block-start';
  const endEdge = axis === 'inline' ? 'inline-end' : 'block-end';
  return {
    [EDGE_MAP[startEdge].color]: first.raw,
    [EDGE_MAP[endEdge].color]: second.raw,
  };
}

function axisWidth(tokens: Token[], axis: 'inline' | 'block'): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = consumeDimensionLike(stream);
  if (first === null) return null;
  let second = first;
  if (!stream.eof()) {
    const s = consumeDimensionLike(stream);
    if (s === null) return null;
    second = s;
  }
  if (!stream.eof()) return null;
  const startEdge = axis === 'inline' ? 'inline-start' : 'block-start';
  const endEdge = axis === 'inline' ? 'inline-end' : 'block-end';
  return {
    [EDGE_MAP[startEdge].width]: tokenToValue(first),
    [EDGE_MAP[endEdge].width]: tokenToValue(second),
  };
}

function axisStyle(tokens: Token[], axis: 'inline' | 'block'): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = stream.consume();
  if (!first || first.kind !== TokenKind.Ident) return null;
  const firstName = first.name;
  if (firstName === undefined || !VALID_BORDER_STYLES.has(firstName)) return null;

  let secondName = firstName;
  if (!stream.eof()) {
    const second = stream.consume();
    if (!second || second.kind !== TokenKind.Ident) return null;
    const sn = second.name;
    if (sn === undefined || !VALID_BORDER_STYLES.has(sn)) return null;
    secondName = sn;
  }
  if (!stream.eof()) return null;

  const startEdge = axis === 'inline' ? 'inline-start' : 'block-start';
  const endEdge = axis === 'inline' ? 'inline-end' : 'block-end';

  if (__NATIVE_WEB__) {
    return {
      ['border' + camelEdge(startEdge) + 'Style']: firstName,
      ['border' + camelEdge(endEdge) + 'Style']: secondName,
    };
  }
  warnNoPerEdgeStyle(axis, firstName + (firstName !== secondName ? ' ' + secondName : ''));
  return {};
}

/* ─────────── 4 composite single-edge shorthands ─────────── */

function compositeEdge(
  tokens: Token[],
  edge: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  let width: Token | null = null;
  let style: string | null = null;
  let color: Token | null = null;

  while (!stream.eof()) {
    const t = stream.peek();
    if (!t) break;
    if (t.kind === TokenKind.Ident && t.name !== undefined && VALID_BORDER_STYLES.has(t.name)) {
      if (style !== null) return null;
      style = t.name;
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
    return null;
  }

  if (width === null && style === null && color === null) return null;

  const out: Dict<any> = {};
  const map = EDGE_MAP[edge];
  if (width !== null) out[map.width] = tokenToValue(width);
  if (color !== null) out[map.color] = color.raw;
  if (style !== null) {
    if (__NATIVE_WEB__) {
      out['border' + camelEdge(edge) + 'Style'] = style;
    } else {
      warnNoPerEdgeStyle(edge, style);
    }
  }
  return out;
}

/* ─────────── 2 mode-spanning shorthands ─────────── */

function modeSpanning(tokens: Token[], axis: 'inline' | 'block'): Dict<any> | null {
  const startEdge = axis === 'inline' ? 'inline-start' : 'block-start';
  const endEdge = axis === 'inline' ? 'inline-end' : 'block-end';
  const stream = new TokenStream(withoutSlashes(tokens));
  let width: Token | null = null;
  let style: string | null = null;
  let color: Token | null = null;

  while (!stream.eof()) {
    const t = stream.peek();
    if (!t) break;
    if (t.kind === TokenKind.Ident && t.name !== undefined && VALID_BORDER_STYLES.has(t.name)) {
      if (style !== null) return null;
      style = t.name;
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
    return null;
  }

  if (width === null && style === null && color === null) return null;

  const out: Dict<any> = {};
  const startMap = EDGE_MAP[startEdge];
  const endMap = EDGE_MAP[endEdge];
  if (width !== null) {
    const v = tokenToValue(width);
    out[startMap.width] = v;
    out[endMap.width] = v;
  }
  if (color !== null) {
    out[startMap.color] = color.raw;
    out[endMap.color] = color.raw;
  }
  if (style !== null) {
    if (__NATIVE_WEB__) {
      out['border' + camelEdge(startEdge) + 'Style'] = style;
      out['border' + camelEdge(endEdge) + 'Style'] = style;
    } else {
      warnNoPerEdgeStyle(axis, style);
    }
  }
  return out;
}

/* ─────────── outline-style: hidden targeted warn ─────────── */

const RN_OUTLINE_STYLES = new Set(['solid', 'dotted', 'dashed']);
const WEB_ONLY_OUTLINE_STYLES = new Set(['auto', 'double', 'groove', 'ridge', 'inset', 'outset']);

function outlineStyleHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name === undefined) return null;

  // CSS UI 4 §3.3: `outline-style: hidden` is invalid per spec (the
  // `hidden` keyword only applies to `border-style`, not outline).
  if (name === 'hidden') {
    if (__DEV__) {
      warnOnce(
        'native-outline-style-hidden-invalid',
        '`outline-style: hidden` is invalid per CSS UI 4 §3.3 (the keyword only applies to `border-style`, not outline). Use `outline: none` to suppress the outline.',
        name
      );
    }
    return {};
  }

  if (RN_OUTLINE_STYLES.has(name)) return { outlineStyle: name };

  if (WEB_ONLY_OUTLINE_STYLES.has(name)) {
    if (__DEV__) {
      warnOnce(
        'native-outline-style',
        '`outline-style: ' +
          name +
          "` is web-only; React Native only renders 'solid' / 'dotted' / 'dashed'. The declaration still reaches rn-web where it works as expected.",
        name
      );
    }
    return { outlineStyle: name };
  }

  if (name === 'none') return { outlineStyle: 'solid', outlineWidth: 0 };

  return null;
}

/* ─────────── Registration ─────────── */

// 12 longhands
register('borderInlineStartColor', tokens => singleColor(tokens, 'borderStartColor'));
register('borderInlineEndColor', tokens => singleColor(tokens, 'borderEndColor'));
register('borderBlockStartColor', tokens => singleColor(tokens, 'borderTopColor'));
register('borderBlockEndColor', tokens => singleColor(tokens, 'borderBottomColor'));

register('borderInlineStartWidth', tokens => singleWidth(tokens, 'borderStartWidth'));
register('borderInlineEndWidth', tokens => singleWidth(tokens, 'borderEndWidth'));
register('borderBlockStartWidth', tokens => singleWidth(tokens, 'borderTopWidth'));
register('borderBlockEndWidth', tokens => singleWidth(tokens, 'borderBottomWidth'));

register('borderInlineStartStyle', tokens => singleStyle(tokens, 'inline-start'));
register('borderInlineEndStyle', tokens => singleStyle(tokens, 'inline-end'));
register('borderBlockStartStyle', tokens => singleStyle(tokens, 'block-start'));
register('borderBlockEndStyle', tokens => singleStyle(tokens, 'block-end'));

// 6 axis shorthands
register('borderInlineColor', tokens => axisColor(tokens, 'inline'));
register('borderInlineWidth', tokens => axisWidth(tokens, 'inline'));
register('borderInlineStyle', tokens => axisStyle(tokens, 'inline'));
register('borderBlockColor', tokens => axisColor(tokens, 'block'));
register('borderBlockWidth', tokens => axisWidth(tokens, 'block'));
register('borderBlockStyle', tokens => axisStyle(tokens, 'block'));

// 4 composite single-edge shorthands
register('borderInlineStart', tokens => compositeEdge(tokens, 'inline-start'));
register('borderInlineEnd', tokens => compositeEdge(tokens, 'inline-end'));
register('borderBlockStart', tokens => compositeEdge(tokens, 'block-start'));
register('borderBlockEnd', tokens => compositeEdge(tokens, 'block-end'));

// 2 mode-spanning shorthands
register('borderInline', tokens => modeSpanning(tokens, 'inline'));
register('borderBlock', tokens => modeSpanning(tokens, 'block'));

// outline-style:hidden targeted warn (replaces fall-through to
// native-shorthand-parse)
register('outlineStyle', outlineStyleHandler);
