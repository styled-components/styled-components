import { SC_ATTR } from '../constants';
import { isEscaped } from './cssCompile';

/**
 * RSC-specific CSS selector rewrites. Inline `<style data-styled>` tags
 * appear as real DOM children in RSC output, which breaks:
 *
 * 1. Child-index pseudo-selectors (:first-child, :nth-child(...)) — rewritten
 *    using CSS Selectors Level 4 `of S` syntax to exclude style tags.
 * 2. Adjacent-sibling combinators (+) — expanded with fallback alternates
 *    matching when 1–2 interleaved style tags sit between siblings.
 *
 * Used as `postProcessSelector` in emit-web when the StyleSheetManager
 * is operating in RSC mode.
 */

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
    if (ch === 40 /* ( */) parenDepth++;
    else if (ch === 41 /* ) */) parenDepth--;
    else if (ch === 91 /* [ */) bracketDepth++;
    else if (ch === 93 /* ] */) bracketDepth--;
    else if (
      ch === 43 /* + */ &&
      parenDepth === 0 &&
      bracketDepth === 0 &&
      !isEscaped(selector, i)
    ) {
      const before = selector.substring(0, i);
      const after = selector.substring(i + 1);
      out.push(before + '+' + STYLE_TAG + '+' + after);
      out.push(before + '+' + STYLE_TAG + '+' + STYLE_TAG + '+' + after);
    }
  }
}

/**
 * Split a comma-separated selector list, respecting `,` inside parens/brackets/strings.
 */
function splitTopLevelCommas(selector: string): string[] {
  if (selector.indexOf(',') === -1) return [selector];
  const out: string[] = [];
  const len = selector.length;
  let start = 0;
  let paren = 0;
  let bracket = 0;
  let quote = 0;
  for (let i = 0; i < len; i++) {
    const c = selector.charCodeAt(i);
    if (quote !== 0) {
      if (c === 92) {
        i++;
        continue;
      }
      if (c === quote) quote = 0;
    } else if (c === 34 || c === 39) {
      quote = c;
    } else if (c === 40) paren++;
    else if (c === 41) {
      if (paren > 0) paren--;
    } else if (c === 91) bracket++;
    else if (c === 93) {
      if (bracket > 0) bracket--;
    } else if (c === 44 && paren === 0 && bracket === 0) {
      out.push(selector.substring(start, i));
      start = i + 1;
    }
  }
  out.push(selector.substring(start));
  return out;
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
