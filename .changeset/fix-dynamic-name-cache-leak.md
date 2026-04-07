---
'styled-components': patch
---

Fix memory leak in long-running apps using components with free-form string interpolations (e.g. `color: ${p => p.$dynamicValue}` where the value comes from unbounded user input).
