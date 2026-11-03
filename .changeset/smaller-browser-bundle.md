---
'styled-components': patch
---

The browser bundle is about 1 kB smaller gzipped, with the same styling behavior.

Internal fields of the stylesheet and style objects have been removed from the published type declarations. None of them were documented or usable from app code.

In object styles, a numeric value whose key is a built-in object name such as `constructor` gets `px` like any other unknown property. No CSS property has such a name.
