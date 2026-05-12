---
'styled-components': minor
---

CSS system color keywords (`Canvas`, `CanvasText`, `Field`, `FieldText`, `GrayText`, `Highlight`, `HighlightText`, `LinkText`, `VisitedText`, `ActiveText`) now resolve correctly on React Native. Each keyword folds to a `light-dark()` expression carrying sensible per-mode literals, so `color: Canvas` produces white text on dark backgrounds and black text on light backgrounds without authors having to write the conditional themselves. The browser still resolves the keyword natively on the web build.

Matches case-insensitively per CSS syntax. Composite uses where the keyword sits inside a larger value (e.g. `border: 1px solid Canvas`) aren't covered in this release; set the keyword on the standalone color longhand for the same result.
