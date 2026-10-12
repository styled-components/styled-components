# Jest + jsdom for CSS assertions

The web suite renders styled-components under jsdom and asserts on the emitted CSS strings, so two things are load-bearing: jsdom's ceiling on modern CSS features (it silently drops some), and the harness mechanics that read injected CSS back off the live sheet and make class names deterministic.

## jsdom modern-CSS support

The web suite runs `testEnvironment: 'jsdom'` (`jest.config.main.js`, `jest.config.bench.js`) via `jest-environment-jsdom` 30, which resolves jsdom 26.1.0.

jsdom parses inserted rules through a CSSOM implementation that lags the CSS spec, and `insertRule` throws on what it cannot parse; the library's CSSOM tag swallows that error, so the rule disappears without a failure. A styled-component can correctly produce a rule (verifiable via SSR / `VirtualTag`), yet the round-trip through `<style>.sheet.insertRule(rule)` loses it: reading back `style.sheet.cssRules` shows nothing, and a test asserting on the live sheet silently loses coverage.

Which features survive depends on the jsdom version. jsdom 29 and 30 behave alike, and both regress against 26 (checked 2026-10 against 26.1.0, 29.1.1, and 30.1.2 by inserting each rule through `insertRule`):

### jsdom 26 (rrweb-cssom) drops

- `@layer reset, framework, utilities;` (block-less `@layer` name declarations)
- `@scope (.card) to (.content) { ... }`
- Assorted other unprefixed modern at-rules in some configurations
- `:nth-child(N of S)` does work in 26 (it parses and matches)

### jsdom 29 and 30 (css-tree) fix, but regress

Fixes: block-less `@layer ...;` and `@scope` both parse and are preserved.

Regresses:

- `@starting-style { ... }` body silently dropped
- `@property --x { ... }` silently dropped
- `light-dark(white, #111)` normalized to `light-dark(white, rgb(17, 17, 17))` (hex canonicalized to rgb)
- `cssText` formatting changed: `.a {}` becomes `.a { }` (extra space), invalidating many snapshots
- A higher Node floor: jsdom 29 needs `^20.19.0 || ^22.13.0 || >=24.0.0`, jsdom 30 `^22.22.2 || ^24.15.0 || >=26.0.0`

The css-tree integration is partial, so the suite stays on jsdom 26 until these regressions are fixed upstream.

### Pragma for modern at-rules today

- If a parser-level test already covers the construct (for example `src/parser/emit-web.test.ts`), that coverage is the actual contract. Drop the jsdom integration test rather than maintaining a workaround around the CSSOM hop; such a test re-tests jsdom.
- When integration coverage genuinely matters (asserting the rule reaches rendered HTML), route through SSR / `ServerStyleSheet` so the path is `VirtualTag` with no jsdom CSSOM hop. `ServerStyleSheet` only uses `VirtualTag` when both `__SERVER__` (build constant) and `isServer: true` hold; in a jsdom env the build is browser, so `__SERVER__` is false and `ServerStyleSheet` still hits `CSSOMTag`. Use `@jest-environment node` for these tests when SSR-via-`VirtualTag` is required.

## Reading injected CSS in a test

The browser build injects rules through CSSOM (`insertRule`), not by writing text into the `<style>` element. Under jsdom that means the rules are invisible in `styleTag.innerHTML` / `textContent`; they exist only on the live `styleTag.sheet`. Any assertion on emitted CSS must walk the live sheet, and `src/test/utils.ts` is the web suite's harness for exactly that.

### Read the CSS off the live sheet

`getCSS(document)` walks every `<style>` in scope and, for each, reads `tag.sheet.cssRules[].cssText` when the sheet has rules, falling back to `tag.innerHTML` only for text-injected tags (SSR / `VirtualTag`). It normalizes brace and colon spacing so the CSSOM serialization matches the authored form.

- `getRenderedCSS()` returns a js-beautify'd form of that CSS, tuned for readable diffs; pair it with `toMatchInlineSnapshot` (the dominant assertion style, see `src/test/basic.test.tsx`).
- `expectCSSMatches(expected)` normalizes whitespace and colon spacing on both sides then asserts equality; reach for it when an inline snapshot would be noisier than a targeted string.
- Rendered markup (not the sheet) is snapshotted through `jest-serializer-html`, wired in `jest.config.base.js`.

### Make class names deterministic

styled-components derives class names from a content hash, which would churn every snapshot. The harness `jest.mock`s `generateAlphabeticName` to emit sequential names (`a`, `b`, `c`, ...) instead, so snapshots are stable across runs. `seedNextClassnames([...])` pins specific names for a test that asserts on a particular one.

### Reset global sheet state per test

The sheet (`mainSheet`, from `models/StyleSheetManager`) is a process-global singleton, so styles leak across tests unless reset. Call `resetStyled()` (it returns a fresh `styled`) at the top of each test or in `beforeEach`: it clears `<style>` tags from `document.head` and `document.body`, resets the group-id allocator (`resetGroupIds`) and component identifiers (`resetIdentifiers`), empties `mainSheet.names`, calls `mainSheet.clearTag()`, and resets the class-name mock counter. `rehydrateTestStyles()` re-runs SSR rehydration against `mainSheet` when a test exercises that path.
