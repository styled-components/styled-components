# Bundling and Dead-Code Elimination

The `__DEV__` and `__*` build-constant scheme is load-bearing for both correctness and size: each rollup bundle literal-replaces a different set of constants so rollup and terser can strip the branches that bundle must not ship. Get the scheme wrong and a native bundle keeps a `document.` reference (crashes Hermes at module eval), or a production browser bundle keeps a dev warning table (dead weight). This doc records the concrete failure modes behind the policy in AGENTS.md.

## Build-constant substitution and DCE

`rollup.config.mjs` runs `rollup-plugin-replace` per bundle before terser. Each `__*` constant is replaced with a JavaScript literal, so the branch it guards becomes statically dead and gets eliminated. The replacements per bundle:

| bundle              | `__SERVER__` | `__NATIVE__` | `__NATIVE_WEB__` | `__DEV__` | `IS_RSC` expr |
| ------------------- | ------------ | ------------ | ---------------- | --------- | ------------- |
| standalone (dev)    | `false`      | `false`      | `false`          | `true`    | `false`       |
| standalone (prod)   | `false`      | `false`      | `false`          | `false`   | `false`       |
| server              | `true`       | `false`      | `false`          | deferred  | runtime       |
| browser             | `false`      | `false`      | `false`          | deferred  | `false`       |
| native (Hermes)     | `false`      | `true`       | `false`          | deferred  | `false`       |
| plugins             | `false`      | `false`      | `false`          | deferred  | `false`       |
| reanimated          | `false`      | `true`       | `false`          | deferred  | `false`       |
| web-bridge (rn-web) | `false`      | `false`      | `true`           | deferred  | `false`       |

Two entries are not plain literals:

- `__DEV__` "deferred" means the bundle substitutes the string `(process.env.NODE_ENV !== 'production')` rather than a literal. The consumer's bundler then folds `NODE_ENV` and DCEs the dead branch on the consumer side. Only the two standalone bundles ship a hard `true` / `false`, since they are prebuilt and minified here with no downstream bundler to defer to.

  The parentheses are load-bearing, because substitution is textual and the replacement is an expression, not a value. Without them `if (!__DEV__) return;` emits `if (!process.env.NODE_ENV !== 'production') return;`, which parses as `(!process.env.NODE_ENV) !== 'production'` and is therefore always true. Every such guard in the library inverts: warnings never fire and errors serve their terse production text in development. Nothing catches it upstream, since Jest defines `__DEV__` as a real boolean and source-level tests never see the substituted form. `treeshake.test.ts` locks it from the other end, asserting no emitted bundle contains `!process.env.NODE_ENV` and that a built bundle really does warn and throw readable errors.

- `IS_RSC` is defined in `utils/isRsc.ts` as `typeof React.createContext === 'undefined'`. Every bundle except `server` replaces that exact expression with `false` (via a zero-delimiter `replace`), which DCEs every branch gated on it. The `import React` in that file stays only for the browser, standalone, and web-bridge bundles, where the edge-runtime guard reads `React.createContext` (see "Edge runtime"). The `server` bundle leaves the expression as a genuine runtime check, because a server build must detect an RSC environment at request time rather than at build time.

### Build-time `__*` versus runtime `IS_BROWSER`

`__SERVER__`, `__NATIVE__`, `__NATIVE_WEB__`, and `__DEV__` are replaced with literals at build time, so a branch guarded by one of them is gone from the emitted bundle. `IS_BROWSER` is different:

```js
export const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';
```

It is a real runtime expression, evaluated in the consumer's environment, and no bundler can tree-shake code behind it. Both branches of `if (IS_BROWSER)` ship. Reach for `IS_BROWSER` only when the decision genuinely must be made at runtime (the same bundle runs in both a browser and a non-browser JS host). When the decision is fixed per bundle, gate on the matching `__*` constant so the dead side is eliminated. The native-build DOM-isolation invariant (no `document.` in `native/dist`) depends on this: a `document.` access reachable only through `IS_BROWSER` would survive into the native bundle, whereas one behind `if (!__NATIVE__)` is stripped.

## The terser module-scope DCE trap

AGENTS.md requires message strings and their argument construction to live inside the innermost-feasible `if (__DEV__) { ... }`, preferring the outermost applicable guard over trusting `warnOnce` to skip work. The mechanism behind that rule: terser eliminates dead branches _inside_ a function body, but it does not eliminate a module-scope `const` whose initializer constructs a value, even when the only consumer is a dev-only guarded function.

```js
// module scope: survives the production bundle
const FIRST_PARTY = new Set(['rsc', 'rtl']);

export function warnThing(name) {
  if (process.env.NODE_ENV === 'production') return;
  if (FIRST_PARTY.has(name)) warnOnce(/* ... */);
}
```

Terser strips the function body's dead branch correctly, but `new Set([...])` runs at module init, so terser treats it as a possible side effect and keeps `FIRST_PARTY` and its string literals in the bundle. The symptom is a `treeshake.test.ts` assertion like `expect(bundle).not.toContain('rsc')` failing after a refactor hoisted what looked like a pure constant out of the function.

The fix is to remove the top-level reference, moving the literals inside the guarded body so they share the dead branch:

```js
export function warnThing(name) {
  if (process.env.NODE_ENV === 'production') return;
  if (name === 'rsc' || name === 'rtl') warnOnce(/* ... */);
  // or build `new Set([...])` here, past the guard
}
```

A `/*#__PURE__*/` annotation on the constructor does not help: it marks the call pure but terser still keeps the binding while any reference path exists. Removing the top-level binding is the move. The same shape bites any module-scope literal builder that only a dev path reads: `Map`, `Object.freeze({...})`, a frozen lookup table. `treeshake.test.ts` is the regression gate; without it these ship silently.

## d.ts bundling and TS2742

The package maps server bundles to their browser variants with a `browser` field, not an `exports` field:

```jsonc
"browser": {
  "./dist/styled-components.cjs.js": "./dist/styled-components.browser.cjs.js",
  "./dist/styled-components.esm.js": "./dist/styled-components.browser.esm.js"
}
```

An `exports`-based mapping caused TS2742 in downstream composite projects. TS2742 reads:

```
The inferred type of 'X' cannot be named without a reference to '...'.
This is likely not portable. A type annotation is necessary.
```

It fires during declaration emit: the compiler infers a type whose name it can only express through a module path it does not consider portable, and instead of writing that path it errors. Routing the server-to-browser mapping through `exports` conditions put the resolver on a path where the emitted declaration's inferred types resolved through condition-dependent module specifiers, and a consumer compiling with `declaration` on (as composite projects do) hit the non-portable-name case. The flat `browser` map sidesteps the `exports`-condition resolution entirely: bundlers read it for the file swap, and the type resolver keeps following `main` / `module` / `types` to stable specifiers, so the inferred declaration types stay nameable. A maintainer who reintroduces `exports` here will see the same TS2742 surface in a consumer build, not in this repo's own type-check.

No `exports` map can keep every current consumer on the file it resolves today, even with TS2742 solved. Jest under jsdom and Metro (Expo web) send identical conditions (`default`, `require` or `import`, `browser`) yet land on different files (`server.cjs` versus `browser.esm`). The best candidate map tested on the v6 line passed every bundler, Next.js byte-identity, composite TypeScript (5.4 to 7.0), and the 6.3.7 revert cases (#5648, #5659), but moved every Jest-jsdom suite onto the browser build. Jest 29's resolver (`resolve.exports` 2.0.3) also throws when a matched condition has no inner match, where Metro falls back to the next key, so a nested map cannot paper over the difference.

## Edge runtime

Server rendering on an edge runtime is unsupported. Next.js applies the `browser` file map to edge bundles, so the server loads the browser build:

- A server component fails `next build`: the browser build calls `React.createContext` at module load, and the `react-server` build of React has none. Error 19 reports this, thrown from a guard in `utils/isRsc.ts` (`!IS_RSC && !React.createContext`).
- A client component renders unstyled HTML with no error, as it does on any runtime without a style registry, because client styles inject through `useInsertionEffect`, which never runs on the server. With a `ServerStyleSheet` registry (the documented Next.js setup), the first `<style>` creation fails at request time. Error 20 reports this, thrown from a `typeof document` guard at the top of `makeStyleTag` in `src/sheet/dom.ts`.

Both messages tell the reader to use the Node.js runtime. Guard 1 is gated `!__SERVER__ && !__NATIVE__`, so only the bundles where it can fire carry it.

## Published files

The package's `files` list includes `native`, and the workspace install puts dependencies in `native/node_modules`, so `files` excludes `!native/node_modules`. `test-utils` stays out of `files`: it imports `enzyme` and `../src`, neither of which ships, so only the repo's own Jest configs can load it. CI publishes through `pnpm release` (`changeset publish`, which packs with pnpm and honors `files`). The "published package contents" block in `src/test/treeshake.test.ts` (run by `test:build`) fails if the packed list holds any `node_modules` or `test-utils` path, or drops a native entry point. It reads `npm pack --dry-run`, whose list matches pnpm's, because the pinned pnpm has no dry-run pack. Neither guard spells `typeof React.createContext === 'undefined'`, which every non-server bundle replaces with `false`.
