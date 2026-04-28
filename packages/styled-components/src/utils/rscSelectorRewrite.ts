import { SC_ATTR } from '../constants';
import { splitTopLevelCommas } from '../parser/emit-web';
import * as $ from './charCodes';
import { isEscaped } from './cssCompile';

// RSC selector rewrites: child-index pseudos use Selectors L4 `of S` syntax,
// `+` combinators expand with style-tag-tolerant alternates. Both adapt for
// inline `<style data-styled>` tags appearing as real DOM children.

const CHILD_RE =
  /:(?:(first)-child|(last)-child|(only)-child|(nth-child)\(([^()]+)\)|(nth-last-child)\(([^()]+)\))/g;

const EXCLUDE = `:not(style[${SC_ATTR}])`;
const STYLE_TAG = `style[${SC_ATTR}]`;

function rewriteChildPseudos(selector: string): string {
  if (selector.indexOf('-child') === -1) return selector;
  CHILD_RE.lastIndex = 0;
  return selector.replace(
    CHILD_RE,
    (_match, first, last, only, nth, nthArgs, _nthLast, nthLastArgs) => {
      if (first) return `:nth-child(1 of ${EXCLUDE})`;
      if (last) return `:nth-last-child(1 of ${EXCLUDE})`;
      if (only) return `:nth-child(1 of ${EXCLUDE}):nth-last-child(1 of ${EXCLUDE})`;
      if (nth) {
        if (nthArgs.indexOf(' of ') !== -1) return _match;
        return `:nth-child(${nthArgs} of ${EXCLUDE})`;
      }
      if (nthLastArgs.indexOf(' of ') !== -1) return _match;
      return `:nth-last-child(${nthLastArgs} of ${EXCLUDE})`;
    }
  );
}

function expandAdjacentSibling(selector: string, out: string[]): void {
  if (selector.indexOf('+') === -1) return;
  let parenDepth = 0;
  let bracketDepth = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector.charCodeAt(i);
    if (ch === $.OPEN_PAREN) parenDepth++;
    else if (ch === $.CLOSE_PAREN) parenDepth--;
    else if (ch === $.OPEN_BRACKET) bracketDepth++;
    else if (ch === $.CLOSE_BRACKET) bracketDepth--;
    else if (ch === $.PLUS && parenDepth === 0 && bracketDepth === 0 && !isEscaped(selector, i)) {
      const before = selector.substring(0, i);
      const after = selector.substring(i + 1);
      out.push(before + '+' + STYLE_TAG + '+' + after);
      out.push(before + '+' + STYLE_TAG + '+' + STYLE_TAG + '+' + after);
    }
  }
}

/**
 * Apply child-pseudo rewrite and sibling-combinator expansion to every
 * comma-separated part of a resolved selector. Returns a single comma-joined
 * string suitable for CSS output.
 */
export function rewriteSelectorForRSC(selector: string): string {
  const parts = splitTopLevelCommas(selector);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const rewritten = rewriteChildPseudos(parts[i]);
    out.push(rewritten);
    expandAdjacentSibling(rewritten, out);
  }
  return out.join(',');
}
