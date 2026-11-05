---
'styled-components': patch
---

A `StyleSheetManager` in a server component honors `namespace` and `enableVendorPrefixes` when they are passed together with `stylisPlugins={[]}`, matching client components. These options were dropped without an error, so styles lost their namespace.
