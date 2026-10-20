---
'styled-components': patch
---

Development builds warn when two different plugins used with `<StyleSheetManager>` share a `name`. The message names the shared name and tells you to give each plugin its own name.

Plugins that share a name produce the same class, on the client, in server rendering, and in server components. The first subtree to render supplies the CSS for every subtree using that name. Production builds do not emit this warning.
