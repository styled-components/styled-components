import {
  ASTERISK,
  AT,
  BACKSLASH,
  CLOSE_BRACKET,
  CLOSE_PAREN,
  COLON,
  CR,
  DIGIT_0,
  DIGIT_9,
  DOUBLE_QUOTE,
  FORM_FEED,
  HASH,
  isIdentChar,
  isWS,
  LF,
  LOWER_A,
  LOWER_L,
  LOWER_R,
  LOWER_U,
  NUL,
  OPEN_BRACKET,
  OPEN_PAREN,
  SINGLE_QUOTE,
  SLASH,
  UPPER_A,
} from '../utils/charCodes';

/**
 * An ident code point as CSS reads it: ASCII letters, digits, `-`, `_`, any
 * code point at or above U+0080, and NUL, which CSS preprocessing reads as
 * U+FFFD.
 */
export function isIdentCode(c: number): boolean {
  return isIdentChar(c) || c >= 0x80 || c === NUL;
}

/** CSS whitespace, form feed included. */
export function isSpace(c: number): boolean {
  return isWS(c) || c === FORM_FEED;
}

/** Newline as CSS preprocessing reads it: LF, CR, or form feed. */
export function isNewline(c: number): boolean {
  return c === LF || c === CR || c === FORM_FEED;
}

function isHex(c: number): boolean {
  return (c >= DIGIT_0 && c <= DIGIT_9) || (c >= UPPER_A && c <= 70) || (c >= LOWER_A && c <= 102);
}

/**
 * Whether the code point at `i` is escaped: preceded by an odd number of
 * backslashes (`\"`, `\\\"`). An even number means the backslashes escape
 * each other.
 */
export function isEscaped(s: string, i: number): boolean {
  let backslashes = 0;
  while (--i >= 0 && s.charCodeAt(i) === BACKSLASH) backslashes++;
  return (backslashes & 1) === 1;
}

/**
 * Index just past the escape whose backslash is at `i`: up to six hex digits
 * and one whitespace code point after them (CR LF counting as one), or else
 * the one code point after the backslash. The caller has checked the escape
 * is valid (the backslash is followed by a code point other than a newline).
 */
function escapeEnd(s: string, i: number, end: number): number {
  let j = i + 1;
  if (!isHex(s.charCodeAt(j))) return j + 1;
  const last = j + 6 < end ? j + 6 : end;
  while (j < last && isHex(s.charCodeAt(j))) j++;
  if (j >= end) return j;
  const c = s.charCodeAt(j);
  if (c === CR && j + 1 < end && s.charCodeAt(j + 1) === LF) return j + 2;
  return isSpace(c) ? j + 1 : j;
}

/** The code point an escape starting at the backslash at `i` stands for, lowercased when ASCII. */
function escapedCode(s: string, i: number, end: number): number {
  let j = i + 1;
  const first = s.charCodeAt(j);
  if (!isHex(first)) return first >= UPPER_A && first <= 90 ? first + 32 : first;
  let code = 0;
  const last = j + 6 < end ? j + 6 : end;
  while (j < last && isHex(s.charCodeAt(j))) code = code * 16 + parseInt(s.charAt(j++), 16);
  return code >= UPPER_A && code <= 90 ? code + 32 : code;
}

/**
 * Start of the identifier (escapes included) that ends at `end` in `s`,
 * reading back no further than `from`. Equal to `end` when none does.
 */
export function identifierStart(s: string, end: number, from: number): number {
  let k = end;
  while (k > from) {
    const c = s.charCodeAt(k - 1);
    if (isIdentCode(c)) {
      k--;
    } else if (c === BACKSLASH) {
      // The backslash starts an escape the identifier holds, unless escaped
      // itself (then the pair is an escaped backslash, read below).
      if (isEscaped(s, k - 1)) {
        k -= 2;
      } else if (k < end) {
        k--;
      } else {
        break;
      }
    } else if (k - 1 > from && isEscaped(s, k - 1) && !isNewline(c)) {
      k -= 2;
    } else if (isSpace(c)) {
      // Whitespace ending a hex escape belongs to it.
      let w = k - 1;
      if (c === LF && w > from && s.charCodeAt(w - 1) === CR) w--;
      let d = w;
      while (d > from && w - d < 6 && isHex(s.charCodeAt(d - 1))) d--;
      if (d < w && d - 1 >= from && s.charCodeAt(d - 1) === BACKSLASH && !isEscaped(s, d - 1)) {
        k = d - 1;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  return k;
}

/**
 * Whether the `(` at `open` reads as CSS `url(`: the ident-like token before
 * it (escapes decoded) is `url` in any case, and that token is not the name
 * of a hash (`#url`) or at-keyword (`@url`). A quoted argument still makes
 * `url(` a function; see {@link opensUrl}.
 */
export function isUrlCall(s: string, open: number): boolean {
  if ((s.charCodeAt(open - 1) | 0x20) !== LOWER_L) {
    // Any other last code point spells `l` only as part of an escape, which
    // takes at most nine code points (backslash, six hex digits, CR LF).
    let k = open - 1;
    const stop = open > 9 ? open - 9 : 0;
    while (k >= stop && s.charCodeAt(k) !== BACKSLASH) k--;
    if (k < stop) return false;
  }
  return isUrlIdentifier(s, identifierStart(s, open, 0), open);
}

/** {@link isUrlCall} for the identifier `s[start..open)` found by {@link identifierStart}. */
export function isUrlIdentifier(s: string, start: number, open: number): boolean {
  if (open - start < 3) return false;
  const before = start > 0 ? s.charCodeAt(start - 1) : -1;
  if ((before === HASH || before === AT) && !isEscaped(s, start - 1)) return false;
  if (open - start === 3) {
    return (
      (s.charCodeAt(start) | 0x20) === LOWER_U &&
      (s.charCodeAt(start + 1) | 0x20) === LOWER_R &&
      (s.charCodeAt(start + 2) | 0x20) === LOWER_L
    );
  }
  // Longer text spells `url` only through escapes.
  let i = start;
  let n = 0;
  while (i < open) {
    let code: number;
    if (s.charCodeAt(i) === BACKSLASH) {
      code = escapedCode(s, i, open);
      i = escapeEnd(s, i, open);
    } else {
      code = s.charCodeAt(i) | 0x20;
      i++;
    }
    if (n === 3 || code !== (n === 0 ? LOWER_U : n === 1 ? LOWER_R : LOWER_L)) return false;
    n++;
  }
  return n === 3;
}

/** Whether the `(` at `open` starts an unquoted `url(`: {@link isUrlCall}, and no quote opens its argument. */
export function opensUrl(s: string, open: number): boolean {
  if (!isUrlCall(s, open)) return false;
  let j = open + 1;
  while (j < s.length && isSpace(s.charCodeAt(j))) j++;
  const next = s.charCodeAt(j);
  return next !== DOUBLE_QUOTE && next !== SINGLE_QUOTE;
}

/** Index past the unquoted url whose text starts at `i`: past its `)`, or `end`. */
function urlEnd(s: string, i: number, end: number): number {
  while (i < end) {
    const c = s.charCodeAt(i);
    if (c === CLOSE_PAREN) return i + 1;
    i += c === BACKSLASH && !isNewline(s.charCodeAt(i + 1)) ? 2 : 1;
  }
  return end;
}

/**
 * Index past the string whose quote is at `i`: past its closing quote, or
 * `end`. A raw newline does not end it, as authored template text reads.
 */
function stringEnd(s: string, i: number, end: number): number {
  const quote = s.charCodeAt(i);
  i++;
  while (i < end) {
    const c = s.charCodeAt(i);
    if (c === quote) return i + 1;
    i += c === BACKSLASH ? 2 : 1;
  }
  return end;
}

/** {@link scan} mode bit: `[` and `]` nest like parentheses. */
export const BRACKETS = 1;
/** {@link scan} mode bit: `/* *\/` comments are skipped. */
export const COMMENTS = 2;
/** {@link scan} mode bit: stops match inside parentheses and brackets too. */
export const ANY_DEPTH = 4;

const STOP = 1;
const QUOTE = 2;
const OPEN = 4;
const CLOSE = 8;
const ESCAPE = 16;
const SOLIDUS = 32;

/** A stop table for {@link scan}: the code points in `chars` stop it. */
export function stops(chars: string): Uint8Array {
  const table = new Uint8Array(128);
  table[DOUBLE_QUOTE] = table[SINGLE_QUOTE] = QUOTE;
  table[OPEN_PAREN] = table[OPEN_BRACKET] = OPEN;
  table[CLOSE_PAREN] = table[CLOSE_BRACKET] = CLOSE;
  table[BACKSLASH] = ESCAPE;
  table[SLASH] = SOLIDUS;
  for (let i = 0; i < chars.length; i++) table[chars.charCodeAt(i)] |= STOP;
  return table;
}

/** Parenthesis (and, with {@link BRACKETS}, bracket) depth where the last {@link scan} stopped. */
let scanDepth = 0;

/**
 * The CSS reader every structural scan shares. Returns the index of the
 * first code point in `s[start..end)` that `table` marks as a stop, read
 * outside strings, escapes, and unquoted `url(` text, and outside
 * parentheses (and brackets, with {@link BRACKETS}) unless the mode has
 * {@link ANY_DEPTH}; `end` when none does. `depth` is the nesting the scan
 * starts in. {@link scanDepth} holds the nesting where it stopped.
 *
 * A string stays open across a raw newline, as authored template text reads.
 */
export function scan(
  s: string,
  start: number,
  end: number,
  table: Uint8Array,
  mode: number,
  depth: number
): number {
  let i = start;
  // Bit n records whether nesting level n + 1 is a bracket.
  let kinds = 0;
  while (i < end) {
    const c = s.charCodeAt(i);
    const k = c < 128 ? table[c] : 0;
    if (k === 0) {
      i++;
      continue;
    }
    if ((k & STOP) !== 0 && (depth === 0 || (mode & ANY_DEPTH) !== 0)) {
      scanDepth = depth;
      return i;
    }
    if ((k & ESCAPE) !== 0) {
      i += isNewline(s.charCodeAt(i + 1)) ? 1 : 2;
      continue;
    }
    if ((k & QUOTE) !== 0) {
      i = stringEnd(s, i, end);
      continue;
    }
    if ((k & OPEN) !== 0) {
      if (c === OPEN_PAREN) {
        if (opensUrl(s, i)) {
          i = urlEnd(s, i + 1, end);
          continue;
        }
        kinds <<= 1;
        depth++;
      } else if ((mode & BRACKETS) !== 0) {
        kinds = (kinds << 1) | 1;
        depth++;
      }
    } else if ((k & CLOSE) !== 0) {
      const bracket = c === CLOSE_BRACKET ? 1 : 0;
      if (depth > 0 && (bracket === 0 || (mode & BRACKETS) !== 0) && (kinds & 1) === bracket) {
        kinds >>>= 1;
        depth--;
      }
    } else if ((k & SOLIDUS) !== 0 && (mode & COMMENTS) !== 0 && s.charCodeAt(i + 1) === ASTERISK) {
      const close = s.indexOf('*/', i + 2);
      i = close === -1 || close + 2 > end ? end : close + 2;
      continue;
    }
    i++;
  }
  scanDepth = depth;
  return end;
}

const SOLIDUS_STOP = stops('/');

/**
 * Remove the comments CSS reads: `/* *\/` at any parenthesis depth, outside
 * strings, escapes, and unquoted `url(`; with `lineComments`, also `//` to
 * the end of its line outside parentheses (not after `:`, so `https://`
 * stays). A comment between two whitespace runs leaves the first run. A `/`
 * left directly before a `*` gets a space after it, so removal never forms a
 * new comment.
 */
export function removeComments(text: string, lineComments: boolean): string {
  if (text.indexOf('/*') === -1 && (!lineComments || text.indexOf('//') === -1)) return text;
  const len = text.length;
  let out = '';
  let start = 0;
  let i = 0;
  let depth = 0;
  for (;;) {
    i = scan(text, i, len, SOLIDUS_STOP, ANY_DEPTH, depth);
    if (i >= len) break;
    depth = scanDepth;
    const next = text.charCodeAt(i + 1);
    if (
      next === SLASH &&
      lineComments &&
      depth === 0 &&
      !(i > 0 && text.charCodeAt(i - 1) === COLON)
    ) {
      out += text.substring(start, i);
      const eol = text.indexOf('\n', i + 2);
      i = start = eol === -1 ? len : eol;
      continue;
    }
    if (next !== ASTERISK) {
      i++;
      continue;
    }
    out += text.substring(start, i);
    const close = text.indexOf('*/', i + 2);
    i = close === -1 ? len : close + 2;
    if (out.length > 0 && isSpace(out.charCodeAt(out.length - 1))) {
      while (i < len && isSpace(text.charCodeAt(i))) i++;
    } else if (
      text.charCodeAt(i) === ASTERISK &&
      out.length > 0 &&
      out.charCodeAt(out.length - 1) === SLASH &&
      !isEscaped(out, out.length - 1)
    ) {
      out += ' ';
    }
    start = i;
  }
  return start === 0 ? text : out + text.substring(start);
}
