---
"styled-components": major
---

Plugins moved to a dedicated `styled-components/plugins` subpath, and a first-party RTL plugin ships with the library.

```tsx
import { StyleSheetManager } from 'styled-components';
import { rtlPlugin, rscPlugin } from 'styled-components/plugins';

<StyleSheetManager plugins={[rtlPlugin]}>
  <App />
</StyleSheetManager>
```

`rtlPlugin` replaces `stylis-plugin-rtl` for users coming from v6: it swaps physical side properties (`padding-left` ↔ `padding-right`), flips `left`/`right` keyword values on `float` / `clear` / `text-align` / `caption-side`, and mirrors 4-value shorthand positions. Logical properties like `margin-inline-start` pass through unchanged.

Migration:

```diff
-import { rtl, stylisPluginRSC } from 'styled-components';
+import { rtlPlugin, rscPlugin } from 'styled-components/plugins';

-<StyleSheetManager stylisPlugins={[rtl, stylisPluginRSC]}>
+<StyleSheetManager plugins={[rtlPlugin, rscPlugin]}>
```

Custom plugins authored against the v6 stylis contract need to port to the narrower plugin interface, which exposes `rw` (selector rewrite) and `decl` (declaration rewrite) hooks; implement either or both. Plugins are tree-shaken out of any app that doesn't import them.

```ts
import type { SCPlugin } from 'styled-components';

// `rw` runs on every fully-resolved selector after `&` substitution and
// namespace prepending. Return a new selector string.
const scopePlugin: SCPlugin = {
  name: 'scope',
  rw: selector => `.app ${selector}`,
};

// `decl` runs on every emitted `prop: value` pair (top-level decls, decl-body
// at-rules, keyframe frames). Return `{ prop, value }` to rewrite, or `void`
// to leave the pair unchanged.
const remToPxPlugin: SCPlugin = {
  name: 'rem-to-px',
  decl: (prop, value) => {
    const match = value.match(/^(-?\d*\.?\d+)rem$/);
    return match ? { prop, value: `${parseFloat(match[1]) * 16}px` } : undefined;
  },
};
```

The `name` field is required; it contributes to the class-name hash so plugin combinations don't collide across `<StyleSheetManager>` boundaries.
