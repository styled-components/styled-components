import { rewriteSelectorForRSC } from './rscSelectorRewrite';

/**
 * RSC plugin: rewrites `:nth-child()` and `+` combinators so inline
 * `<style data-styled>` tags don't break child-index selectors. Requires
 * CSS Selectors Level 4 `of S` syntax.
 *
 * ```jsx
 * import { StyleSheetManager } from 'styled-components';
 * import { rscPlugin } from 'styled-components/plugins';
 *
 * <StyleSheetManager plugins={[rscPlugin]}>...</StyleSheetManager>
 * ```
 */
const rscPlugin: { name: string; rw: (selector: string) => string } = {
  name: 'rsc',
  rw: rewriteSelectorForRSC,
};

export default rscPlugin;
