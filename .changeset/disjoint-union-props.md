---
'styled-components': patch
---

Fix styled components silently dropping props declared as a union whose members share no keys, so `styled.div<{ a: string } | { b: number }>` rejected both `a` and `b`. The same collapse applied when `as` pointed at a component with such props. A union whose members are all-optional is still flattened; declare the combined optional shape instead.
