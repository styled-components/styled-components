---
"styled-components": major
---

Renamed plugin-related public API to drop the "stylis" branding now that v7 doesn't run stylis at runtime.

- `<StyleSheetManager stylisPlugins={[…]}>` is now `<StyleSheetManager plugins={[…]}>`
- The first-party plugins from `styled-components/plugins` were renamed:
  - `rtl` → `rtlPlugin`
  - `stylisPluginRSC` → `rscPlugin`

Migration:

```diff
-import { rtl, stylisPluginRSC } from 'styled-components/plugins';
+import { rtlPlugin, rscPlugin } from 'styled-components/plugins';

-<StyleSheetManager stylisPlugins={[rtl, stylisPluginRSC]}>
+<StyleSheetManager plugins={[rtlPlugin, rscPlugin]}>
```
