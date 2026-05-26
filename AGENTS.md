NOTE: CLAUDE.md is a symlink to this file (AGENTS.md). Edit AGENTS.md directly.

## CSS surface

- styled-components supports only standards-compliant CSS in authored styles.
- The native layer exists to map idiomatic CSS to equivalent platform primitives and polyfill what is possible until React Native catches up.
- Do not add authored property names or spellings that are not real CSS (no inventing kebab-case aliases for React Native-only props). Standard properties and values only; platform-specific RN style keys belong in `style={{}}` or upstream RN CSS support, not in the template DSL.

## Basics

- Use pnpm package manager and associated commands
- Never run the dev server yourself, ask the user to start it if needed
- Use conventional commits: `(feat|fix|chore|refactor|test|docs|style|perf|build|ci): [description]`
- Default to short commit messages: title only, or title plus one tight sentence
- American English for prose: comments, docs, test titles, and user-visible strings (e.g. color, behavior, honor, recognize, serialize). Keep original spelling inside verbatim quotes from specs or standards.

## Critical Constraints

- NEVER use `precedence` or `href` on `<style>` elements. React 19 Float merges same-precedence tags, strips custom `data-*`, and hoists to `<head>` where source ordering is unpredictable. RSC style tags must be plain inline `<style>` (server component output is not hydrated, so no mismatch).
- The native entry must NEVER transitively import DOM code via value imports. Use `import type` and branded `Symbol.for()` checks instead of `instanceof`. Verify: `grep -c 'document\.' native/dist/styled-components.native.js` must be 0. RN/Hermes 0.85+ fails at module evaluation time on `document` references.
- Server detection draws on three independent signals, not a universal union. `__SERVER__` is the build-time constant set true in the server build. `IS_RSC` is true at runtime in React 19 server components because the `react-server` export condition serves a build without `createContext` (Next.js/Turbopack apply this condition automatically). `styleSheet.server` is the per-request flag set by `ServerStyleSheet`. Each gate picks the minimum subset of signals that catches the scenarios it cares about: pure SSR with `ServerStyleSheet`, server build under Jest jsdom (DOM mutations still happen so `__SERVER__` alone is misleading), Turbopack SSR of a client component (resolves the browser entry so `__SERVER__` is false on the server), and RSC server component (no `createContext` so React context hooks would crash). The trap: any gate that suppresses DOM work purely on `__SERVER__` will break the jsdom test path; gate on `IS_RSC || styleSheet.server` for that decision instead.
- `React.useRef` is `undefined` in RSC server components. Gate behind `__SERVER__` for dead-code elimination, never use `typeof React.useRef === 'function'` (runtime conditional hook).
- In-house CSS parser (v7) is the SOLE CSS emission path. When changing CSS emission, extend `emit-web.test.ts`, WPT-derived parser tests under `src/parser/wpt-corpus/test/`, or other parser/compiler suites you touch.
- React Native responsive runtime (`src/native/responsive.ts`): never re-resolve `Dimensions` / `Appearance` / `AccessibilityInfo` / `PixelRatio` inside effect closures. The module-level slot via `getRN()` is intentional; the cached references survive Jest teardown so subsequent renders still find the APIs.
- `hoistNonReactStatics` MUST never copy React identity markers (`$$typeof`/`$$id`/`$$async`/`$$bound`) from a target. Without that block, `styled(ClientComponent)` from RSC silently drops every extension; the wrapper inherits the client-reference identity and React skips its render body. See #5672.

## Mandates

- React 19+ compat (v7 peer floor)
- Strict TDD is enforced: extend or add failing tests that encode the desired contract before changing production code; implement only enough to turn them green. No user-visible behavior change ships without tests that would fail without it.
- Always microbenchmark to validate optimizations. Bench the realistic workload, not a synthetic best case. Revert changes that pessimize the path actual callers take, even if they win in isolation.
- Optimize for low memory pressure and monomorphic functions
- Tests AND implementation for CSS surfaces are always grounded in the current editor's draft on `drafts.csswg.org`. Before adding or materially changing a test or polyfill, re-fetch the relevant module section into `/tmp/` for the session (`curl -s https://drafts.csswg.org/<module>/ > /tmp/<module>.html`) and quote the normative clause verbatim above the test that locks it. Never paraphrase from training data; never substitute MDN or TR for the editor's draft. If the spec is silent or ambiguous, document the deviation next to the test and link the CSSWG issue. This applies to every CSS-touching change, not just polyfills.

## Agent Rules

- Strict TDD applies across the repo (see Mandates); follow the same red-green discipline for non-polyfill work.
- Code comments stay minimal: only the non-obvious "why" next to the relevant line. Do not restate CSS spec citations (`§n.n`, drafts.csswg.org URLs, "per CSS Foo 4 §x") inside production source or warnOnce messages. Section anchors, normative quotes, and rationale belong in the test that locks the behavior. Warn messages name the offending construct and the concrete alternative; nothing else.
- Create changesets only for user-visible changes (bug fixes, features, breaking changes). Skip internal refactors, build tooling, and test changes. Also skip changesets for fixes to code introduced within the same unreleased version.
- Changeset descriptions AND PR descriptions are both consumer-facing. Write so someone who uses the library but hasn't read its source can understand the change. NO internal API names, NO mechanism descriptions, NO references to specific code paths. Implementation details belong in commit message bodies and AGENTS.md, never in changesets or PR bodies.
- Do not edit CHANGELOG.md, it is auto-generated by changesets
- Public-facing docs (README, `packages/*/README.md`, `docs/*`, FAQ, sandbox README) describe user-observable behavior only. Implementation details belong in AGENTS.md unless the answer to a user question specifically requires them.
- Use the full family of punctuation marks when writing comments and prose, avoid em-dashes.
- Links to the site use the bare domain (`https://styled-components.com`). There is no `www` subdomain.
- After editing `packages/styled-components/src/utils/errors.md`, run `pnpm run generateErrors` before tests. Jest snapshots compare against the compiled error map and will fail silently otherwise. Delete any stray `errors.js` if error-text snapshots start failing; Jest's module resolver prefers `.js` over `.ts`.
- The repo-root `src/utils/errors.md` mirrors the canonical `packages/styled-components/src/utils/errors.md`. Update links in place; never change its structure or numbering.
- Don't name specific AI providers in contributor-facing docs. "An AI coding assistant" is the neutral phrasing.
- Don't hard-wrap prose in PR bodies, issue bodies, or GitHub comments. Single-line paragraphs with blank lines between them, markdown re-flows automatically and hard wraps look broken in mobile viewers and quoted replies. Commit message bodies may use the 72-char convention.

## Doc placement

- AGENTS.md holds cross-cutting rules, invariants, and earned knowledge that lacks a natural home in source comments. Topical mechanism that's well-described by the code itself does NOT belong here.
- `docs/*.md` files capture earned knowledge and pitfall avoidance that don't fit naturally into source comments. They are NOT mechanism walkthroughs of single features; the source is authoritative for mechanism.
- Source-level "why" lives in code comments / JSDoc next to the code it describes. The `compileNative.ts`, `source.ts`, `WebGlobalStyle.ts`, `native/animation/index.ts` modules already carry detailed comments; rely on those rather than restating them here.
- CSS normative text: do not paste editor's-draft (or TR) clauses into consumer-facing README or `docs/*`. Link to the relevant `drafts.csswg.org` (or TR) section and summarize user-observable behavior. Verbatim spec quotes for locking behavior belong next to the test assertions, not in prose docs, so citations stay current and grepable.

## Key Commands

- `pnpm build`: Build main package
- `pnpm test`: Run all tests
- `pnpm --filter sandbox dev`: Start Next.js dev server
- `pnpm --filter styled-components test:web`: Test web build
- `pnpm --filter styled-components test:native`: Test React Native
- `pnpm --filter styled-components bench`: Run all benchmarks (web + native + RSC)
- `pnpm --filter styled-components bench:web`: Run web benchmarks (`parser-pipeline`, `parser-strategies`, `responsive`, `v6-vs-v7`). The `parser-pipeline` suite measures in-house parse+emit throughput only.
- `pnpm --filter styled-components bench:web:stress`: Stress benchmarks only (`src/bench/web.test.js`); uses `SC_BENCH_ITER_SCALE=0.2` and `SC_BENCH_RUNS=3` for quicker runs
- `pnpm --filter styled-components bench:rsc`: RSC benchmarks (renderToString + dedup + React baseline)
- Native render perf: use `packages/ios-benchmark` (real Hermes V1 on iOS sim). The previous in-tree native React-rendering bench was retired; `react-test-renderer` 19.2 + RN preset doesn't synchronously invoke function components, and the V8 numbers wouldn't predict Hermes anyway. Algorithm-shape benches (parser, responsive, RSC) still run via `bench:web` / `bench:rsc`.

## Profiling (Bun)

Bun records a CPU profile and emits a markdown report (`--cpu-prof-md`: hot functions, per-file time, call relationships, grep- and review-friendly). `--cpu-prof` adds Chrome's JSON for the same run. From `packages/styled-components` (add `--cpu-prof-dir=./.cpu-profiles` to keep artifacts out of the tree; that directory is gitignored):

- In-house web parser: `bun --cpu-prof --cpu-prof-md --cpu-prof-name=parser-profile --cpu-prof-dir=./.cpu-profiles src/parser/profile-harness.ts`
- Native pipeline: `bun --cpu-prof --cpu-prof-md --cpu-prof-name=native-profile --cpu-prof-dir=./.cpu-profiles src/native/profile-pipeline.ts`
- Color polyfill only (skips transformDecl orchestration; pre-tokenizes operands so the profile is dominated by polyfill self-time): `bun --cpu-prof --cpu-prof-md --cpu-prof-name=color-polyfill --cpu-prof-dir=./.cpu-profiles src/native/profile-color-polyfill.ts`
- Animation only (per-segment color + value interpolation build + hot helpers): `bun --cpu-prof --cpu-prof-md --cpu-prof-name=animation --cpu-prof-dir=./.cpu-profiles src/native/profile-animation.ts`

`--cpu-prof-name` sets the output basename. If you omit `--cpu-prof-dir`, files are written in the current directory (Bun may use a name without a `.md` extension even for markdown content; the file is still markdown).

## Build Architecture

- `__SERVER__`: build-time constant, `true` in the server build only. See the server-detection bullet in Critical Constraints for which gates depend on it and which traps to avoid.
- `__NATIVE__`: build-time constant, `true` ONLY in the native build. The jest native setup flips it to `true` so jest-side createTheme tests reach the native branch.
- `__NATIVE_WEB__`: build-time constant, `true` ONLY in the rn-web variant of the native bundle. Gate browser-handles-natively passthroughs (`light-dark`, `oklch` / `lab` / `lch` / `color-mix`, viewport units, `calc()` static-mixed) and host-only fixes (matrix3d rewrite) on this constant so rollup tree-shakes per bundle. Jest defaults the global to `false`; flip per-test to exercise the rn-web branch.
- `__DEV__`: build-time constant gating dev-only code. Substitution is wired so consumer bundlers DCE the dead branch in production via the standard `NODE_ENV` path. Prefer the outermost applicable `if (__DEV__) { ... }` that can wrap a contiguous dev-only region; never rely only on `warnOnce` or helpers to skip work. Message strings and warning arguments must not be constructed outside `__DEV__`. Jest defaults the global to `true`; flip per-test to exercise the production branch.
- `IS_BROWSER` (`typeof window !== 'undefined'`) is a runtime check; bundlers CANNOT tree-shake code behind it.
- `IS_RSC`: module-level constant defined in `utils/isRsc.ts`. Rollup replaces it with literal `false` in browser/standalone/native builds for DCE; runtime semantics live in the server-detection Critical Constraint above.
- `browser` field is preferred over `exports` for mapping server bundles to browser variants (`exports` caused TS2742 in composite projects).
- Subpath entries (`styled-components/native`, `styled-components/plugins`) use a physical `<subpath>/package.json`. No `exports` field. Add the subpath directory to the top-level package.json `files` array so it's published.
- The `styled-components/native` subpath selects its engine per platform with Metro platform-extension files, NOT a `browser` object-map. `main` is the extensionless base `./dist/styled-components`; Metro resolves `styled-components.native.js` (Hermes engine) natively and `styled-components.web.js` / `styled-components.js` (rn-web bridge) on web. `module` points at the bridge ESM (`styled-components.web.esm.js`) for tree-shaking web bundlers. Do NOT reintroduce a `browser` map here: Metro applies `browser` on every platform, not just web, so a map silently routes the rn-web bridge onto iOS/Android (pulling in react-native-web and styleq). The `.js` fallback is the bridge, never the Hermes engine, so a web-side fallback never lands on native code. Locked by `src/test/treeshake.test.ts` → "native subpath platform-extension entries".
- Browser builds always use CSSOM injection. The v6 `disableCSSOMInjection` prop and `SC_DISABLE_SPEEDY` env vars are gone in v7. Consumers wanting CSS as text call `extractCSS()`.
- CSS injection ordering: group IDs are allocated at call time, lower ID emits earlier in the stylesheet.

## Adding or maintaining a CSS polyfill

The v7 native build polyfills CSS features that React Native's style engine doesn't understand (`light-dark()`, viewport / container units, `calc()`, `color-mix()`, `env()`, etc.). Each polyfill must have a spec-driven validation block before its parser internals can be safely refactored.

Keep `packages/styled-components/docs/rn-css-compatibility.md` eagerly current when RN versions ship, RN support changes, native polyfills are added or removed, or workaround behavior changes. Treat it as the consumer-facing compatibility ledger for the native CSS surface.

The procedure for a new polyfill, or when revisiting an existing one (also applies to any spec-backed CSS validation block elsewhere in the suite):

1. Fetch the editor's draft for this session per the Mandates rule, then extract the relevant section by line range. Clause numbers and normative wording drift between editor's drafts; treating an older extract as authoritative without re-fetching invites mis-anchored tests.
2. Translate every spec rule into a single test in a `describe('... spec compliance (CSS <Module> §<n>)', ...)` block in the relevant test file. One test per rule. Quote the spec text verbatim as a comment above each test or block.
3. Write the tests FIRST (TDD). Run the block; record which currently fail.
4. Implement to make failing tests pass. Resist re-shaping passing tests to match the implementation; the spec is the source of truth.
5. Run the full native + main jest suites for regressions.

Once the spec block is green, the polyfill internals (tokenization, AST shape, evaluator) are free to refactor. The block locks user-observable behavior.

**Spec cites in other validation tests.** Regression Jest suites beyond a single polyfill block may still use short CSS anchors (§ numbers, `drafts.csswg.org` URLs, brief `//` notes above `describe`/`it`) paired with descriptive `it(...)` titles. When you add or materially change normative coverage, follow the same fetch + verbatim-quote discipline as the polyfill procedure for the rules you are locking.

Unsupported on Native (no viable workaround) MUST emit `warnOnce` with a stable `code` and a developer-facing message that names the offending construct, why it can't run on RN, and a concrete alternative. Use a unique `dedupeSuffix` (typically the offending value) when the same construct could appear many times. Add a characterization test alongside the spec block so the warning text is regression-locked. The polyfill must still bail to `null` (drop the declaration) instead of shipping nonsense to RN.

### rn-web parity rule

Every polyfill must verify its rn-web output against `node_modules/react-native-web/src/`:

- If the browser ships the feature, the rn-web branch passes the raw CSS through. Don't expand, normalize, or fold what the browser handles.
- Never emit a CSS property the browser doesn't ship yet. Lift the equivalent HTML attribute via SPECIAL_CASE_PROPS instead.
- Gate RN-only prop lifts (`numberOfLines`, `ellipsizeMode`, `textBreakStrategy`, `focusable`, `accessibilityElementsHidden`, etc.) behind `if (!__NATIVE_WEB__)` when the browser implements the CSS surface.
- Never let RN-only enum extensions (`pointer-events: box-none | box-only`) through the rn-web branch. Web-only enums (`safe center`, `first baseline`) reach rn-web fine.
- Sentinel-shaped intermediates (`__sc_*`) are native-only. Short-circuit to a browser-recognized property + value before the sentinel forms on rn-web.
- Every polyfill spec block needs an `on rn-web` sub-describe that exercises the rn-web bundle toggle in Jest and locks rn-web-visible output shape. Prefer `describeOnRnWeb` from `src/native/transform/describeOnRnWeb.ts` (sets `globalThis.__NATIVE_WEB__` for the subtree and restores it afterward).

**What to assert in `describeOnRnWeb` (and what not to).** The outer `describe` locks Hermes/native polyfill semantics rule-by-rule. The rn-web subtree is **parity-focused**, not a second full copy of that matrix.

- **Assert** behaviors that branch on `__NATIVE_WEB__` or must hold when it is true: passthrough vs fold, `buildResolver` returning `null` so transformed CSS can reach the browser, differing resolver coverage (for example container `cq*` versus viewport-only paths), native-only warnings that must not fire on rn-web, and invariants where the fork is unified (a few narrow `it` blocks suffice).
- **Do not** mechanically duplicate every sibling `it` from the outer block when the rn-web bundle delegates resolution to the host; add targeted `it`s and a brief comment pointing to the handler or `resolvers.ts` (or equivalent) explaining omitted coverage.
- **Waive explicitly** when a normative rule does not apply on rn-web: document next to the rn-web describe, same rigor as native deviation comments.

Notes:

- WPT corpus at `packages/styled-components/src/parser/wpt-corpus/` covers a lot of syntax parity; spec blocks fill the BEHAVIOR gap (e.g. mixed-form rejection in `light-dark()`, "unknown" color scheme handling, argument-count enforcement).
- The light-dark prototype is in `resolvers.test.ts` under the `light-dark() spec compliance (CSS Color Module Level 5 §7)` describe; copy that shape when adding a new spec block.
- When a spec rule does not apply on native or rn-web (e.g. animation-on-scheme-change is irrelevant on native since we resolve discretely on render), document the deviation in a comment alongside the test (or its omission).

## attrs Behavior

- attrs ALWAYS wins over directly passed props (by design)
- The function form is the escape hatch: `.attrs(({ as }) => ({ as: as || "button" }))`
- Exception: explicitly passing `undefined` for a prop prevents attrs from overwriting it (PR #5683)

## Performance Patterns (microbenchmark-validated)

- String `+=` is 3-4x faster than `array.push() + join()` at all scales (V8 cons string trees)
- `{...props, theme}` is 4x faster than `Object.assign` or `for..in` copy
- `for..in` is 1.7x faster than `Object.keys()` + loop
- Cache RegExps via Map (5x faster); `indexOf` pre-check to skip entirely is 5x more
- Manual `+` concat is 1.3x faster than `` `${a}${b}` `` template literals in tight loops
- Raw element objects are 60-120x faster than `React.createElement` (`$$typeof` detected at module load)
- `new Array(n)` creates HOLEY_ELEMENTS arrays that infect V8 type feedback, 3.9x regression observed in GroupedTag

## V8 Gotchas

- `private` modifier is not allowed on anonymous class expressions (`export const Foo = class { ... }`)
- `import type * from 'stream'` still triggers bundler module resolution even though TypeScript strips it

## native-showcase rules

The `packages/native-showcase` app is the visual QA surface for v7 native polyfills across iOS, Android, and rn-web. It is also a fairness contract: it must not lie about what works on which platform. Rules apply to every widget and every piece of chrome in the showcase.

- Omniplatform components only. No `Platform.OS` / `Platform.select` branches in showcase code, and no `__NATIVE_WEB__` reads outside the library. Same JSX runs everywhere. Platform-skew workarounds belong inside `packages/styled-components` (transforms, polyfills, passthrough, dev warnings); never in the app.
- No raw DOM tags. The showcase has no `<select>`, `<a>`, `<input>`, `<table>`, `<dialog>`, etc., even web-gated. Compose from RN primitives (`View` / `Text` / `Pressable` / `Modal` / `FlatList` / `TextInput`) or pull in a cross-platform community lib. See `knowledge_rn_0_85_component_surface` for the gap inventory.
- Maximize visual obviousness. A working vs not-working state must be glanceable at arm's length. Use macro differences: layout shifts, position changes, color floods, glyph layout, presence/absence; not subtle hue swings or 1-pixel tweaks. The reader should never have to squint.
- Both light and dark mode must work for every widget. Default to `light-dark()` for any color decision so theme switches repaint without React re-renders. If a widget hardcodes a color, that color must read in both modes; if it can't, route through `light-dark()` or `useColorScheme()`.
- Zero tolerance for fake demos. Every widget exercises the actual library/runtime path it claims to demonstrate. If a polyfill can't run on a given platform, the cell is allowed to fail loudly (broken layout, warnOnce message, missing glyph); that failure is the demo on that platform. Never substitute a JS-computed mock that mimics the spec, and never hardcode `t.colors.pass`/`fail` as a stand-in for the polyfill firing. Before adding a new widget, verify how the surrounding widgets prove their behavior and follow the same pattern.

## Topical references

- TypeScript type-instantiation budget and pitfalls: [docs/typescript-performance.md](docs/typescript-performance.md)
- Web rendering sequence diagram: [docs/rendering-flow.md](docs/rendering-flow.md) (web flow only)
- Single-output-path migration plan (historical): [docs/single-output-path.md](docs/single-output-path.md)
- Animation adapters + spec coverage (Hermes / rn-web / reanimated): [docs/animation-adapters.md](docs/animation-adapters.md)
