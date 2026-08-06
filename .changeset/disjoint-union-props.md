---
'styled-components': patch
---

Fix a styled component silently dropping props declared as a union whose members have no prop in common, which left every one of those props rejected. The same applied when `as` pointed at a component with such props. Where every member's props are optional the union is still flattened, so declare the combined optional shape instead.
