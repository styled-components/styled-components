---
'styled-components': major
---

Plugins moved to a dedicated `styled-components/plugins` subpath. First-party plugins ship there: `rtlPlugin`, `rscPlugin`, and `prefixPlugin`.

```tsx
import { StyleSheetManager } from 'styled-components';
import { prefixPlugin, rtlPlugin, rscPlugin } from 'styled-components/plugins';

<StyleSheetManager plugins={[rtlPlugin]}>
  <App />
</StyleSheetManager>;
```

`rtlPlugin` replaces `stylis-plugin-rtl` for users coming from v6: it swaps physical side properties (`padding-left` / `padding-right`), flips `left` / `right` keyword values on `float` / `clear` / `text-align` / `caption-side`, and mirrors 4-value shorthand positions. Logical properties like `margin-inline-start` pass through unchanged.

`prefixPlugin` is the opt-in replacement for v6 `enableVendorPrefixes`. It emits vendor-prefixed forms for CSS that still needs them at the React JS API browser floor (for example `appearance`, `backdrop-filter`, `user-select`, `::placeholder`). Flexbox, transforms, transitions, and animations pass through unprefixed. Importing only `rtlPlugin` does not pull `prefixPlugin` into the bundle.

The `stylisPlugins` prop on `<StyleSheetManager>` is now `plugins`, and the top-level `stylisPluginRSC` export has moved into the new subpath as `rscPlugin`.

Migration:

```diff
-import { rtl, stylisPluginRSC } from 'styled-components';
+import { rtlPlugin, rscPlugin } from 'styled-components/plugins';

-<StyleSheetManager stylisPlugins={[rtl, stylisPluginRSC]}>
+<StyleSheetManager plugins={[rtlPlugin, rscPlugin]}>
```

Custom plugins authored against the v6 stylis contract need to port to the narrower plugin interface, which exposes `rw` (selector rewrite) and `decl` (declaration rewrite) hooks; implement either or both. A hook may return one result or an array (one authored declaration or selector expands into several). Plugins are tree-shaken out of any app that doesn't import them.

```ts
import type { SCPlugin } from 'styled-components/plugins';

// `rw` runs on every fully-resolved selector after `&` substitution and
// namespace prepending. Return a new selector string, or an array of
// selectors to emit one rule per entry.
const scopePlugin: SCPlugin = {
  name: 'scope',
  rw: selector => `.app ${selector}`,
};

// `decl` runs on every emitted `prop: value` pair (top-level decls, decl-body
// at-rules, keyframe frames). Return `{ prop, value }` to rewrite, an array
// to expand one declaration into several, or `void` to leave the pair unchanged.
const remToPxPlugin: SCPlugin = {
  name: 'rem-to-px',
  decl: (prop, value) => {
    const match = value.match(/^(-?\d*\.?\d+)rem$/);
    return match ? { prop, value: `${parseFloat(match[1]) * 16}px` } : undefined;
  },
};
```

The `name` field is required and identifies the plugin so different plugin sets across nested `<StyleSheetManager>` trees stay isolated.
