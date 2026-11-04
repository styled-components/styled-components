// Shared character-code constants for fast charCodeAt comparisons.
// Inlined at call sites by V8 after the first optimization pass.
//
// Convention: when a file references 3+ codes from this module, prefer
// `import * as $ from '../utils/charCodes'` and reference as `$.AMPERSAND`
// to keep diffs focused when adding / removing constants at call sites.
export const NUL = 0;
export const TAB = 9; // \t
export const LF = 10; // \n
export const CR = 13; // \r
export const SPACE = 32; // ' '
export const DOUBLE_QUOTE = 34; // "
export const HASH = 35; // #
export const DOLLAR = 36; // $
export const PERCENT = 37; // %
export const AMPERSAND = 38; // &
export const SINGLE_QUOTE = 39; // '
export const OPEN_PAREN = 40; // (
export const CLOSE_PAREN = 41; // )
export const ASTERISK = 42; // *
export const PLUS = 43; // +
export const COMMA = 44; // ,
export const HYPHEN = 45; // -
export const DOT = 46; // .
export const SLASH = 47; // /
export const DIGIT_0 = 48; // 0
export const DIGIT_9 = 57; // 9
export const COLON = 58; // :
export const SEMICOLON = 59; // ;
export const LT = 60; // <
export const EQ = 61; // =
export const GT = 62; // >
export const AT = 64; // @
export const UPPER_A = 65; // A
export const UPPER_E = 69; // E
export const UPPER_I = 73; // I
export const UPPER_J = 74; // J
export const UPPER_S = 83; // S
export const UPPER_Z = 90; // Z
export const OPEN_BRACKET = 91; // [
export const BACKSLASH = 92; // \
export const CLOSE_BRACKET = 93; // ]
export const CARET = 94; // ^
export const UNDERSCORE = 95; // _
export const LOWER_A = 97; // a
export const LOWER_E = 101; // e
export const LOWER_I = 105; // i
export const LOWER_S = 115; // s
export const LOWER_Z = 122; // z
export const OPEN_BRACE = 123; // {
export const PIPE = 124; // |
export const CLOSE_BRACE = 125; // }
export const TILDE = 126; // ~
/** Offset from an ASCII uppercase letter to its lowercase counterpart. */
export const UPPER_TO_LOWER = 32;

/**
 * Inline-friendly CSS whitespace predicate: matches ` ` `\t` `\n` `\r`.
 * Shared by ~16 trim / skip loops across parser, normalize, and emitters
 * so the 4-way OR ships once.
 */
export function isWS(c: number): boolean {
  return c === SPACE || c === TAB || c === LF || c === CR;
}

/**
 * Inline-friendly identifier-continuation predicate: matches ASCII
 * letters, digits, `-`, and `_`. Shared by the selector/component-id
 * char-scanning loops in the parser and native selector classifiers.
 */
export function isIdentChar(c: number): boolean {
  return (
    (c >= DIGIT_0 && c <= DIGIT_9) ||
    (c >= UPPER_A && c <= UPPER_Z) ||
    (c >= LOWER_A && c <= LOWER_Z) ||
    c === HYPHEN ||
    c === UNDERSCORE
  );
}

/**
 * A name holding an escape may mean `url`, so it counts as one. `ur\l` is the
 * shortest spelling; a hex escape may end in a space (`\75 rl`).
 */
function namesUrl(s: string, i: number, escape: number): boolean {
  // `| 32` lowercases an ASCII letter; no other code lands on these three.
  if (
    (s.charCodeAt(i - 1) | 32) === 108 &&
    (s.charCodeAt(i - 2) | 32) === 114 &&
    (s.charCodeAt(i - 3) | 32) === 117 &&
    !isIdentChar(s.charCodeAt(i - 4))
  ) {
    return true;
  }
  if (escape === -1) return false;

  let j = i - 1;
  for (let c = s.charCodeAt(j); isIdentChar(c) || isWS(c) || c === BACKSLASH; )
    c = s.charCodeAt(--j);
  return j < escape && i - j > 4;
}

/**
 * Index of the `)` ending the unquoted url token whose `(` is at `i`, `end` when
 * nothing closes it, or -1 when the `(` opens anything else. A browser reads an
 * unquoted url as one token up to the first `)`, so a quote or `/*` inside it opens
 * nothing. `escape` is the index of the last backslash before `i`, or -1.
 */
export function urlTokenEnd(s: string, i: number, end: number, escape: number): number {
  if (!namesUrl(s, i, escape)) return -1;

  let j = i + 1;
  while (isWS(s.charCodeAt(j))) j++;
  const first = s.charCodeAt(j);
  if (first === DOUBLE_QUOTE || first === SINGLE_QUOTE) return -1;

  for (; j < end; j++) {
    const code = s.charCodeAt(j);
    if (code === BACKSLASH) j++;
    else if (code === CLOSE_PAREN) return j;
  }
  return end;
}
