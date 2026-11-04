// Shared character-code constants for fast charCodeAt comparisons.
// Inlined at call sites by V8 after the first optimization pass.
//
// Convention: when a file references 3+ codes from this module, prefer
// `import * as $ from '../utils/charCodes'` and reference as `$.AMPERSAND`
// to keep diffs focused when adding / removing constants at call sites.
export const NUL = 0;
export const TAB = 9; // \t
export const LF = 10; // \n
export const FF = 12; // \f
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
export const GT = 62; // >
export const AT = 64; // @
export const UPPER_A = 65; // A
export const UPPER_E = 69; // E
export const UPPER_I = 73; // I
export const UPPER_S = 83; // S
export const UPPER_Z = 90; // Z
export const OPEN_BRACKET = 91; // [
export const BACKSLASH = 92; // \
export const CLOSE_BRACKET = 93; // ]
export const CARET = 94; // ^
export const UNDERSCORE = 95; // _
export const LOWER_A = 97; // a
export const LOWER_E = 101; // e
export const LOWER_F = 102; // f
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
 * Inline-friendly whitespace predicate: matches ` ` `\t` `\n` `\r`, not `\f`.
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
 * A character that takes the name before a `(` into a longer token: `&` becomes a
 * class name when emitted, `@` and `#` start an at-keyword and a hash, and a browser
 * reads NUL as a name character.
 */
function extendsName(c: number): boolean {
  return isIdentChar(c) || c > 127 || c === 0 || c === AMPERSAND || c === AT || c === HASH;
}

function isHexDigit(c: number): boolean {
  const lower = c | UPPER_TO_LOWER;
  return (c >= DIGIT_0 && c <= DIGIT_9) || (lower >= LOWER_A && lower <= LOWER_F);
}

/**
 * Index of the `)` ending the unquoted url token whose `(` is at `i`, `end` when
 * nothing closes it, or -1 when the `(` opens anything else. A browser reads an
 * unquoted url as one token up to the first `)`, so a quote or `/*` inside it opens
 * nothing. `escape` is the index of the last backslash before `i`, or -1.
 *
 * A name holding an escape, or `url` straight after `&`, may or may not mean `url`.
 * It reads as one while a function would end at the same `)`, and as left open once
 * the two could differ. `&` joins the name only in a selector, where it is replaced.
 */
export function urlTokenEnd(s: string, i: number, end: number, escape: number): number {
  let unsure = false;
  if (escape !== -1) {
    let start = i - 1;
    while (extendsName(s.charCodeAt(start))) start--;

    // Whitespace joins the name only as the end of a hex escape. Walking back stays linear.
    let j = start;
    while (isWS(s.charCodeAt(j)) || s.charCodeAt(j) === FF) j--;
    while (isHexDigit(s.charCodeAt(j))) j--;
    unsure = escape >= start - 1 || j === escape;
  }

  // `| 32` lowercases an ASCII letter; no other code lands on these three.
  const spellsUrl =
    (s.charCodeAt(i - 1) | 32) === 108 &&
    (s.charCodeAt(i - 2) | 32) === 114 &&
    (s.charCodeAt(i - 3) | 32) === 117;
  const before = s.charCodeAt(i - 4);
  if (spellsUrl && before === AMPERSAND) unsure = true;
  else if (!unsure && (!spellsUrl || extendsName(before))) return -1;

  let j = i + 1;
  while (isWS(s.charCodeAt(j)) || s.charCodeAt(j) === FF) j++;
  const first = s.charCodeAt(j);
  if (first === DOUBLE_QUOTE || first === SINGLE_QUOTE) return -1;

  for (; j < end; j++) {
    const code = s.charCodeAt(j);
    if (code === BACKSLASH) j++;
    else if (code === CLOSE_PAREN) return j;
    // A backslash after unescaped whitespace makes a bad url, whose end is unsafe to rely on.
    else if (s.charCodeAt(j + 1) === BACKSLASH && (isWS(code) || code === FF)) return end;
    else if (
      unsure &&
      (code === DOUBLE_QUOTE ||
        code === SINGLE_QUOTE ||
        code === OPEN_PAREN ||
        code === OPEN_BRACKET ||
        code === OPEN_BRACE ||
        (code === SLASH && s.charCodeAt(j + 1) === ASTERISK))
    ) {
      return end;
    }
  }
  return end;
}
