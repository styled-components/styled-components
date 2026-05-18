---
'styled-components': minor
---

`styled.ScrollView` now defaults to `flex-shrink: 0`, matching the behavior of `styled.View`. Previously, an explicit `width:` or `height:` declaration on a `ScrollView` could be silently overridden by the layout engine when the component sat in a flex parent, so the rendered dimension came out smaller (or larger) than declared. The fix makes explicit dimensions pin reliably; you can still opt back into the old behavior by declaring `flex-shrink: 1` in your own template.
