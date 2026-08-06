---
'styled-components': patch
---

Fix wrapping a component whose props are a union. The wrapped version accepted only the props common to every member, so a prop belonging to just one member was rejected even though the unwrapped component accepts it. The same applied when `as` pointed at such a component.
