---
'styled-components': patch
---

`.attrs()` is cheaper to type-check.

Two costs on the `.attrs` path are gone. Object-form `.attrs()` left the rendered target unchanged but still re-resolved that target's whole prop bag on every call, making `.attrs` on an HTML or SVG tag far costlier than on a wrapped component; it now reuses the props already resolved for the tag. Separately, making attrs-provided keys optional ran an avoidably expensive pass over the target's full prop set on every attrs component. Together these cut consumer type-check work measurably across every `.attrs` form, with no change to the resulting component's accepted props. Redirecting the target with `.attrs({ as })`, including the function form, is unaffected.
