---
'styled-components': minor
---

Cut the TypeScript cost of using styled components in an app. A render target's props are resolved once per target instead of once per JSX call site, which is where most of the work was going. Against a fixture of 100 styled components the type count drops to roughly a sixth and peak memory to roughly a quarter, putting v7 slightly under v6 on both rather than well above it. `pnpm --filter styled-components type-perf` prints the current figures and CI holds them to a budget.
