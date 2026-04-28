import { Dict } from '../../../types';
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

  // `flex: none`
  if (stream.tokens.length === 1) {
    const t = stream.peek()!;
    if (t.kind === TokenKind.Ident) {
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
      flexGrow = t.value!;
      stream.consume();
      // Second Number in sequence → flexShrink
      const next = stream.peek();
      if (next && next.kind === TokenKind.Number) {
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
      if (t.kind === TokenKind.Length || t.kind === TokenKind.Percent) {
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
  'stretch',
  'space-between',
  'space-around',
]);
const JUSTIFY_CONTENT = new Set([
  'flex-start',
  'flex-end',
  'center',
  'space-between',
  'space-around',
  'space-evenly',
]);

/** `place-content: <align-content> [<justify-content>]`. */
export function placeContentShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const first = stream.consume();
  if (!first || first.kind !== TokenKind.Ident || !ALIGN_CONTENT.has(first.name!)) return null;
  const alignContent = first.name!;
  let justifyContent = 'stretch';
  if (!stream.eof()) {
    const second = stream.consume();
    if (!second || second.kind !== TokenKind.Ident || !JUSTIFY_CONTENT.has(second.name!))
      return null;
    justifyContent = second.name!;
  }
  if (!stream.eof()) return null;
  return { alignContent, justifyContent };
}
