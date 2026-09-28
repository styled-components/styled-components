import {
  ASTERISK,
  AT,
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_BRACKET,
  CLOSE_PAREN,
  COLON,
  CR,
  DIGIT_0,
  DIGIT_9,
  DOT,
  DOUBLE_QUOTE,
  EXCLAMATION,
  FORM_FEED,
  GT,
  HASH,
  HYPHEN,
  isIdentChar,
  isWS,
  LF,
  LOWER_A,
  LOWER_L,
  LOWER_R,
  LOWER_U,
  LT,
  NUL,
  OPEN_BRACE,
  OPEN_BRACKET,
  OPEN_PAREN,
  PERCENT,
  PLUS,
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
function isNewline(c: number): boolean {
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
 * Number of backslashes in the run that ends at `i` (0 when `s[i]` is not
 * one), reading back no further than `low`.
 */
function backslashRun(s: string, low: number, i: number): number {
  let k = i;
  while (k >= low && s.charCodeAt(k) === BACKSLASH) k--;
  return i - k;
}

/**
 * Start of the identifier (escapes included) that ends at `end` in `s`;
 * equal to `end` when none does. A backslash run is counted once: its pairs
 * are escaped backslashes, and an odd one out escapes the code point after
 * the run.
 */
function identifierStart(s: string, end: number): number {
  let k = end;
  while (k > 0) {
    const c = s.charCodeAt(k - 1);
    if (isIdentCode(c)) {
      k--;
      continue;
    }
    if (c === BACKSLASH) {
      const run = backslashRun(s, 0, k - 1);
      // An odd run directly before `end` escapes the code point at `end`.
      if ((run & 1) === 1 && k === end) break;
      k -= run;
      continue;
    }
    const run = backslashRun(s, 0, k - 2);
    if ((run & 1) === 1 && !isNewline(c)) {
      k -= 1 + run;
    } else if (isSpace(c)) {
      // Whitespace ending a hex escape belongs to it.
      const w = c === LF && k > 1 && s.charCodeAt(k - 2) === CR ? k - 2 : k - 1;
      const escape = hexEscapeStart(s, 0, w);
      if (escape === -1) break;
      k = escape;
    } else {
      break;
    }
  }
  // `<!--` reads as one token, so the hyphens it ends with start no identifier.
  if (
    k >= 2 &&
    k + 1 < end &&
    s.charCodeAt(k) === HYPHEN &&
    s.charCodeAt(k + 1) === HYPHEN &&
    s.charCodeAt(k - 1) === EXCLAMATION &&
    s.charCodeAt(k - 2) === LT &&
    (backslashRun(s, 0, k - 3) & 1) === 0
  ) {
    k += 2;
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
  return isUrlIdentifier(s, identifierStart(s, open), open);
}

/** {@link isUrlCall} for the identifier `s[start..open)` found by {@link identifierStart}. */
function isUrlIdentifier(s: string, start: number, open: number): boolean {
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
function opensUrl(s: string, open: number): boolean {
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
 * Index of the backslash of the hex escape whose digits end at `end` in `s`
 * (one to six hex digits after an unescaped backslash), reading back no
 * further than `low`; -1 when none does.
 */
function hexEscapeStart(s: string, low: number, end: number): number {
  let d = end;
  while (d > low && end - d < 6 && isHex(s.charCodeAt(d - 1))) d--;
  if (d === end || d === low || s.charCodeAt(d - 1) !== BACKSLASH) return -1;
  return (backslashRun(s, low, d - 1) & 1) === 1 ? d - 1 : -1;
}

/** {@link tailKind}: the text is empty. */
const TAIL_NONE = -4;
/** {@link tailKind}: the text ends in whitespace CSS reads as whitespace. */
const TAIL_SPACE = -1;
/** {@link tailKind}: the text ends in identifier text a following identifier, number, or `(` continues. */
const TAIL_IDENT = -2;
/** {@link tailKind}: {@link TAIL_IDENT}, ending in the digits of a hex escape a whitespace code point would end. */
const TAIL_HEX = -3;

/**
 * How the non-empty text `s[low..end)` ends, for {@link commentJoins}:
 * {@link TAIL_SPACE}, {@link TAIL_IDENT}, {@link TAIL_HEX}, or else its last
 * code point, a delimiter.
 */
function tailKind(s: string, low: number, end: number): number {
  const c = s.charCodeAt(end - 1);
  if (isHex(c) && hexEscapeStart(s, low, end) !== -1) return TAIL_HEX;
  if (isIdentCode(c) || (backslashRun(s, low, end - 2) & 1) === 1) return TAIL_IDENT;
  if (!isSpace(c)) return c;
  // Whitespace ending a hex escape belongs to it; a CR ending one would
  // take an LF after it too, as one newline.
  const w = c === LF && end - 2 >= low && s.charCodeAt(end - 2) === CR ? end - 2 : end - 1;
  if (hexEscapeStart(s, low, w) === -1) return TAIL_SPACE;
  return c === CR ? TAIL_HEX : TAIL_IDENT;
}

function isDigit(c: number): boolean {
  return c >= DIGIT_0 && c <= DIGIT_9;
}

/**
 * Whether text ending as `tail` describes ({@link tailKind}) and text
 * starting with the code point `next` (-1 at the end) would read as one
 * token where a comment separated them: the pairs CSS Syntax 3 serialization
 * separates with a comment, read by code point and erring toward keeping the
 * comment.
 */
function commentJoins(tail: number, next: number): boolean {
  if (tail === TAIL_SPACE || tail === TAIL_NONE || next === -1) return false;
  if (isSpace(next)) return tail === TAIL_HEX;
  if (tail === TAIL_IDENT || tail === TAIL_HEX) {
    return (
      isIdentCode(next) ||
      next === BACKSLASH ||
      next === OPEN_PAREN ||
      next === PERCENT ||
      next === DOT ||
      next === PLUS ||
      next === GT
    );
  }
  switch (tail) {
    case HASH:
    case AT:
      return isIdentCode(next) || next === BACKSLASH;
    case DOT:
      return isDigit(next);
    case PLUS:
      return isDigit(next) || next === DOT;
    case SLASH:
      return next === ASTERISK;
    case LT:
      return next === EXCLAMATION;
    case EXCLAMATION:
      return next === HYPHEN;
    default:
      return false;
  }
}

/**
 * Remove the comments CSS reads: `/* *\/` at any parenthesis depth, outside
 * strings, escapes, and unquoted `url(`; with `lineComments`, also `//` to
 * the end of its line outside parentheses (not after `:`, so `https://`
 * stays). A comment between two whitespace runs leaves the first run. Where
 * removal would join the code points on either side into one token, an
 * empty `/**\/` stays in the comment's place, so the text reads as the same
 * tokens.
 */
export function removeComments(text: string, lineComments: boolean): string {
  if (text.indexOf('/*') === -1 && (!lineComments || text.indexOf('//') === -1)) return text;
  const len = text.length;
  let out = '';
  let start = 0;
  let i = 0;
  let depth = 0;
  // How `out` ends, read from `text` so `out` is never flattened. Reading
  // back stops at the start of the text last copied: when that text starts
  // with a backslash or hex digit, the code point before it in `out` is
  // neither (removal there would have joined, keeping `/**/`).
  let tail = TAIL_NONE;
  for (;;) {
    i = scan(text, i, len, SOLIDUS_STOP, ANY_DEPTH, depth);
    if (i >= len) break;
    depth = scanDepth;
    const next = text.charCodeAt(i + 1);
    const line =
      next === SLASH && lineComments && depth === 0 && !(i > 0 && text.charCodeAt(i - 1) === COLON);
    if (!line && next !== ASTERISK) {
      i++;
      continue;
    }
    if (i > start) {
      out += text.substring(start, i);
      tail = tailKind(text, start, i);
    }
    if (line) {
      const eol = text.indexOf('\n', i + 2);
      i = eol === -1 ? len : eol;
    } else {
      const close = text.indexOf('*/', i + 2);
      i = close === -1 ? len : close + 2;
    }
    if (tail === TAIL_SPACE && !line) {
      while (i < len && isSpace(text.charCodeAt(i))) i++;
    } else if (commentJoins(tail, i < len ? text.charCodeAt(i) : -1)) {
      out += '/**/';
      tail = SLASH;
    }
    start = i;
  }
  return start === 0 ? text : out + text.substring(start);
}

function isNonPrintable(c: number): boolean {
  return (c >= 0 && c <= 8) || c === 11 || (c >= 14 && c <= 31) || c === 127;
}

/** A table marking the ASCII code points in `chars`, and the non-printable ones with `nonPrintable`. */
export function codeTable(chars: string, nonPrintable: boolean): Uint8Array {
  const table = new Uint8Array(128);
  for (let i = 0; i < chars.length; i++) table[chars.charCodeAt(i)] = 1;
  if (nonPrintable) {
    for (let c = 0; c < 128; c++) if (isNonPrintable(c)) table[c] = 1;
  }
  return table;
}

/** Index of the first code point at or after `i` that `table` marks; non-ASCII is never marked. */
export function skipOrdinary(s: string, i: number, end: number, table: Uint8Array): number {
  while (i < end) {
    const c = s.charCodeAt(i);
    if (c < 128 && table[c] === 1) return i;
    i++;
  }
  return end;
}

/** Code points that can change how a field reads outside strings, comments, and url text. */
const FIELD_SPECIAL = codeTable('{}()[];"\'\\/', false);
/** Code points that end an ordinary run inside a string. */
const STRING_STOP = codeTable('\\"\'\n\r\f', false);
/** Code points that end an ordinary run inside a url. */
const URL_STOP = codeTable('\\)"\'( \t\n\r\f', true);
/** Code points that end an ordinary run inside a bad url's remnants. */
const REMNANT_STOP = codeTable('\\)', false);

const NO_VALUES: ReadonlyArray<number> = [];

/**
 * Whether a field's template text, with plain text in place of each slot
 * between `chunks`, passes {@link readField}.
 */
export function templateReadsBalanced(chunks: ReadonlyArray<string>): boolean {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (skipOrdinary(chunk, 0, chunk.length, FIELD_SPECIAL) !== chunk.length) {
      return readField(chunks.join('x'), NO_VALUES, 0) === 0;
    }
  }
  return true;
}

/** {@link readField} result bit: the field fails its check. */
export const FIELD_FAILED = 1;
/**
 * {@link readField} result bit: the field holds a `;` outside strings,
 * comments, url text, parentheses, brackets, and blocks.
 */
export const FIELD_SEMICOLON = 2;

/** Whether `pos` falls in one of the first `count` `[start, end)` pairs of `spans`. */
function inSpans(spans: ReadonlyArray<number>, count: number, pos: number): boolean {
  for (let k = 0; k < count; k++) {
    if (pos >= spans[2 * k] && pos < spans[2 * k + 1]) return true;
  }
  return false;
}

/**
 * Whether `url(` (any case) ends at the `(` at `open`, directly after a code
 * point at or above U+0080 (or NUL, read as U+FFFD). CSS Syntax 3 revisions
 * disagree on whether such a code point continues an identifier, so the text
 * has no single reading.
 */
function urlAfterNonAscii(s: string, open: number): boolean {
  if (open < 4) return false;
  const c = s.charCodeAt(open - 4);
  return (
    (c >= 0x80 || c === NUL) &&
    (s.charCodeAt(open - 3) | 0x20) === LOWER_U &&
    (s.charCodeAt(open - 2) | 0x20) === LOWER_R &&
    (s.charCodeAt(open - 1) | 0x20) === LOWER_L
  );
}

/** Index past the string whose quote is at `i`; -1 when it holds a raw newline or does not close. */
function fieldStringEnd(s: string, i: number, end: number): number {
  const quote = s.charCodeAt(i);
  i++;
  for (;;) {
    i = skipOrdinary(s, i, end, STRING_STOP);
    if (i >= end) return -1;
    const c = s.charCodeAt(i);
    if (c === quote) return i + 1;
    if (isNewline(c)) return -1;
    // A backslash escapes the next code point, a newline included.
    i += c === BACKSLASH ? 2 : 1;
  }
}

/** Index past the unquoted url whose text starts at `i`; -1 when it does not close. */
function fieldUrlEnd(s: string, i: number, end: number): number {
  while (i < end && isSpace(s.charCodeAt(i))) i++;
  let bad = false;
  for (;;) {
    i = skipOrdinary(s, i, end, bad ? REMNANT_STOP : URL_STOP);
    if (i >= end) return -1;
    const c = s.charCodeAt(i);
    if (c === CLOSE_PAREN) return i + 1;
    if (c === BACKSLASH) {
      if (i + 1 >= end) return -1;
      if (isNewline(s.charCodeAt(i + 1))) {
        bad = true;
        i++;
      } else {
        i = escapeEnd(s, i, end);
      }
    } else if (isSpace(c)) {
      while (i < end && isSpace(s.charCodeAt(i))) i++;
      if (i < end && s.charCodeAt(i) === CLOSE_PAREN) return i + 1;
      bad = true;
    } else {
      // A quote, `(`, or non-printable code point makes a bad url.
      bad = true;
      i++;
    }
  }
}

/**
 * Read a realized field (a declaration value, property name, selector,
 * at-rule prelude, keyframe stop, or Head remainder) from its start with CSS
 * Syntax 3 tokenization, and return a bit set of {@link FIELD_FAILED} and
 * {@link FIELD_SEMICOLON}. The first `count` `[start, end)` pairs of `spans`
 * are the text the field's values wrote.
 *
 * The field fails when it ends inside a string, comment, url, parenthesis,
 * bracket, or block, or in an escaping backslash; when it closes a
 * parenthesis, bracket, or block it did not open; when a string holds a raw
 * newline; when it holds `url(` directly after a code point at or above
 * U+0080; or when a value wrote a `{` or `}` that does not read as part of a
 * string or url.
 */
export function readField(text: string, spans: ReadonlyArray<number>, count: number): number {
  const len = text.length;
  let i = skipOrdinary(text, 0, len, FIELD_SPECIAL);
  if (i === len) return 0;
  let flags = 0;
  let depth = 0;
  // Two bits per nesting level, innermost highest: 0 parenthesis, 1 bracket, 2 block.
  let kinds = 0;
  while (i < len) {
    const c = text.charCodeAt(i);
    if (c === BACKSLASH) {
      if (i + 1 >= len) return FIELD_FAILED;
      const next = text.charCodeAt(i + 1);
      if (isNewline(next)) {
        i++;
      } else {
        if ((next === OPEN_BRACE || next === CLOSE_BRACE) && inSpans(spans, count, i + 1)) {
          return FIELD_FAILED;
        }
        i = escapeEnd(text, i, len);
      }
    } else if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
      i = fieldStringEnd(text, i, len);
      if (i < 0) return FIELD_FAILED;
    } else if (c === SLASH) {
      if (text.charCodeAt(i + 1) === ASTERISK) {
        const close = text.indexOf('*/', i + 2);
        if (close === -1) return FIELD_FAILED;
        for (let k = i + 2; k < close; k++) {
          const d = text.charCodeAt(k);
          if ((d === OPEN_BRACE || d === CLOSE_BRACE) && inSpans(spans, count, k)) {
            return FIELD_FAILED;
          }
        }
        i = close + 2;
      } else {
        i++;
      }
    } else if (c === OPEN_PAREN) {
      if (urlAfterNonAscii(text, i)) return FIELD_FAILED;
      if (opensUrl(text, i)) {
        i = fieldUrlEnd(text, i + 1, len);
        if (i < 0) return FIELD_FAILED;
      } else {
        if (depth === 15) return FIELD_FAILED;
        depth++;
        i++;
      }
    } else if (c === OPEN_BRACKET || c === OPEN_BRACE) {
      if (depth === 15) return FIELD_FAILED;
      if (c === OPEN_BRACE && inSpans(spans, count, i)) return FIELD_FAILED;
      kinds |= (c === OPEN_BRACKET ? 1 : 2) << (2 * depth);
      depth++;
      i++;
    } else if (c === CLOSE_PAREN || c === CLOSE_BRACKET || c === CLOSE_BRACE) {
      if (c === CLOSE_BRACE && inSpans(spans, count, i)) return FIELD_FAILED;
      const kind = c === CLOSE_PAREN ? 0 : c === CLOSE_BRACKET ? 1 : 2;
      if (depth === 0 || ((kinds >>> (2 * (depth - 1))) & 3) !== kind) return FIELD_FAILED;
      depth--;
      kinds &= ~(3 << (2 * depth));
      i++;
    } else {
      if (depth === 0) flags |= FIELD_SEMICOLON;
      i++;
    }
    i = skipOrdinary(text, i, len, FIELD_SPECIAL);
  }
  return depth === 0 ? flags : FIELD_FAILED;
}
