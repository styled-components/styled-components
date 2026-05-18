---
'styled-components': minor
---

Performance improvements across the board in v7. Component creation, SSR `renderToString`, and React Server Components rendering are all faster than v6, with SSR seeing the largest gains at scale. Template-literal work is done up front when the styled component is defined, so each render pays less.
