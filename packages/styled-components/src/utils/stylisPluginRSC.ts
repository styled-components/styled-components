import { RULESET, type Middleware } from 'stylis';
import { SC_ATTR } from '../constants';
import { isEscaped } from './stylis';

/**
 * Rewrites CSS selectors that break when styled-components' inline
 * `<style data-styled>` tags appear in the DOM (RSC/SSR):
 *
 * 1. Child-index pseudo-selectors (:first-child, :nth-child, etc.) are
 *    rewritten using CSS Selectors Level 4 `of S` syntax to exclude
 *    style tags from the child count. This is a precise, spec-level fix.
 *
 * 2. Adjacent sibling combinators (+) are expanded with fallback selectors
 *    that match when 1 or 2 `<style data-styled>` tags are interleaved
 *    between siblings. The RSC render path emits Fragment[kfStyle?, compStyle?,
 *    element] per component, so a component's style tags always precede its own
 *    element — the maximum between any two elements is 2 (the next component's
 *    keyframe + component CSS). Known limitations:
 *    - `+` inside pseudo-functions (:is(), :has(), :where(), :not()) is not
 *      expanded. Prefer :first-of-type/:nth-of-type or ~ (general sibling).
 *    - Each `+` adds 2 fallback selectors, increasing CSS output size.
 *
 * ```jsx
 * import { StyleSheetManager, stylisPluginRSC } from 'styled-components';
 *
 * <StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
 *   ...
 * </StyleSheetManager>
 * ```
 *
 * Requires browser support for CSS Selectors Level 4 `of S` syntax
 * (Chrome 111+, Firefox 113+, Safari 9+).
 */
const CHILD_RE =
  /:(?:(first)-child|(last)-child|(only)-child|(nth-child)\(([^()]+)\)|(nth-last-child)\(([^()]+)\))/g;

const EXCLUDE = `:not(style[${SC_ATTR}])`;
const STYLE_TAG = `style[${SC_ATTR}]`;

function rewriteSelector(selector: string): string {
  if (selector.indexOf('-child') === -1) return selector;

  CHILD_RE.lastIndex = 0;
  return selector.replace(
    CHILD_RE,
    (_match, first, last, only, nth, nthArgs, nthLast, nthLastArgs) => {
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

/**
 * Expand each `+` combinator to also match when 1 or 2 `<style data-styled>`
 * tags are interleaved. Skips `+` inside parentheses, brackets, and after
 * backslash escapes. Pushes expanded selectors directly to `out`.
 *
 * `A+B` → `A+style[data-styled]+B` + `A+style[data-styled]+style[data-styled]+B`
 */
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

function stylisPluginRSC(element: Parameters<Middleware>[0]) {
  if (element.type === RULESET) {
    // New array — stylis caches AST objects, in-place mutation corrupts the cache
    const props = element.props as string[];
    const newProps: string[] = [];
    for (let i = 0; i < props.length; i++) {
      const rewritten = rewriteSelector(props[i]);
      newProps.push(rewritten);
      expandAdjacentSibling(rewritten, newProps);
    }
    element.props = newProps;
  }
}

// Minifiers mangle function names; stylis hash needs a stable .name for cache keying
/*#__PURE__*/ Object.defineProperty(stylisPluginRSC, 'name', { value: 'stylisPluginRSC' });

export default stylisPluginRSC;
