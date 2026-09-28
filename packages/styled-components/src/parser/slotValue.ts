import {
  ASTERISK,
  BACKSLASH,
  CLOSE_BRACE,
  CLOSE_BRACKET,
  CLOSE_PAREN,
  COLON,
  CR,
  DOUBLE_QUOTE,
  FORM_FEED,
  isIdentChar,
  isWS,
  LF,
  LOWER_L,
  LOWER_R,
  LOWER_U,
  OPEN_BRACE,
  OPEN_BRACKET,
  OPEN_PAREN,
  SEMICOLON,
  SINGLE_QUOTE,
  SLASH,
} from '../utils/charCodes';
import { fifoSet } from '../utils/fifoMap';
import { isEscaped } from '../utils/normalize';
import type { StaticDeclNode } from './ast';
import { NodeKind } from './ast';
import { isCustomProperty, SlotEntry, stripCommaSpaces, trimRange } from './parser';

/** {@link checkSlotValue} result: the value passed and holds no top-level `;`. */
const VALUE_OK = 0;
/** {@link checkSlotValue} result bit: the value fails a check. */
export const VALUE_FAILED = 1;
/** {@link checkSlotValue} result bit: the value holds a `;` at the top level of its statement. */
export const VALUE_SEMICOLON = 2;

/** Newline as CSS preprocessing reads it: LF, CR, or form feed. */
function isNewline(c: number): boolean {
  return c === LF || c === CR || c === FORM_FEED;
}

/** CSS whitespace, form feed included. */
function isSpace(c: number): boolean {
  return isWS(c) || c === FORM_FEED;
}

/** An ident code point as CSS reads it: ASCII ident characters or any non-ASCII code point. */
function isIdentCode(c: number): boolean {
  return isIdentChar(c) || c >= 0x80;
}

function isNonPrintable(c: number): boolean {
  return (c >= 0 && c <= 8) || c === 11 || (c >= 14 && c <= 31) || c === 127;
}

/**
 * Characters that can change tokenizer state outside strings and `url(`. A
 * value made only of other characters, starting outside any string or
 * `url(`, needs no further reading.
 */
const SPECIAL = stopTable('{}()[];"\'\\/*', false);

/** Code points that end an ordinary run inside a comment. */
const STOP_COMMENT = stopTable('{}*', false);
/** Code points that end an ordinary run inside a string. */
const STOP_STRING = stopTable('{}\\"\'\n\r\f', false);
/** Code points that end an ordinary run inside a url. */
const STOP_URL = stopTable('{}\\)"\'( \t\n\r\f', true);
/** Code points that end an ordinary run inside a bad url's remnants. */
const STOP_REMNANT = stopTable('{}\\)', false);

function stopTable(chars: string, nonPrintable: boolean): Uint8Array {
  const table = new Uint8Array(128);
  for (let i = 0; i < chars.length; i++) table[chars.charCodeAt(i)] = 1;
  if (nonPrintable) {
    for (let c = 0; c < 128; c++) if (isNonPrintable(c)) table[c] = 1;
  }
  return table;
}

/** Index of the first code point at or after `i` that `stops` marks; non-ASCII never stops. */
function skipOrdinary(value: string, i: number, len: number, stops: Uint8Array): number {
  while (i < len) {
    const c = value.charCodeAt(i);
    if (c < 128 && stops[c] === 1) return i;
    i++;
  }
  return len;
}

/** Whether the text ends in a backslash that escapes whatever follows it. */
function endsWithEscape(text: string): boolean {
  return isEscaped(text, text.length);
}

/** Whether the text ends in a `/` that is not itself escaped. */
function endsWithSlash(text: string): boolean {
  const last = text.length - 1;
  return last >= 0 && text.charCodeAt(last) === SLASH && !isEscaped(text, last);
}

/**
 * How a `(` reads, from the identifier before it. `strict` is for an
 * identifier that text outside the value may extend: the parenthesized text
 * must read the same whether the `(` opens `url(` or a function.
 */
const enum Paren {
  Function = 0,
  Url = 1,
  Strict = 2,
}

/** Whether `ident`, compared ASCII case-insensitively, is `url`. */
function isUrlName(ident: string): boolean {
  return (
    ident.length === 3 &&
    (ident.charCodeAt(0) | 0x20) === LOWER_U &&
    (ident.charCodeAt(1) | 0x20) === LOWER_R &&
    (ident.charCodeAt(2) | 0x20) === LOWER_L
  );
}

/**
 * Whether `url(` (any case) ends at `open` in `text`, with the code point
 * directly before that `u` at or above U+0080. `before` extends `text`
 * backward when that code point, or part of `url`, falls outside it. CSS
 * Syntax 3 revisions disagree on whether such a code point continues an
 * identifier, so the value has no single reading and always fails.
 */
function urlPrecededByNonAscii(text: string, open: number, before: string): boolean {
  // `open` is well past `text`'s start for almost every call (a `(` deep in
  // an ordinary value); a plain length check skips ever touching `before`,
  // and no closure is allocated per call.
  if (open >= 4) {
    return (
      (text.charCodeAt(open - 1) | 0x20) === LOWER_L &&
      (text.charCodeAt(open - 2) | 0x20) === LOWER_R &&
      (text.charCodeAt(open - 3) | 0x20) === LOWER_U &&
      text.charCodeAt(open - 4) >= 0x80
    );
  }
  const joined = before + text.substring(0, open);
  const end = joined.length;
  return (
    end >= 4 &&
    (joined.charCodeAt(end - 1) | 0x20) === LOWER_L &&
    (joined.charCodeAt(end - 2) | 0x20) === LOWER_R &&
    (joined.charCodeAt(end - 3) | 0x20) === LOWER_U &&
    joined.charCodeAt(end - 4) >= 0x80
  );
}

/**
 * The identifier `before` ends with, or `null` when an escape could make it
 * part of a longer identifier the text does not show.
 */
function trailingIdent(before: string): string | null {
  let k = before.length;
  while (k > 0 && isIdentCode(before.charCodeAt(k - 1))) k--;
  if (isEscaped(before, k)) return null;
  if (k > 0 && isEscaped(before, k - 1)) return null;
  return before.substring(k);
}

function parenKind(
  value: string,
  open: number,
  identStart: number,
  identEscaped: boolean,
  before: string
): Paren {
  if (identEscaped) return Paren.Strict;
  if (identStart > 0)
    return isUrlName(value.substring(identStart, open)) ? Paren.Url : Paren.Function;
  if (identStart < 0 && open > 0) return Paren.Function;
  const lead = value.substring(0, open);
  const prior = trailingIdent(before);
  if (prior === null) return Paren.Strict;
  return isUrlName(prior + lead) ? Paren.Url : Paren.Function;
}

/**
 * Whether the special code points of `value`, from `i` on, are only balanced
 * parentheses, none opening `url(`, so the value reads the same as plain
 * text. An identifier before a `(` that reaches the value's start could join
 * an identifier ending `before`, so that shape is left to the full reading.
 */
function onlyFunctionParens(value: string, i: number, before: string): boolean {
  const len = value.length;
  let depth = 0;
  while (i < len) {
    const c = value.charCodeAt(i);
    if (c === OPEN_PAREN) {
      if (urlPrecededByNonAscii(value, i, before)) return false;
      let k = i;
      while (k > 0 && isIdentCode(value.charCodeAt(k - 1))) k--;
      if (k === 0 && before.length > 0 && isIdentCode(before.charCodeAt(before.length - 1))) {
        return false;
      }
      if (i - k === 3 && isUrlName(value.substring(k, i))) return false;
      depth++;
    } else if (c === CLOSE_PAREN) {
      if (--depth < 0) return false;
    } else {
      return false;
    }
    i = skipOrdinary(value, i + 1, len, SPECIAL);
  }
  return depth === 0;
}

/**
 * Read a slot value with CSS Syntax 3 tokenization from its entry state and
 * return a bit set of {@link VALUE_FAILED} and {@link VALUE_SEMICOLON}.
 * `before` is the realized text in front of the value in its field, read
 * only at its end (an escape, a `/`, or an identifier that joins the value).
 *
 * The value fails when it holds `{` or `}` anywhere, a raw newline inside a
 * string, a trailing escape, a `)` or `]` it did not open, or ends in a
 * different state than it started (string, comment, parenthesis, bracket,
 * `url(`).
 */
export function checkSlotValue(raw: string, entry: SlotEntry, before: string): number {
  const plain = entry.quote === 0 && !entry.url;
  const escaped = endsWithEscape(before);
  if (plain && !escaped) {
    const special = skipOrdinary(raw, 0, raw.length, SPECIAL);
    if (special === raw.length) return VALUE_OK;
    if (raw.charCodeAt(0) === ASTERISK && endsWithSlash(before)) return VALUE_FAILED;
    if (onlyFunctionParens(raw, special, before)) return VALUE_OK;
  }
  // A backslash written before the slot escapes the value's first code point,
  // so the value is read with that backslash in front of it.
  const value = escaped ? '\\' + raw : raw;
  const len = value.length;

  let quote = entry.quote;
  /** 0 outside `url(`, 1 reading a url, 2 reading a bad url's remnants. */
  let url = entry.url ? 1 : 0;
  let depth = 0;
  let bracket = 0;
  let comment = false;
  let flags = VALUE_OK;
  let identStart = -1;
  let identEscaped = false;
  let i = 0;

  while (i < len) {
    // Inside a comment, string, or url, skip the run of code points that
    // cannot change the state.
    if (comment) i = skipOrdinary(value, i, len, STOP_COMMENT);
    else if (quote !== 0) i = skipOrdinary(value, i, len, STOP_STRING);
    else if (url === 1) i = skipOrdinary(value, i, len, STOP_URL);
    else if (url === 2) i = skipOrdinary(value, i, len, STOP_REMNANT);
    if (i >= len) break;
    const c = value.charCodeAt(i);
    if (c === OPEN_BRACE || c === CLOSE_BRACE) return VALUE_FAILED;
    if (comment) {
      if (c === ASTERISK && value.charCodeAt(i + 1) === SLASH) {
        comment = false;
        i += 2;
      } else {
        i++;
      }
      continue;
    }
    if (c === BACKSLASH) {
      if (i + 1 >= len) return VALUE_FAILED;
      const next = value.charCodeAt(i + 1);
      if (next === OPEN_BRACE || next === CLOSE_BRACE) return VALUE_FAILED;
      if (isNewline(next)) {
        if (quote !== 0) {
          i += 2;
        } else {
          if (url === 1) url = 2;
          identStart = -1;
          i++;
        }
        continue;
      }
      if (quote === 0 && url === 0) {
        if (identStart < 0) identStart = i;
        identEscaped = true;
      }
      i += 2;
      continue;
    }
    if (quote !== 0) {
      if (c === quote) quote = 0;
      else if (isNewline(c)) return VALUE_FAILED;
      i++;
      continue;
    }
    if (url !== 0) {
      if (c === CLOSE_PAREN) {
        url = 0;
        if (--depth < 0) return VALUE_FAILED;
        identStart = -1;
      } else if (url === 1) {
        if (isSpace(c)) {
          let j = i + 1;
          while (j < len && isSpace(value.charCodeAt(j))) j++;
          if (j < len && value.charCodeAt(j) !== CLOSE_PAREN) url = 2;
          i = j;
          continue;
        }
        if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE || c === OPEN_PAREN || isNonPrintable(c)) {
          url = 2;
        }
      }
      i++;
      continue;
    }
    if (c === SLASH && value.charCodeAt(i + 1) === ASTERISK) {
      comment = true;
      identStart = -1;
      i += 2;
      continue;
    }
    if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
      quote = c;
    } else if (c === OPEN_PAREN) {
      if (urlPrecededByNonAscii(value, i, before)) return VALUE_FAILED;
      const kind = parenKind(value, i, identStart, identEscaped, before);
      if (kind === Paren.Strict) {
        // Both readings agree only when the text up to the first `)` holds
        // nothing a url and a function read differently.
        let j = i + 1;
        for (; j < len; j++) {
          const d = value.charCodeAt(j);
          if (d === CLOSE_PAREN) break;
          if (
            d === DOUBLE_QUOTE ||
            d === SINGLE_QUOTE ||
            d === OPEN_PAREN ||
            d === BACKSLASH ||
            d === OPEN_BRACE ||
            d === CLOSE_BRACE ||
            (d === SLASH && value.charCodeAt(j + 1) === ASTERISK)
          ) {
            return VALUE_FAILED;
          }
        }
        if (j >= len) return VALUE_FAILED;
        i = j + 1;
        identStart = -1;
        identEscaped = false;
        continue;
      }
      depth++;
      if (kind === Paren.Url) {
        let j = i + 1;
        while (j < len && isSpace(value.charCodeAt(j))) j++;
        const next = value.charCodeAt(j);
        if (next !== DOUBLE_QUOTE && next !== SINGLE_QUOTE) url = 1;
        if (url === 1) {
          i = j;
          identStart = -1;
          identEscaped = false;
          continue;
        }
      }
    } else if (c === CLOSE_PAREN) {
      if (--depth < 0) return VALUE_FAILED;
    } else if (c === OPEN_BRACKET) {
      bracket++;
    } else if (c === CLOSE_BRACKET) {
      if (--bracket < 0) return VALUE_FAILED;
    } else if (c === SEMICOLON) {
      if (entry.parenDepth + depth === 0 && bracket === 0) flags |= VALUE_SEMICOLON;
    } else if (isIdentCode(c)) {
      if (identStart < 0) {
        identStart = i;
        identEscaped = false;
      }
      i++;
      while (i < len && isIdentCode(value.charCodeAt(i))) i++;
      continue;
    }
    identStart = -1;
    identEscaped = false;
    i++;
  }

  if (comment || quote !== entry.quote || depth !== 0 || bracket !== 0) return VALUE_FAILED;
  if (url !== (entry.url ? 1 : 0)) return VALUE_FAILED;
  return flags;
}

/**
 * Whether appending template text after a value changes how the text reads
 * from what the template's own reading assumed: a `/` meeting `*` (a
 * comment), a backslash escaping the text's first code point, or an
 * identifier joining the text's identifier before `(` so that `url(` starts
 * or stops. Only called outside strings and `url(` for the `/` and `url(`
 * cases; an escape changes the reading anywhere.
 */
export function chunkChangesReading(before: string, chunk: string, plain: boolean): boolean {
  if (chunk.length === 0 || before.length === 0) return false;
  if (endsWithEscape(before)) return true;
  if (!plain) return false;
  const first = chunk.charCodeAt(0);
  if (first === ASTERISK) return endsWithSlash(before);
  if (first !== OPEN_PAREN && !isIdentCode(first)) return false;
  let k = 0;
  while (k < chunk.length && isIdentCode(chunk.charCodeAt(k))) k++;
  if (chunk.charCodeAt(k) !== OPEN_PAREN) return false;
  const lead = chunk.substring(0, k);
  const prior = trailingIdent(before);
  if (prior === null) return true;
  if (prior === '') return false;
  return isUrlName(prior + lead) !== isUrlName(lead);
}

/** Top-level declaration stops, read with CSS Syntax 3 tokenization from the top level. */
function scanTopLevel(text: string, start: number, end: number, stop: number): number {
  let quote = 0;
  let url = 0;
  let depth = 0;
  let bracket = 0;
  let i = start;
  while (i < end) {
    const c = text.charCodeAt(i);
    if (c === BACKSLASH) {
      i += 2;
      continue;
    }
    if (quote !== 0) {
      if (c === quote) quote = 0;
      i++;
      continue;
    }
    if (url !== 0) {
      if (c === CLOSE_PAREN) {
        url = 0;
        depth--;
      }
      i++;
      continue;
    }
    if (c === SLASH && text.charCodeAt(i + 1) === ASTERISK) {
      const close = text.indexOf('*/', i + 2);
      i = close === -1 ? end : close + 2;
      continue;
    }
    if (c === DOUBLE_QUOTE || c === SINGLE_QUOTE) {
      quote = c;
    } else if (c === OPEN_PAREN) {
      depth++;
      if (
        i >= 3 &&
        isUrlName(text.substring(i - 3, i)) &&
        (i === 3 || !isIdentCode(text.charCodeAt(i - 4)))
      ) {
        let j = i + 1;
        while (j < end && isSpace(text.charCodeAt(j))) j++;
        const next = text.charCodeAt(j);
        if (next !== DOUBLE_QUOTE && next !== SINGLE_QUOTE) url = 1;
      }
    } else if (c === CLOSE_PAREN) {
      if (depth > 0) depth--;
    } else if (c === OPEN_BRACKET) {
      bracket++;
    } else if (c === CLOSE_BRACKET) {
      if (bracket > 0) bracket--;
    } else if (c === stop && depth === 0 && bracket === 0) {
      return i;
    }
    i++;
  }
  return end;
}

const splitCache = new Map<string, StaticDeclNode[]>();
const SPLIT_CACHE_LIMIT = 200;

/**
 * Split a realized declaration whose values passed {@link checkSlotValue}
 * into its declarations at every top-level `;`. Each part keeps its own
 * text, cut only at a top-level `;` or `:`, so a part that is dropped (no
 * `:`, or an empty value on a regular property) never leaves another part
 * reading differently.
 */
export function splitDeclarations(text: string): StaticDeclNode[] {
  const cached = splitCache.get(text);
  if (cached !== undefined) return cached;
  const decls: StaticDeclNode[] = [];
  const len = text.length;
  let start = 0;
  while (start <= len) {
    const end = scanTopLevel(text, start, len, SEMICOLON);
    const colon = scanTopLevel(text, start, end, COLON);
    if (colon < end) {
      const prop = trimRange(text, start, colon);
      const value = stripCommaSpaces(trimRange(text, colon + 1, end));
      if (prop !== '' && (value !== '' || isCustomProperty(prop))) {
        decls.push({ kind: NodeKind.Decl, prop, value });
      }
    }
    start = end + 1;
  }
  fifoSet(splitCache, text, decls, SPLIT_CACHE_LIMIT);
  return decls;
}
