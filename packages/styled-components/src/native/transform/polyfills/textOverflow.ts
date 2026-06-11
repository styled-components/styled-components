import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `text-overflow` (CSS Overflow 4 §4.1):
 *   text-overflow = [ clip | ellipsis | <string> | fade | <fade()> ]{1,2}
 *
 * With one value it applies to the end edge; with two values the first is
 * the line-left edge and the second the line-right edge. RN's `ellipsizeMode`
 * only models the end edge (`'tail'` / `'clip'`), so the two-value form maps
 * the second (line-right) value, which is the end edge in LTR.
 *
 * Native degradation of the Level 4 forms:
 *   - <string>     -> ellipsizeMode 'tail' (RN renders its own ellipsis glyph)
 *   - fade / fade() -> ellipsizeMode 'clip' (no fade primitive; clip is the
 *                      honest fallback)
 * Each L4 form warns once so the degradation is visible in dev.
 *
 * rn-web emits the raw `text-overflow` value for every form (the browser
 * implements the full grammar). The `ellipsizeMode` lift is native-only.
 */

interface ParsedValue {
  // The ellipsizeMode this value degrades to on native.
  mode: 'tail' | 'clip';
  // True when this value is a Level 4 form (string / fade / fade()).
  isL4: boolean;
}

function parseOne(stream: TokenStream): ParsedValue | null {
  const t = stream.peek();
  if (t === undefined) return null;
  if (t.kind === TokenKind.Ident) {
    if (t.name === 'clip') {
      stream.consume();
      return { mode: 'clip', isL4: false };
    }
    if (t.name === 'ellipsis') {
      stream.consume();
      return { mode: 'tail', isL4: false };
    }
    if (t.name === 'fade') {
      stream.consume();
      return { mode: 'clip', isL4: true };
    }
    return null;
  }
  if (t.kind === TokenKind.String) {
    stream.consume();
    return { mode: 'tail', isL4: true };
  }
  if (t.kind === TokenKind.Function && t.name === 'fade') {
    stream.consume();
    return { mode: 'clip', isL4: true };
  }
  return null;
}

function textOverflowShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const first = parseOne(stream);
  if (first === null) return null;

  let chosen = first;
  // A Level 4 form is any value RN can't honor exactly: a <string>, a
  // fade / fade(), or the two-value form (Level 3 had a single keyword).
  let anyL4 = first.isL4;
  if (!stream.eof()) {
    const second = parseOne(stream);
    if (second === null) return null;
    // The line-right (second) value is the end edge in LTR; RN's
    // ellipsizeMode models only that edge.
    chosen = second;
    anyL4 = true;
  }
  if (!stream.eof()) return null;

  const raw = tokens
    .map(t => t.raw)
    .join(' ')
    .trim();

  if (__NATIVE_WEB__) {
    // The browser implements the full grammar; pass the authored value
    // through and don't lift ellipsizeMode.
    return { textOverflow: raw };
  }

  if (anyL4 && __DEV__) {
    warnOnce(
      'native-text-overflow-l4',
      '`text-overflow: ' +
        raw +
        '` is approximated on React Native; iOS and Android only truncate at the end edge with a clip or an ellipsis. Strings render as an ellipsis, `fade` clips, and two-value forms use the end (second) value. Use `clip` or `ellipsis` for an exact match.',
      raw
    );
  }

  return { ellipsizeMode: chosen.mode };
}

register('textOverflow', textOverflowShorthand);
