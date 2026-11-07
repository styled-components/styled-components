# Adding or maintaining a CSS polyfill

The v7 native build polyfills CSS features that React Native's style engine doesn't understand (`light-dark()`, viewport / container units, `calc()`, `color-mix()`, `env()`, etc.). Each polyfill must have a spec-driven validation block before its parser internals can be safely refactored.

Keep `packages/styled-components/docs/rn-css-compatibility.md` eagerly current when RN versions ship, RN support changes, native polyfills are added or removed, or workaround behavior changes. Treat it as the consumer-facing compatibility ledger for the native CSS surface.

The procedure for a new polyfill, or when revisiting an existing one (also applies to any spec-backed CSS validation block elsewhere in the suite):

1. Fetch the editor's draft for this session per the editor's-draft rule in AGENTS.md "Mandates", then extract the relevant section by line range. Clause numbers and normative wording drift between editor's drafts; treating an older extract as authoritative without re-fetching invites mis-anchored tests.
2. Translate every spec rule into a single test in a `describe('... spec compliance (CSS <Module> §<n>)', ...)` block in the relevant test file. One test per rule. Quote the spec text verbatim as a comment above each test or block.
3. Write the tests FIRST (TDD). Run the block; record which currently fail.
4. Implement to make failing tests pass. Resist re-shaping passing tests to match the implementation; the spec is the source of truth.
5. Run the full native + main jest suites for regressions.

Once the spec block is green, the polyfill internals (tokenization, AST shape, evaluator) are free to refactor. The block locks user-observable behavior.

**Spec cites in other validation tests.** Regression Jest suites beyond a single polyfill block may still use short CSS anchors (§ numbers, `drafts.csswg.org` URLs, brief `//` notes above `describe`/`it`) paired with descriptive `it(...)` titles. When you add or materially change normative coverage, follow the same fetch + verbatim-quote discipline as the polyfill procedure for the rules you are locking.

Unsupported on Native (no viable workaround) MUST emit `warnOnce` with a stable `code` and a developer-facing message that names the offending construct and a concrete, actionable alternative, with no implementation details. Use a unique `dedupeSuffix` (typically the offending value) when the same construct could appear many times. Add a characterization test alongside the spec block so the warning text is regression-locked. The polyfill must still bail to `null` (drop the declaration) instead of shipping nonsense to RN.

## Polyfills never run on rn-web

On web, `styled-components/native` resolves to the rn-web bridge, which compiles styles with the web pipeline and hands the CSS to the browser through react-native-web's class-name path. The native engine and every polyfill are absent from that bundle, so:

- A polyfill has no rn-web branch and no rn-web test. Its spec block covers iOS and Android only.
- What works on rn-web is what the browser supports. The compatibility doc's rn-web statements describe browser support and the bridge, never polyfill output.
- Bridge behavior (prop mapping, `$$css` composition, end events, the 16-element matrix rewrite) is tested in `src/test/web-bridge.test.tsx`; the bridge bundle's contents in `treeshake.test.ts` "rn-web bridge build".

Notes:

- WPT corpus at `packages/styled-components/src/parser/wpt-corpus/` covers a lot of syntax parity; spec blocks fill the BEHAVIOR gap (e.g. mixed-form rejection in `light-dark()`, "unknown" color scheme handling, argument-count enforcement).
- The light-dark prototype is in `resolvers.test.ts` under the `light-dark() spec compliance (CSS Color Module Level 5 §7)` describe; copy that shape when adding a new spec block.
- When a spec rule does not apply on native (e.g. animation-on-scheme-change is irrelevant on native since we resolve discretely on render), document the deviation in a comment alongside the test (or its omission).
