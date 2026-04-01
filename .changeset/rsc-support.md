---
'styled-components': minor
---

React Server Components support: inline style injection, deduplication, and a new `stylisPluginRSC` for child-index selector fixes.

**Inline style injection:** RSC-rendered styled components emit `<style data-styled>` tags alongside their elements. CSS is deduplicated per render via `React.cache` (React 19+). Extended components use `:where()` zero-specificity wrapping on base CSS so extensions always win the cascade regardless of injection order.

**`StyleSheetManager` works in RSC:** `stylisPlugins` and `shouldForwardProp` are now applied in server component environments where React context is unavailable.

**`stylisPluginRSC`** — opt-in stylis plugin that fixes `:first-child`, `:last-child`, `:nth-child()`, and `:nth-last-child()` selectors broken by inline `<style>` tags shifting child indices. Rewrites them using CSS Selectors Level 4 `of S` syntax to exclude styled-components style tags from the count.

```jsx
import { StyleSheetManager, stylisPluginRSC } from 'styled-components';

<StyleSheetManager stylisPlugins={[stylisPluginRSC]}>
  {children}
</StyleSheetManager>
```

The plugin rewrites `:first-child`, `:last-child`, `:nth-child()`, and `:nth-last-child()` using CSS Selectors Level 4 `of S` syntax to exclude injected style tags from the child count.

Browser support: Chrome 111+, Firefox 113+, Safari 9+ (~93% global). In unsupported browsers, the entire CSS rule is dropped — only opt in if your audience supports it. Use `:first-of-type` / `:nth-of-type()` as a universally compatible alternative.

**HMR:** Stale styles during client-side HMR are detected and invalidated when module re-evaluation creates new component instances while IDs remain stable (SWC plugin assigns IDs by file location). `createGlobalStyle` additionally clears stale sheet entries when the instance changes between renders.

The plugin is fully tree-shakeable — zero bytes in bundles that don't import it.
