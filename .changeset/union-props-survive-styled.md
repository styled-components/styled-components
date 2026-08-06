---
'styled-components': patch
---

Fix wrapping a component whose props are a union. Since 6.5.0 the wrapped version accepted only the props common to every member of the union, so a prop belonging to just one member was rejected even though the unwrapped component accepted it.
