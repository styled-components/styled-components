// Shared character-code constants for fast charCodeAt comparisons.
// Inlined at call sites by V8 after the first optimization pass.
export const DOUBLE_QUOTE = 34; // "
export const SINGLE_QUOTE = 39; // '
export const SLASH = 47; // /
export const ASTERISK = 42; // *
export const BACKSLASH = 92; // \
export const OPEN_BRACE = 123; // {
export const CLOSE_BRACE = 125; // }
export const SEMICOLON = 59; // ;
export const NEWLINE = 10; // \n
export const OPEN_PAREN = 40; // (
export const CLOSE_PAREN = 41; // )
export const HYPHEN = 45; // -
export const UPPER_A = 65; // A
export const UPPER_Z = 90; // Z
/** Offset from an ASCII uppercase letter to its lowercase counterpart. */
export const UPPER_TO_LOWER = 32;
