// Shared character-code constants for fast charCodeAt comparisons.
// Inlined at call sites by V8 after the first optimization pass.
//
// Convention: when a file references 3+ codes from this module, prefer
// `import * as $ from '../utils/charCodes'` and reference as `$.AMPERSAND`
// — keeps diffs focused when adding / removing constants at call sites.
export const NUL = 0;
export const TAB = 9; // \t
export const LF = 10; // \n
export const CR = 13; // \r
export const SPACE = 32; // ' '
export const DOUBLE_QUOTE = 34; // "
export const HASH = 35; // #
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
export const AT = 64; // @
export const UPPER_A = 65; // A
export const UPPER_E = 69; // E
export const UPPER_Z = 90; // Z
export const OPEN_BRACKET = 91; // [
export const BACKSLASH = 92; // \
export const CLOSE_BRACKET = 93; // ]
export const UNDERSCORE = 95; // _
export const LOWER_A = 97; // a
export const LOWER_E = 101; // e
export const LOWER_Z = 122; // z
export const OPEN_BRACE = 123; // {
export const CLOSE_BRACE = 125; // }
/** Offset from an ASCII uppercase letter to its lowercase counterpart. */
export const UPPER_TO_LOWER = 32;
