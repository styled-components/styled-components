# styled-components Sandbox

Local Next.js app for poking at the in-tree `styled-components` build. Wired to the workspace package via `workspace:*` against its `dist/` output — rebuild styled-components after a source change for the sandbox to pick it up.

```bash
pnpm --filter styled-components build   # after editing src/
pnpm --filter sandbox dev
```

Visit http://localhost:3000.

## Routes

- `/` — feature showcase
- `/client-example` — interactive client-side harness
- `/global-style-test` — `createGlobalStyle` mounting / unmounting cases
- `/rsc` — server-component rendering
- `/perf` — render-cost scratch pad
