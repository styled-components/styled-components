import { rewriteSelectorForRSC } from './rscSelectorRewrite';

/**
 * Opt-in marker for StyleSheetManager that enables RSC-safe selector
 * rewriting. Pass via `<StyleSheetManager plugins={[rscPlugin]}>`.
 *
 * As of v7, styled-components no longer runs stylis at runtime; the in-house
 * parser handles all CSS emission. This export attaches the rewrite function
 * to the plugin object itself so bundlers tree-shake the rewrite logic out
 * of builds that don't import the plugin.
 *
 * Rewrites:
 *
 * 1. Child-index pseudo-selectors (:first-child, :nth-child, etc.) are
 *    rewritten using CSS Selectors Level 4 `of S` syntax to exclude
 *    style tags from the child count.
 *
 * 2. Adjacent sibling combinators (`+`) are expanded with fallback selectors
 *    that match when 1 or 2 `<style data-styled>` tags are interleaved
 *    between siblings.
 *
 * ```jsx
 * import { StyleSheetManager } from 'styled-components';
 * import { rscPlugin } from 'styled-components/plugins';
 *
 * <StyleSheetManager plugins={[rscPlugin]}>
 *   ...
 * </StyleSheetManager>
 * ```
 *
 * Requires browser support for CSS Selectors Level 4 `of S` syntax
 * (Chrome 111+, Firefox 113+, Safari 9+).
 */
const rscPlugin: { name: string; rw: (selector: string) => string } = {
  name: 'rsc',
  rw: rewriteSelectorForRSC,
};

export default rscPlugin;
