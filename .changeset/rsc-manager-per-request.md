---
"styled-components": patch
---

Server components keep their `StyleSheetManager` settings when several requests render at the same time on one server. A server component that awaited data could lose settings such as `stylisPlugins` partway through its render, so `stylisPluginRSC` selectors like `:first-child` came out unrewritten at random under load.

A `StyleSheetManager` in server components that reuses the same `stylisPlugins` array no longer picks up the `namespace` or `enableVendorPrefixes` setting of another manager rendered before it.
