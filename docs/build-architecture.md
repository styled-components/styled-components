# Build Architecture

How the package is built, which environment flags exist, and how CSS injection order is decided.

## Environment flags

Three separate mechanisms answer "are we on a server", and they are not interchangeable.

`__SERVER__` is a build-time constant. Rollup replaces it per bundle, so a branch behind it is
eliminated entirely from the browser build. It is the right gate for dead-code elimination and the
wrong gate for anything needing paired cleanup: Jest resolves the server build through the `main`
field in jsdom, where `__SERVER__` is `true`, so a `useLayoutEffect` gated on it is eliminated while
the DOM mutations it was meant to clean up still happen. Gate cleanup on `styleSheet.server` or
`IS_RSC` instead.

`IS_RSC` is `typeof React.createContext === 'undefined'`, evaluated once at module level. React 19's
`react-server` export condition serves a build stripped of `createContext`, so `IS_RSC` is `true` at
runtime inside server components; bundlers such as Next.js and Turbopack select that condition
automatically. In browser, standalone and native builds rollup replaces the expression with `false`
for dead-code elimination. Because it is module-level rather than per-render, gating a hook behind it
does not violate the rules of hooks.

`styleSheet.server` is a runtime flag set by `ServerStyleSheet`. It lets a sheet forced into server
mode collect styles synchronously in a build where `__SERVER__` is false (#3551). It does not make
the browser build work on a server: that build's tags are always DOM tags, so a server render there
fails at the first `<style>` creation (see "Edge runtime").

Combine all three (`__SERVER__ || IS_RSC || ssc.styleSheet.server`) with one deliberate exception:
`createGlobalStyle`'s server-cache cleanup drops the `IS_RSC` term, because the `IS_RSC` branch above
it has already handled the render and returned, so reaching that line under RSC means there was
nothing left to clean.

`IS_BROWSER` is `typeof window !== 'undefined' && typeof document !== 'undefined'`. Both halves are
needed: a non-browser host can define `window` without a DOM. It is a runtime check, so bundlers
cannot tree-shake code behind it and it never substitutes for `__SERVER__`.

`React.useRef` is `undefined` in RSC server components. Gate it behind `__SERVER__` so the call is
eliminated; never write `typeof React.useRef === 'function'`, which is a runtime conditional hook.

## Native entry isolation

The native entry must never transitively import DOM code through a value import. Use `import type`,
and branded `Symbol.for()` checks in place of `instanceof`. React Native on Hermes 0.79+ fails at
module evaluation time on a bare `document` reference, so the failure is a hard crash rather than a
degraded path.

Verify with `grep -c 'document\.' native/dist/styled-components.native.cjs.js`, which must report 0.

## Module resolution

The `browser` field in `package.json` maps server bundles to their browser-specific alternatives.
There is no `exports` map. The 6.3.7 attempt was reverted for TS2742 in composite TypeScript projects
(#5648) and two installed copies of the package (#5659), and no map can keep every current consumer
on the file it resolves today: Jest under jsdom and Metro (Expo web) send identical conditions
(`default`, `require` or `import`, `browser`) yet land on different files (`server.cjs` versus
`browser.esm`). The best candidate map passed every bundler, Next.js byte-identity, composite
TypeScript, and both revert cases, but moved every Jest-jsdom suite onto the browser build. Jest 29's
resolver (`resolve.exports` 2.0.3) also throws when a matched condition has no inner match, where
Metro falls back to the next key, so a nested map cannot paper over the difference.

### Edge runtime

Server rendering on an edge runtime is unsupported. Next.js applies the `browser` file map to edge
bundles, so the server loads the browser build:

- A server component fails `next build`: the browser build calls `React.createContext` at module
  load, and the `react-server` build of React has none. Error 19 reports this, thrown from a guard in
  `src/constants.ts` (`!IS_RSC && !React.createContext`).
- A client component crashes at request time on the first DOM access. Error 20 reports this, thrown
  from a `typeof document` guard at the top of `makeStyleTag` in `src/sheet/dom.ts`.

Both messages tell the reader to use the Node.js runtime; the message text lives in the development
error map, so a consumer's production bundle carries only the two guards. Neither guard spells
`typeof React.createContext === 'undefined'`, which rollup replaces with `false` in browser builds.

## Type package dependencies

The published `.d.ts` files import types from `react`, `react-native`, `csstype`, `stylis` and the
`NodeJS` globals. Where each one's types come from:

- Never declare an `@types/*` package as a peer dependency, optional or not. pnpm folds every resolved
  peer into the package's install identity, so two workspace projects on different `@types/node` (or
  `@types/react`) versions each get their own physical copy of styled-components: two module
  instances, and a `ThemeProvider` in one never reaches components from the other. Verified on pnpm
  10 with a two-project workspace.
- `react` and `react-native` types are the consumer's, installed alongside the peer itself.
  `@types/node` is the consumer's too; only server-rendering signatures reference it.
- A type from a peer that an older supported major does not declare is written locally as a
  structural type covering only the members read, never imported. `ServerStyleSheet` does this for
  React 18's `PipeableStream`, which `react-dom/server` types before 18 do not export.
  `pnpm --filter styled-components test:types:dist` catches a regression, compiling the emitted
  `.d.ts` against the oldest supported `@types/react` patch of each major.
- A regular dependency that ships no types of its own carries its `@types` package as a regular
  dependency, pinned to match: `stylis` pairs with `@types/stylis`. Regular dependencies do not enter
  the install identity, so this cannot fork the package.

The "published type dependencies" block in `src/test/treeshake.test.ts` (run by `test:build`)
enforces the first and last rules against the built declarations.

## CSS injection ordering

Group IDs are allocated at call time, when `styled()`, `createGlobalStyle()` or `keyframes()` runs,
and a lower ID sorts earlier in the stylesheet.

Keyframes register eagerly via `getGroupForId(this.id)` in the constructor rather than through
`StyleSheet.registerId`, which would pull DOM imports into native builds.
