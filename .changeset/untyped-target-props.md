---
'styled-components': patch
---

Fix wrapping a component whose props cannot be inspected statically, such as the polymorphic factory components Mantine ships. Every prop was rejected, `children` included. Declaring props of your own on the wrapper no longer switches the behavior back off either.
