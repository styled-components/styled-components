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

`styleSheet.server` is a runtime flag set by `ServerStyleSheet`. It exists because Turbopack resolves
the `browser` entry when server-rendering client components, which makes `__SERVER__` false on the
server; this flag is the fallback that still reports the truth there.

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

The `browser` field in `package.json` maps server bundles to their browser-specific alternatives. It
is preferred over `exports`, which caused TS2742 in composite TypeScript projects.

## CSS injection ordering

Group IDs are allocated at call time, when `styled()`, `createGlobalStyle()` or `keyframes()` runs,
and a lower ID sorts earlier in the stylesheet.

Keyframes register eagerly via `getGroupForId(this.id)` in the constructor rather than through
`StyleSheet.registerId`, which would pull DOM imports into native builds.
