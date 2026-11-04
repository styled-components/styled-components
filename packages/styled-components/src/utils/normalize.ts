import {
  ASTERISK,
  BACKSLASH,
  CLOSE_PAREN,
  COLON,
  DOUBLE_QUOTE,
  isWS,
  OPEN_PAREN,
  SINGLE_QUOTE,
  SLASH,
  SPACE,
  TAB,
  urlTokenEnd,
} from './charCodes';

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
  /** Last char appended to `out`; reading `out` itself would flatten the concat rope per comment. */
  let lastOutCh = 0;

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
      const urlEnd = urlTokenEnd(css, i, len, escape);
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

    if (code !== SLASH && code !== ASTERISK) {
      i++;
      continue;
    }

    const next = css.charCodeAt(i + 1);
    const isBlockComment = code === SLASH && next === ASTERISK;
    if (!isBlockComment && (parenDepth > 0 || next !== SLASH)) {
      i++;
      continue;
    }

    let end = i + 2;
    if (isBlockComment) {
      end = css.indexOf('*/', end);
      end = end === -1 ? len : end + 2;
    } else if (code === SLASH) {
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
      const nextIsWS = isWS(css.charCodeAt(i));
      // When the comment is bordered by whitespace on both sides, collapse the
      // pair to a single space so selector templates with annotative comments
      // (`a /* foo */ b`) hash consistently.
      if (isWS(lastOutCh)) {
        if (nextIsWS) while (isWS(css.charCodeAt(i))) i++;
      } else if (parenDepth > 0 && !nextIsWS) {
        // A comment ends the token before it, so `rgb(0/**/51)` holds two numbers.
        out += ' ';
        lastOutCh = SPACE;
      }
    }
    start = i;
  }

  return out + css.substring(start);
}
