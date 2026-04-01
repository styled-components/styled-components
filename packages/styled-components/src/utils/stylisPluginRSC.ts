import { RULESET, type Middleware } from 'stylis';
import { SC_ATTR } from '../constants';

/**
 * Rewrites :first-child, :last-child, :nth-child(), and :nth-last-child()
 * to exclude styled-components' own `<style data-styled>` tags from the
 * child count, preventing inline style injection (RSC/SSR) from disrupting
 * child-index pseudo-selectors.
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
// Single pass: matches :first-child, :last-child, :only-child, :nth-child(...), :nth-last-child(...)
const CHILD_RE =
  /:(?:(first)-child|(last)-child|(only)-child|(nth-child)\(([^()]+)\)|(nth-last-child)\(([^()]+)\))/g;

const EXCLUDE = `:not(style[${SC_ATTR}])`;

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
      // nthLast
      if (nthLastArgs.indexOf(' of ') !== -1) return _match;
      return `:nth-last-child(${nthLastArgs} of ${EXCLUDE})`;
    }
  );
}

function stylisPluginRSC(element: Parameters<Middleware>[0]) {
  if (element.type === RULESET) {
    // New array — stylis caches AST objects, in-place mutation corrupts the cache
    const props = element.props as string[];
    const newProps: string[] = [];
    for (let i = 0; i < props.length; i++) {
      newProps[i] = rewriteSelector(props[i]);
    }
    element.props = newProps;
  }
}

// Minifiers mangle function names; stylis hash needs a stable .name for cache keying
/*#__PURE__*/ Object.defineProperty(stylisPluginRSC, 'name', { value: 'stylisPluginRSC' });

export default stylisPluginRSC;
