---
"styled-components": patch
---

Fix a TypeScript error when wrapping a component whose props can't be statically read, such as Mantine v7's polymorphic-factory components (`Button`, `Card`, `Menu.Item`, and similar). These styled components no longer reject every prop, including `children`; arbitrary props are accepted again at the JSX call site and via `.attrs()`, while components with readable prop types stay fully type-checked.
