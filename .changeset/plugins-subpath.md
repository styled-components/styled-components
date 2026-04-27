---
"styled-components": major
---

Plugins moved to a dedicated `styled-components/plugins` subpath, and the first-party RTL plugin ships with the library.

```tsx
import { StyleSheetManager } from 'styled-components';
import { rtl, stylisPluginRSC } from 'styled-components/plugins';

<StyleSheetManager stylisPlugins={[rtl]}>
  <App />
</StyleSheetManager>
```

The `rtl` plugin replaces `stylis-plugin-rtl` for users coming from v6: it swaps physical side properties (`padding-left` → `padding-right`, etc.), flips `left`/`right` keyword values on `float`/`clear`/`text-align`/`caption-side`, and mirrors 4-value shorthand positions (`padding: 1px 2px 3px 4px` → `padding: 1px 4px 3px 2px`). Logical properties like `margin-inline-start` are passed through unchanged.

Migration: if you previously imported `stylisPluginRSC` from `styled-components`, update the import to `styled-components/plugins`. The previous stylis plugin contract (full declaration-transform access) is replaced by a narrower `SCPlugin` interface exposing `rw` (selector rewrite) and `decl` (declaration rewrite) hooks — port custom plugins by implementing either or both. Plugins are tree-shaken out of any app that doesn't import them.
