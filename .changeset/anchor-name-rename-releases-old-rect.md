---
'styled-components': patch
---

Renaming `anchor-name` on React Native releases the old anchor.

The old name's rect stayed in the registry until the element unmounted, so `anchor()` and `anchor-size()` consumers resolving it kept reading a position nothing updated. The rect is now released when the name changes, as documented.
