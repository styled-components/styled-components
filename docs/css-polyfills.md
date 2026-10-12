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

## rn-web parity rule

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
