# styled-components Sandbox

Local Next.js app for poking at the in-tree `styled-components` build. Wired to the workspace package via `workspace:*` against its `dist/` output - rebuild styled-components after a source change for the sandbox to pick it up.

```bash
pnpm --filter styled-components build   # after editing src/
pnpm --filter sandbox dev
```

Visit http://localhost:3000.

## Routes

- `/` - feature showcase
- `/client-example` - interactive client-side harness
- `/global-style-test` - `createGlobalStyle` mounting / unmounting cases
- `/rsc` - server-component rendering
- `/scenarios` - style-order scenario pages, most marking the computed value every probe element must have
- `/view-transitions` - view transition classes targeted from `createGlobalStyle`
- `/perf` - render-cost scratch pad
- `/perf/data-grid` - 2000-cell monitoring grid that patches ~400 cells every 100ms inside `startTransition` + `useDeferredValue`, with a sync filter and pause/resume

## Browser tests

```bash
pnpm --filter sandbox exec playwright install chromium webkit firefox   # once
pnpm --filter styled-components build                                   # the suite tests dist/
pnpm --filter sandbox test:browser
```

The suite builds and serves the sandbox on port 3016, then runs in Chromium, WebKit and Firefox. Scenario pages load hard with JavaScript on and off, soft from the index and from the previous scenario, and back. The in-page checks on `/rsc` and `/global-style-test` load hard and soft from `/`. A scenario's route and its flags live in `app/scenarios/routes.ts`.
