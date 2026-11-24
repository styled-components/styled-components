import {
  ASTERISK,
  AT,
  BACKSLASH,
  CLOSE_PAREN,
  COLON,
  DIGIT_0,
  DIGIT_9,
  DOT,
  DOUBLE_QUOTE,
  HASH,
  HYPHEN,
  isIdentChar,
  isSpace,
  LOWER_L,
  NUL,
  OPEN_PAREN,
  PERCENT,
  PLUS,
  SINGLE_QUOTE,
  SLASH,
  SPACE,
  TAB,
  UPPER_TO_LOWER,
  urlTokenEnd,
} from './charCodes';

function isTokenChar(c: number, allowNul = false): boolean {
  return isIdentChar(c) || c >= 0x80 || c === BACKSLASH || (allowNul && c === NUL);
}

/**
 * Check if a quote at position i is escaped. A quote is escaped when preceded
 * by an ODD number of backslashes (\", \\\", etc.). An even number means the
 * backslashes themselves are escaped and the quote is real (\\", \\\\", etc.).
 */
export function isEscaped(css: string, i: number): boolean {
  let backslashes = 0;
  while (--i >= 0 && css.charCodeAt(i) === BACKSLASH) backslashes++;
  return (backslashes & 1) === 1;
}

/**
 * True when the nearest non-blank character before `i` on the same line is `:`,
 * so a `//` at `i` starts a value (`--cdn: //cdn.example.com/x.png`) rather than
 * a line comment. A `//` on a later line than the colon stays a comment.
 */
function isPrecededByColon(css: string, i: number): boolean {
  while (--i >= 0) {
    const code = css.charCodeAt(i);
    if (code !== SPACE && code !== TAB) return code === COLON;
  }

  return false;
}

/**
 * Strip JS-style line comments and CSS block comments in one pass; the parser
 * never sees a comment. A `//` inside parens stays, since it is usually part of
 * a value. Brace repair (a stray `}`, an unclosed block or string) is the
 * parser's job at its root block, so comment-free input returns as is.
 */
export function normalize(css: string): string {
  if (css.indexOf('//') === -1 && css.indexOf('/*') === -1) return css;

  const len = css.length;
  let out = '';
  let start = 0;
  let i = 0;
  let inString = 0;
  let parenDepth = 0;
  let escape = -1;
  /** Last char appended to `out`; -1 before any output (distinct from `NUL = 0`). */
  let lastOutCh = -1;

  while (i < len) {
    const code = css.charCodeAt(i);

    if (code === BACKSLASH) {
      escape = i;
      i += 2;
      continue;
    }

    if (code === DOUBLE_QUOTE || code === SINGLE_QUOTE) {
      if (inString === 0) {
        inString = code;
      } else if (inString === code) {
        inString = 0;
      }
      i++;
      continue;
    }

    if (inString !== 0) {
      i++;
      continue;
    }

    if (code === OPEN_PAREN) {
      // Same guard as `scanQPB`: only an escape or a trailing `l` can make this a url token.
      const urlEnd =
        escape === -1 && (css.charCodeAt(i - 1) | UPPER_TO_LOWER) !== LOWER_L
          ? -1
          : urlTokenEnd(css, i, len, escape);
      if (urlEnd === -1) parenDepth++;
      else i = urlEnd;
      i++;
      continue;
    }

    if (code === CLOSE_PAREN) {
      if (parenDepth > 0) parenDepth--;
      i++;
      continue;
    }

    if (code !== SLASH) {
      i++;
      continue;
    }

    const next = css.charCodeAt(i + 1);
    const isBlockComment = next === ASTERISK;
    if (!isBlockComment && (parenDepth > 0 || next !== SLASH)) {
      i++;
      continue;
    }

    let end = i + 2;
    if (isBlockComment) {
      end = css.indexOf('*/', end);
      end = end === -1 ? len : end + 2;
    } else {
      // URL guard: `https://` and a protocol-relative `: //host` value are NOT
      // line comments. A `:` before the `//` (past any whitespace) means the
      // sequence belongs to a value, so skip the line-comment strip.
      if (isPrecededByColon(css, i)) {
        i = end;
        continue;
      }
      end = css.indexOf('\n', i);
      if (end === -1) end = len;
    }

    if (i > start) {
      out += css.substring(start, i);
      lastOutCh = css.charCodeAt(i - 1);
    }
    i = end;

    if (isBlockComment) {
      const nextCh = css.charCodeAt(i);
      const nextIsSpace = isSpace(nextCh);
      // When the comment is bordered by whitespace on both sides, collapse the
      // pair to a single space so selector templates with annotative comments
      // (`a /* foo */ b`) hash consistently.
      if (isSpace(lastOutCh)) {
        if (nextIsSpace) while (isSpace(css.charCodeAt(i))) i++;
      } else if (i < len && !nextIsSpace) {
        const allowNul = parenDepth > 0;
        const nextIsDigit = nextCh >= DIGIT_0 && nextCh <= DIGIT_9;
        const nextIsDotDigit =
          nextCh === DOT && css.charCodeAt(i + 1) >= DIGIT_0 && css.charCodeAt(i + 1) <= DIGIT_9;
        if (
          (isTokenChar(lastOutCh, allowNul) &&
            (isTokenChar(nextCh, allowNul) || nextCh === OPEN_PAREN)) ||
          (lastOutCh === SLASH && nextCh === ASTERISK) ||
          ((lastOutCh === HASH || lastOutCh === AT) && isTokenChar(nextCh, allowNul)) ||
          (lastOutCh === DOT && nextIsDigit) ||
          (lastOutCh === PLUS && (nextIsDigit || nextIsDotDigit)) ||
          (lastOutCh === HYPHEN && nextIsDotDigit) ||
          (lastOutCh >= DIGIT_0 && lastOutCh <= DIGIT_9 && (nextCh === PERCENT || nextIsDotDigit))
        ) {
          // A comment ends the token before it, so adjacent tokens cannot merge.
          out += ' ';
          lastOutCh = SPACE;
        }
      }
    }
    start = i;
  }

  return out + css.substring(start);
}
