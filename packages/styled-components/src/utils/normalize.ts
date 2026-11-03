import { skipParenComment } from '../parser/parser';
import {
  ASTERISK,
  BACKSLASH,
  CLOSE_PAREN,
  COLON,
  DOUBLE_QUOTE,
  isWS,
  LF,
  OPEN_PAREN,
  SINGLE_QUOTE,
  SLASH,
  SPACE,
  TAB,
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
 * Strip JS-style line comments and CSS block comments in one pass. Brace
 * repair (a stray `}`, an unclosed block or string) is the parser's job at
 * its root block, so comment-free input returns as is.
 */
export function normalize(css: string): string {
  if (css.indexOf('//') === -1 && css.indexOf('/*') === -1) return css;

  const len = css.length;
  let out = '';
  let start = 0;
  let i = 0;
  let inString = 0;
  let parenDepth = 0;
  /** Last char appended to `out`; reading `out` itself would flatten the concat rope per comment. */
  let lastOutCh = 0;

  while (i < len) {
    const code = css.charCodeAt(i);

    if ((code === DOUBLE_QUOTE || code === SINGLE_QUOTE) && !isEscaped(css, i)) {
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
      parenDepth++;
      i++;
      continue;
    }

    if (code === CLOSE_PAREN) {
      if (parenDepth > 0) parenDepth--;
      i++;
      continue;
    }

    // Inside parentheses (any function call), skip comment detection so that
    // url(https://...), image-set(), url(.../*.png), etc. are preserved
    if (parenDepth > 0) {
      i =
        code === SLASH && css.charCodeAt(i + 1) === ASTERISK
          ? skipParenComment(css, i, len)
          : i + 1;
      continue;
    }

    if (code === SLASH && i + 1 < len && css.charCodeAt(i + 1) === ASTERISK) {
      // Emit everything up to the comment, then skip the comment entirely.
      if (i > start) {
        out += css.substring(start, i);
        lastOutCh = css.charCodeAt(i - 1);
      }
      i += 2;
      while (i + 1 < len && !(css.charCodeAt(i) === ASTERISK && css.charCodeAt(i + 1) === SLASH)) {
        i++;
      }
      i += 2;
      // When the comment is bordered by whitespace on both sides, collapse the
      // pair to a single space so selector templates with annotative comments
      // (`a /* foo */ b`) hash consistently.
      if (isWS(lastOutCh) && i < len && isWS(css.charCodeAt(i))) {
        while (i < len && isWS(css.charCodeAt(i))) i++;
      }
      start = i;
      continue;
    }

    if (code === ASTERISK && i + 1 < len && css.charCodeAt(i + 1) === SLASH) {
      if (i > start) {
        out += css.substring(start, i);
        lastOutCh = css.charCodeAt(i - 1);
      }
      i += 2;
      start = i;
      continue;
    }

    if (code === SLASH && i + 1 < len && css.charCodeAt(i + 1) === SLASH) {
      // URL guard: `https://` and a protocol-relative `: //host` value are NOT
      // line comments. A `:` before the `//` (past any whitespace) means the
      // sequence belongs to a value, so skip the line-comment strip.
      if (isPrecededByColon(css, i)) {
        i += 2;
        continue;
      }
      if (i > start) {
        out += css.substring(start, i);
        lastOutCh = css.charCodeAt(i - 1);
      }
      while (i < len && css.charCodeAt(i) !== LF) {
        i++;
      }
      start = i;
      continue;
    }

    i++;
  }

  if (start === 0) return css;
  if (start < len) out += css.substring(start);
  return out;
}
