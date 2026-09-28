import { isEscaped, removeComments } from '../parser/reader';
import {
  ASTERISK,
  CLOSE_BRACE,
  DOUBLE_QUOTE,
  LF,
  OPEN_BRACE,
  SEMICOLON,
  SINGLE_QUOTE,
  SLASH,
} from './charCodes';

/**
 * Remove comments (template reading: `/* *\/` and `//` line comments) and
 * validate brace balance. `sanitize: false` removes comments only, leaving
 * unbalanced braces for a later pass.
 */
export function normalize(css: string, sanitize = true): string {
  const text = removeComments(css, true);
  return sanitize && text.indexOf('}') !== -1 ? sanitizeBraces(text) : text;
}

function sanitizeBraces(css: string): string {
  const len = css.length;
  // Optimistic: stay in pure-scan mode (no result allocation) until the first
  // event that demands rewriting (a comment to strip, or a brace imbalance).
  // Balanced comment-free input is the dominant production case from
  // `normalize`; it hits the early-return at the bottom and pays only
  // one O(n) charCode walk with zero substring or concat work.
  let result = '';
  let resultActive = false;
  let declStart = 0;
  let braceDepth = 0;
  let inString = 0;
  let inComment = false;
  let imbalanced = false;

  for (let i = 0; i < len; i++) {
    const code = css.charCodeAt(i);

    if (inString === 0 && !inComment && code === SLASH && css.charCodeAt(i + 1) === ASTERISK) {
      if (resultActive) {
        result += css.substring(declStart, i);
      } else {
        // First comment: capture everything up to it in one substring rather
        // than `css.substring(0, declStart) + css.substring(declStart, i)`.
        result = css.substring(0, i);
        resultActive = true;
      }
      inComment = true;
      i++;
      continue;
    }
    if (inComment) {
      if (code === ASTERISK && css.charCodeAt(i + 1) === SLASH) {
        inComment = false;
        i++;
        declStart = i + 1; // start collecting from AFTER the */
      }
      continue;
    }

    if ((code === DOUBLE_QUOTE || code === SINGLE_QUOTE) && !isEscaped(css, i)) {
      if (inString === 0) {
        inString = code;
      } else if (inString === code) {
        inString = 0;
      }
      continue;
    }
    if (inString !== 0) continue;

    if (code === OPEN_BRACE) {
      braceDepth++;
    } else if (code === CLOSE_BRACE) {
      braceDepth--;

      if (braceDepth < 0) {
        if (!resultActive) {
          result = css.substring(0, declStart);
          resultActive = true;
        }
        imbalanced = true;
        let skipEnd = i + 1;
        while (skipEnd < len) {
          const skipCode = css.charCodeAt(skipEnd);
          if (skipCode === SEMICOLON || skipCode === LF) break;
          skipEnd++;
        }
        if (skipEnd < len && css.charCodeAt(skipEnd) === SEMICOLON) skipEnd++;

        braceDepth = 0;
        i = skipEnd - 1;
        declStart = skipEnd;
        continue;
      }

      if (braceDepth === 0) {
        if (resultActive) result += css.substring(declStart, i + 1);
        declStart = i + 1;
      }
    } else if (code === SEMICOLON && braceDepth === 0) {
      if (resultActive) result += css.substring(declStart, i + 1);
      declStart = i + 1;
    }
  }

  if (!imbalanced && braceDepth === 0 && inString === 0) return css;

  // Imbalance OR braceDepth ended non-zero OR unclosed string. If we never
  // activated the result builder (e.g. a stray opening brace with no matching
  // close), backfill the good prefix now so we drop the unclosed tail.
  if (!resultActive) result = css.substring(0, declStart);

  if (declStart < len && braceDepth === 0 && inString === 0) {
    result += css.substring(declStart);
  }

  return result;
}
