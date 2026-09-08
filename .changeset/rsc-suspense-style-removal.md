---
"styled-components": patch
---

Fixed styles disappearing from a server-rendered component when it is revealed from behind a React `<Suspense>` boundary, such as a streaming Next.js route (including `cacheComponents`). A component shown first in a Suspense fallback and then in the resolved content kept its class name but lost its CSS, because the rule had been emitted only inside the fallback that React discards on reveal.

Each server-rendered instance now carries its own inline `<style>`, so its styles always travel with it and survive the boundary. Identical rules compress away under gzip, so the extra output is negligible; only a very large repeated list (thousands of instances of one component on a single page) is worth collapsing into a shared class, and a development-only warning points that out if it happens.
