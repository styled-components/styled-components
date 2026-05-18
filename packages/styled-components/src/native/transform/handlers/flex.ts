import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { tokenToValue, withoutSlashes } from '../shorthandHelpers';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

const FLEX_WRAP = new Set(['nowrap', 'wrap', 'wrap-reverse']);
const FLEX_DIRECTION = new Set(['row', 'row-reverse', 'column', 'column-reverse']);

/**
 * `flex: none | auto | <grow> [<shrink>] [<basis>]`
 * Matches the CSS spec short-circuits: `none` → 0/0/auto, `auto` → 1/1/auto.
 */
export function flexShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));

  if (stream.tokens.length === 1) {
    const t = stream.peek()!;
    if (t.kind === TokenKind.Ident) {
      if (t.name === 'initial') return { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' };
      if (t.name === 'none') return { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' };
      if (t.name === 'auto') return { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' };
    }
  }

  let flexGrow: number | undefined;
  let flexShrink: number | undefined;
  let flexBasis: number | string | undefined;

  while (!stream.eof()) {
    const t = stream.peek()!;
    if (flexGrow === undefined && t.kind === TokenKind.Number) {
      if (t.value! < 0) return null;
      flexGrow = t.value!;
      stream.consume();
      // Second Number in sequence → flexShrink
      const next = stream.peek();
      if (next && next.kind === TokenKind.Number) {
        if (next.value! < 0) return null;
        flexShrink = next.value!;
        stream.consume();
      }
      continue;
    }
    if (flexBasis === undefined) {
      if (t.kind === TokenKind.Ident && t.name === 'auto') {
        flexBasis = 'auto';
        stream.consume();
        continue;
      }
      if (
        t.kind === TokenKind.Number &&
        t.value === 0 &&
        flexGrow !== undefined &&
        flexShrink !== undefined
      ) {
        flexBasis = 0;
        stream.consume();
        continue;
      }
      if (t.kind === TokenKind.Length || t.kind === TokenKind.Percent) {
        if (t.value! < 0) return null;
        flexBasis = tokenToValue(t) as number | string;
        stream.consume();
        continue;
      }
    }
    return null;
  }

  return {
    flexGrow: flexGrow !== undefined ? flexGrow : 1,
    flexShrink: flexShrink !== undefined ? flexShrink : 1,
    flexBasis: flexBasis !== undefined ? flexBasis : 0,
  };
}

/** `flex-flow: <direction> || <wrap>`; order-agnostic, either/both. */
export function flexFlowShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  let flexDirection: string | undefined;
  let flexWrap: string | undefined;

  while (!stream.eof()) {
    const t = stream.peek()!;
    if (t.kind !== TokenKind.Ident) return null;
    const n = t.name!;
    if (flexDirection === undefined && FLEX_DIRECTION.has(n)) {
      flexDirection = n;
      stream.consume();
      continue;
    }
    if (flexWrap === undefined && FLEX_WRAP.has(n)) {
      flexWrap = n;
      stream.consume();
      continue;
    }
    return null;
  }

  return {
    flexDirection: flexDirection !== undefined ? flexDirection : 'row',
    flexWrap: flexWrap !== undefined ? flexWrap : 'nowrap',
  };
}

const ALIGN_CONTENT = new Set([
  'flex-start',
  'flex-end',
  'center',
  'start',
  'end',
  'stretch',
  'space-between',
  'space-around',
  'space-evenly',
]);
const JUSTIFY_CONTENT = new Set([
  'flex-start',
  'flex-end',
  'center',
  'start',
  'end',
  'space-between',
  'space-around',
  'space-evenly',
]);
const CONTENT_POSITION_NORMALIZE: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
};

/**
 * `place-content: <align-content> <justify-content>?`. Native branch
 * normalizes start/end to the flex- forms; rn-web passes through.
 */
export function placeContentShorthand(tokens: Token[]): Dict<any> | null {
  if (__NATIVE_WEB__) {
    const raw = tokens
      .map(t => t.raw)
      .join(' ')
      .trim();
    return raw.length === 0 ? null : { placeContent: raw };
  }
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = stream.consume();
  if (!first || first.kind !== TokenKind.Ident || !ALIGN_CONTENT.has(first.name!)) return null;
  const alignContent = CONTENT_POSITION_NORMALIZE[first.name!] ?? first.name!;
  let justifyContent = alignContent;
  if (!stream.eof()) {
    const second = stream.consume();
    if (!second || second.kind !== TokenKind.Ident || !JUSTIFY_CONTENT.has(second.name!))
      return null;
    justifyContent = CONTENT_POSITION_NORMALIZE[second.name!] ?? second.name!;
  }
  if (!stream.eof()) return null;
  return { alignContent, justifyContent };
}

/**
 * Keyword set for `align-items` / `justify-items` / `align-self` / `justify-self`.
 * Authors writing `start` / `end` / `self-start` / `self-end` get normalized to
 * RN's flex-prefixed enum since Yoga and rn-web both accept only those forms
 * (see `knowledge_rnweb_alignment_enum.md`). `first baseline` / `last baseline`
 * collapse to `baseline` (with a dev warn); `safe` / `unsafe` overflow prefixes
 * are stripped (with a dev warn).
 */
const SELF_POSITION_NORMALIZE: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
  'self-start': 'flex-start',
  'self-end': 'flex-end',
};

const ITEMS_SELF_KEYWORDS = new Set([
  'normal',
  'stretch',
  'center',
  'start',
  'end',
  'flex-start',
  'flex-end',
  'self-start',
  'self-end',
  'baseline',
]);

const OVERFLOW_POSITION = new Set(['safe', 'unsafe']);
const BASELINE_QUALIFIER = new Set(['first', 'last']);

function readItemsKeyword(stream: TokenStream): string | null {
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident) return null;
  const name = t.name!;

  if (OVERFLOW_POSITION.has(name)) {
    const next = stream.consume();
    if (!next || next.kind !== TokenKind.Ident) return null;
    const nextName = next.name!;
    if (!ITEMS_SELF_KEYWORDS.has(nextName)) return null;
    if (__DEV__) {
      warnOnce(
        'native-align-overflow-position-dropped',
        '`safe` and `unsafe` alignment prefixes are ignored on React Native because Yoga has no overflow-alignment control. The alignment value still applies.',
        name
      );
    }
    return SELF_POSITION_NORMALIZE[nextName] ?? nextName;
  }

  if (BASELINE_QUALIFIER.has(name)) {
    const next = stream.consume();
    if (!next || next.kind !== TokenKind.Ident || next.name !== 'baseline') return null;
    if (__DEV__) {
      warnOnce(
        'native-align-baseline-qualifier-dropped',
        '`first baseline` and `last baseline` both map to `baseline` on React Native because iOS and Android do not expose first/last baseline alignment.',
        name
      );
    }
    return 'baseline';
  }

  if (!ITEMS_SELF_KEYWORDS.has(name)) return null;
  return SELF_POSITION_NORMALIZE[name] ?? name;
}

/**
 * `place-items: <'align-items'> <'justify-items'>?`. First value is align-items,
 * second (or repeated first) is justify-items. `justify-items` is a no-op under
 * Yoga but rn-web honors it; the rn-web branch emits the shorthand untouched
 * so the browser parses the full grammar.
 */
export function placeItemsShorthand(tokens: Token[]): Dict<any> | null {
  if (__NATIVE_WEB__) {
    const raw = tokens
      .map(t => t.raw)
      .join(' ')
      .trim();
    return raw.length === 0 ? null : { placeItems: raw };
  }
  const stream = new TokenStream(withoutSlashes(tokens));
  const alignItems = readItemsKeyword(stream);
  if (alignItems === null) return null;
  let justifyItems = alignItems;
  if (!stream.eof()) {
    const second = readItemsKeyword(stream);
    if (second === null) return null;
    justifyItems = second;
  }
  if (!stream.eof()) return null;
  return { alignItems, justifyItems };
}

/**
 * `place-self: <'align-self'> <'justify-self'>?`. Same expansion as `place-items`,
 * plus `auto` since both longhands default to `auto`.
 */
const SELF_KEYWORDS_WITH_AUTO = new Set([...ITEMS_SELF_KEYWORDS, 'auto']);

function readSelfKeyword(stream: TokenStream): string | null {
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident) return null;
  const name = t.name!;

  if (OVERFLOW_POSITION.has(name)) {
    const next = stream.consume();
    if (!next || next.kind !== TokenKind.Ident) return null;
    const nextName = next.name!;
    if (!ITEMS_SELF_KEYWORDS.has(nextName)) return null;
    if (__DEV__) {
      warnOnce(
        'native-align-overflow-position-dropped',
        '`safe` and `unsafe` alignment prefixes are ignored on React Native because Yoga has no overflow-alignment control. The alignment value still applies.',
        name
      );
    }
    return SELF_POSITION_NORMALIZE[nextName] ?? nextName;
  }

  if (BASELINE_QUALIFIER.has(name)) {
    const next = stream.consume();
    if (!next || next.kind !== TokenKind.Ident || next.name !== 'baseline') return null;
    if (__DEV__) {
      warnOnce(
        'native-align-baseline-qualifier-dropped',
        '`first baseline` and `last baseline` both map to `baseline` on React Native because iOS and Android do not expose first/last baseline alignment.',
        name
      );
    }
    return 'baseline';
  }

  if (!SELF_KEYWORDS_WITH_AUTO.has(name)) return null;
  return SELF_POSITION_NORMALIZE[name] ?? name;
}

export function placeSelfShorthand(tokens: Token[]): Dict<any> | null {
  if (__NATIVE_WEB__) {
    const raw = tokens
      .map(t => t.raw)
      .join(' ')
      .trim();
    return raw.length === 0 ? null : { placeSelf: raw };
  }
  const stream = new TokenStream(withoutSlashes(tokens));
  const alignSelf = readSelfKeyword(stream);
  if (alignSelf === null) return null;
  let justifySelf = alignSelf;
  if (!stream.eof()) {
    const second = readSelfKeyword(stream);
    if (second === null) return null;
    justifySelf = second;
  }
  if (!stream.eof()) return null;
  return { alignSelf, justifySelf };
}
