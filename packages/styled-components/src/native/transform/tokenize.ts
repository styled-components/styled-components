import * as $ from '../../utils/charCodes';
import { isEscaped } from '../../utils/cssCompile';
import { isSafeThemePath, sanitizeValue } from './sanitize';
import {
  Token,
  TokenKind,
  angleToken,
  functionToken,
  hashToken,
  identToken,
  lengthToken,
  numberToken,
  opToken,
  percentToken,
  sentinelToken,
  stringToken,
  timeToken,
  COMMA_TOKEN,
  SLASH_TOKEN,
} from './tokens';

// Whitespace-class Unicode constants beyond the shared ASCII-range
// charCodes module. These exist to make tokenization resilient against
// paste artifacts (NBSP / zero-width / BOM / line+para separators /
// en-quad family / ideographic / ogham space).
const VT = 11; // \v
const FF = 12; // \f
const NBSP = 0xa0;
const OGHAM_SPACE = 0x1680;
const EN_QUAD = 0x2000; // through 0x200a (various Unicode spaces)
const LINE_SEP = 0x2028;
const PARA_SEP = 0x2029;
const NARROW_NBSP = 0x202f;
const MED_MATH_SPACE = 0x205f;
const IDEOGRAPHIC_SPACE = 0x3000;
const ZWSP = 0x200b; // zero-width space (0x200b..0x200d)
const BOM = 0xfeff; // byte-order mark / zero-width no-break space

function isDigit(c: number): boolean {
  return c >= $.DIGIT_0 && c <= $.DIGIT_9;
}

function isIdentStart(c: number): boolean {
  if (
    (c >= $.LOWER_A && c <= $.LOWER_Z) ||
    (c >= $.UPPER_A && c <= $.UPPER_Z) ||
    c === $.UNDERSCORE ||
    c === $.HYPHEN
  ) {
    return true;
  }
  // CSS spec allows any non-ASCII code point in idents, BUT we exclude
  // whitespace-class Unicode (NBSP, ZWSP, BOM, line/para separators, …)
  // so paste artifacts don't silently extend `px` into adjacent tokens.
  return c >= 0x80 && !isWhitespace(c);
}

function isIdentPart(c: number): boolean {
  return isIdentStart(c) || isDigit(c);
}

function isHexDigit(c: number): boolean {
  return (
    isDigit(c) || (c >= $.LOWER_A && c <= $.LOWER_A + 5) || (c >= $.UPPER_A && c <= $.UPPER_A + 5)
  );
}

/**
 * Whitespace check resistant to paste artifacts. Recognises CSS-spec
 * whitespace ($.TAB/$.LF/FF/$.CR/$.SPACE) plus a pragmatic set of Unicode
 * whitespace that commonly sneaks into template literals from rich-text
 * editors: NBSP, zero-width, BOM, line/paragraph separators, en/em-quad
 * family, ideographic space, narrow NBSP.
 *
 * Inlined hot-path: the `< 0x80` fast path covers >99% of real CSS
 * input; the Unicode cases behind the guard short-circuit without
 * perturbing the JIT.
 */
function isWhitespace(c: number): boolean {
  if (c < 0x80) {
    return c === $.SPACE || c === $.TAB || c === $.LF || c === $.CR || c === FF || c === VT;
  }
  if (c === NBSP || c === NARROW_NBSP) return true;
  if (c === BOM || (c >= ZWSP && c <= 0x200d)) return true;
  if (c >= EN_QUAD && c <= 0x200a) return true;
  if (c === LINE_SEP || c === PARA_SEP) return true;
  if (c === OGHAM_SPACE || c === MED_MATH_SPACE || c === IDEOGRAPHIC_SPACE) return true;
  return false;
}

/**
 * Tokenize a CSS declaration value into a flat stream. Whitespace is
 * consumed but not emitted; component separators are comma / slash /
 * juxtaposition. Callers that need space-boundary info should read
 * raw positions off the returned tokens.
 *
 * Function calls are captured as a single {@link TokenKind.Function}
 * token with `args` carrying the raw interior substring. Nested
 * tokenization is lazy; {@link tokenizeFunctionArgs} populates
 * `argTokens` on demand.
 */
export function tokenize(value: string): Token[] {
  // Strip bidi controls and reject disallowed C0 control bytes. Fast-path
  // skips the scan when the input is well-formed.
  value = sanitizeValue(value);
  const tokens: Token[] = [];
  const len = value.length;
  let i = 0;

  while (i < len) {
    const c = value.charCodeAt(i);

    // Skip whitespace
    if (isWhitespace(c)) {
      i++;
      continue;
    }

    // Sentinel token: \0<prefix>:<path>:<fallback>
    // createTheme produces these for native. The prefix is user-configurable,
    // so we match on the leading $.NUL plus first `:` separator.
    if (c === $.NUL) {
      const end = findSentinelEnd(value, i);
      const raw = value.substring(i, end);
      const parts = parseSentinel(raw);
      if (parts !== null) {
        tokens.push(sentinelToken(raw, parts.path, parts.fallback));
        i = end;
        continue;
      }
      // Malformed; skip the $.NUL byte and continue
      i++;
      continue;
    }

    // Comma
    if (c === $.COMMA) {
      tokens.push(COMMA_TOKEN);
      i++;
      continue;
    }

    // Slash (context-dependent; rgb(r g b / a) uses it, calc uses / as op.
    // We emit as Slash; calc consumers remap to Op.)
    if (c === $.SLASH) {
      tokens.push(SLASH_TOKEN);
      i++;
      continue;
    }

    // `*` is always an op. `+` and `-` are op-or-number-sign: if followed
    // by a digit or dot they belong to a signed numeric token, else op.
    if (c === $.ASTERISK) {
      tokens.push(opToken('*'));
      i++;
      continue;
    }
    if (
      c === $.PLUS &&
      !(i + 1 < len && (isDigit(value.charCodeAt(i + 1)) || value.charCodeAt(i + 1) === $.DOT))
    ) {
      tokens.push(opToken('+'));
      i++;
      continue;
    }

    // Hex color: #RGB / #RGBA / #RRGGBB / #RRGGBBAA
    if (c === $.HASH) {
      let j = i + 1;
      while (j < len && isHexDigit(value.charCodeAt(j))) j++;
      const hexLen = j - i - 1;
      if (hexLen === 3 || hexLen === 4 || hexLen === 6 || hexLen === 8) {
        tokens.push(hashToken(value.substring(i, j), value.substring(i + 1, j)));
        i = j;
        continue;
      }
      // Not a valid hex; treat as ident start if followed by ident chars
      // (e.g. `#custom-ident` in some grammars). Fallthrough to ident handling.
    }

    // String literals
    if (c === $.DOUBLE_QUOTE || c === $.SINGLE_QUOTE) {
      const end = findStringEnd(value, i, c);
      if (end !== -1) {
        const raw = value.substring(i, end + 1);
        const text = value.substring(i + 1, end);
        tokens.push(stringToken(raw, text, c));
        i = end + 1;
        continue;
      }
      // Unterminated string; consume the rest as a single raw token
      tokens.push(stringToken(value.substring(i), value.substring(i + 1), c));
      i = len;
      continue;
    }

    // Number (possibly signed) leading to Number/Length/Percent/Angle/Time,
    // OR minus operator inside calc-like contexts.
    if (
      isDigit(c) ||
      c === $.DOT ||
      (c === $.HYPHEN &&
        i + 1 < len &&
        (isDigit(value.charCodeAt(i + 1)) || value.charCodeAt(i + 1) === $.DOT)) ||
      (c === $.PLUS &&
        i + 1 < len &&
        (isDigit(value.charCodeAt(i + 1)) || value.charCodeAt(i + 1) === $.DOT))
    ) {
      const numResult = consumeNumber(value, i);
      if (numResult !== null) {
        tokens.push(numResult.token);
        i = numResult.end;
        continue;
      }
    }

    // Bare minus; op in calc / separator
    if (c === $.HYPHEN) {
      tokens.push(opToken('-'));
      i++;
      continue;
    }

    // Ident or function
    if (isIdentStart(c)) {
      const identEnd = consumeIdent(value, i);
      // Check for '(' → function
      if (identEnd < len && value.charCodeAt(identEnd) === $.OPEN_PAREN) {
        const argsEnd = findMatchingParen(value, identEnd);
        if (argsEnd !== -1) {
          const name = value.substring(i, identEnd);
          const args = value.substring(identEnd + 1, argsEnd);
          tokens.push(functionToken(value.substring(i, argsEnd + 1), name, args));
          i = argsEnd + 1;
          continue;
        }
        // Unmatched paren; treat as ident including the '(' and rest
      }
      tokens.push(identToken(value.substring(i, identEnd)));
      i = identEnd;
      continue;
    }

    // Unknown character; skip to avoid infinite loops. In a well-formed
    // CSS value this shouldn't happen; the preprocessor has already
    // scrubbed comments and validated braces.
    i++;
  }

  return tokens;
}

function consumeIdent(value: string, start: number): number {
  let i = start;
  while (i < value.length && isIdentPart(value.charCodeAt(i))) i++;
  return i;
}

function findStringEnd(value: string, start: number, quote: number): number {
  let i = start + 1;
  while (i < value.length) {
    const c = value.charCodeAt(i);
    if (c === quote && !isEscaped(value, i)) return i;
    i++;
  }
  return -1;
}

function findMatchingParen(value: string, openIdx: number): number {
  let depth = 0;
  let i = openIdx;
  const len = value.length;
  while (i < len) {
    const c = value.charCodeAt(i);
    if (c === $.DOUBLE_QUOTE || c === $.SINGLE_QUOTE) {
      const end = findStringEnd(value, i, c);
      if (end === -1) return -1;
      i = end + 1;
      continue;
    }
    if (c === $.BACKSLASH) {
      i += 2;
      continue;
    }
    if (c === $.OPEN_PAREN) depth++;
    else if (c === $.CLOSE_PAREN) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

interface NumberResult {
  token: Token;
  end: number;
}

function consumeNumber(value: string, start: number): NumberResult | null {
  const len = value.length;
  let i = start;

  // Optional sign
  if (value.charCodeAt(i) === $.HYPHEN || value.charCodeAt(i) === $.PLUS) i++;

  // Integer part
  const intStart = i;
  while (i < len && isDigit(value.charCodeAt(i))) i++;

  // Fraction
  if (i < len && value.charCodeAt(i) === $.DOT && i + 1 < len && isDigit(value.charCodeAt(i + 1))) {
    i++;
    while (i < len && isDigit(value.charCodeAt(i))) i++;
  }

  // If nothing numeric was consumed, bail (caller will fallthrough)
  if (i === intStart && value.charCodeAt(intStart - 1) !== $.DOT) return null;

  // Exponent
  if (i < len) {
    const c = value.charCodeAt(i);
    if (c === $.LOWER_E || c === $.UPPER_E) {
      const save = i;
      i++;
      if (i < len && (value.charCodeAt(i) === $.PLUS || value.charCodeAt(i) === $.HYPHEN)) i++;
      if (i < len && isDigit(value.charCodeAt(i))) {
        while (i < len && isDigit(value.charCodeAt(i))) i++;
      } else {
        i = save; // not a valid exponent, rewind
      }
    }
  }

  const numericRaw = value.substring(start, i);
  const numeric = parseFloat(numericRaw);

  // Unit / percent
  if (i < len) {
    const c = value.charCodeAt(i);
    if (c === $.PERCENT) {
      i++;
      return { token: percentToken(value.substring(start, i), numeric), end: i };
    }
    if (isIdentStart(c)) {
      const unitStart = i;
      while (i < len && isIdentPart(value.charCodeAt(i))) i++;
      const unit = value.substring(unitStart, i).toLowerCase();
      const raw = value.substring(start, i);
      return { token: classifyUnit(raw, numeric, unit), end: i };
    }
  }

  return { token: numberToken(numericRaw, numeric), end: i };
}

function classifyUnit(raw: string, value: number, unit: string): Token {
  if (unit === 'deg' || unit === 'rad' || unit === 'grad' || unit === 'turn') {
    return angleToken(raw, value, unit);
  }
  if (unit === 's' || unit === 'ms') return timeToken(raw, value, unit);
  return lengthToken(raw, value, unit);
}

function findSentinelEnd(value: string, start: number): number {
  // Sentinels terminate at whitespace, comma, slash, or end of string.
  // Format: \0<prefix>:<dot.path>:<fallback>; fallback may contain any
  // printable char except whitespace/comma/slash.
  let i = start + 1;
  const len = value.length;
  while (i < len) {
    const c = value.charCodeAt(i);
    if (isWhitespace(c) || c === $.COMMA || c === $.SLASH) break;
    i++;
  }
  return i;
}

function parseSentinel(raw: string): { path: string; fallback: string } | null {
  // raw is "\0<prefix>:<path>:<fallback>"
  // Path is prototype-pollution-guarded (rejects `__proto__`, `constructor`,
  // `prototype` segments) so a crafted template interpolation can't write
  // into shared object plumbing when the resolver walks the path.
  if (raw.length < 4) return null;
  const firstColon = raw.indexOf(':', 1);
  if (firstColon === -1) return null;
  const secondColon = raw.indexOf(':', firstColon + 1);
  const path =
    secondColon === -1 ? raw.substring(firstColon + 1) : raw.substring(firstColon + 1, secondColon);
  const fallback = secondColon === -1 ? '' : raw.substring(secondColon + 1);
  if (!isSafeThemePath(path)) return null;
  return { path, fallback };
}

/**
 * Tokenize function arguments on demand. Mutates {@link Token.argTokens}
 * so a second call is a no-op.
 */
export function tokenizeFunctionArgs(tok: Token): Token[] {
  if (tok.kind !== TokenKind.Function) return [];
  if (tok.argTokens) return tok.argTokens;
  tok.argTokens = tokenize(tok.args || '');
  return tok.argTokens;
}
