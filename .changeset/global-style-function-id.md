---
"styled-components": patch
---

Each `createGlobalStyle` whose rules contain a function gets its own stylesheet, so both styles apply. That includes a global style whose body is only a function, which is how a CSS reset and a color-mode style are often written together (for example xstyled's Preflight and ColorModeProvider).

Two calls that pass the same static CSS text share one stylesheet. Mounting one component more than once inserts a copy for each mounted instance.

Server-rendered HTML for these styles hydrates when the calls run in the same order on the server and the client. That order is also the cascade order: the later call paints on top. A global style whose static text is not shared with another call hydrates regardless of that order.
