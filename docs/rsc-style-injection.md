# RSC Style Injection

How styles reach the page from React Server Components.

## Plain inline style tags

RSC components emit plain inline `<style data-styled>` tags, with no `precedence` and no `href`.
Server component output is not hydrated by React, so an inline tag causes no hydration mismatch. The
`data-styled` attribute survives because React Float only strips attributes during client hydration,
which never runs over RSC output.

Inline body styles land after the registry's `<head>` styles in source order, so a cross-boundary
extension (an RSC component extending a client component) wins the cascade. This source-order
placement is load-bearing and is why styles are not hoisted to `<head>` via `precedence`: the server
never sees a client component's base class, so it cannot make the extension win by specificity, and
`precedence` buckets order the RSC render ahead of the client registry, which would flip the cascade
(#5672). The child-index selector plugin below likewise depends on the tag staying an inline sibling.

No cleanup of RSC style tags is needed: they are the sole source of CSS for server-only components.

## Specificity in inheritance chains

Base-level CSS in an inheritance chain is wrapped in `:where()` for zero specificity. Without it,
duplicate base CSS from sibling extensions sharing a base would override an earlier extension's
styles.

## Per-instance emission

Each server-rendered instance emits its own inline `<style>` holding exactly that render's classes:
the leaf class from `generateAndInjectStyles` plus each `:where()`-wrapped base level. Rules are read
per name from the compiled cache (`getCompiledCSSForName`), so emission is O(chain length) per
instance rather than re-scanning a component's whole accumulated variant group. Compiled CSS is cached
on `ComponentStyle` and `Keyframes` through a `WeakMap`, which is dead-code eliminated in the browser
build; a cache miss (a name rehydrated from SSR markup) falls back to slicing the level's tag group by
the render's names.

There is deliberately no cross-instance or cross-request deduplication. A request-scoped `React.cache`
Set was tried and removed: `React.cache` is request-wide with no per-Suspense-boundary scope, so a
rule emitted only inside a Suspense fallback was recorded once, skipped for the resolved child, then
removed with the fallback when React revealed the boundary, leaving the resolved element with a class
but no rule (#5808). The alternatives were ruled out by their costs, not overlooked: hoisting via
`precedence` would dedup and survive the reveal but breaks #5672 and the child-index plugin (see
above); no per-boundary cache scope exists to make a ledger safe. Byte-identical duplicates are the
only output dedup ever collapsed, and they cost about a byte each after gzip (measured: 1000 identical
tags compress to ~0.5% of their raw size), so per-instance emission is the minimal correct behavior.

Keyframes are emitted per instance too, scoped to the render by matching each keyframe group's
resolved name against the render's CSS. A referenced keyframe's rules are concatenated ahead of the
component CSS in the *same* `<style>` tag: a styled component renders at most one style element, as
`Fragment(styleElement, element)`.

A development-only warning fires once a single component emits `RSC_REDUNDANT_EMIT_WARN_THRESHOLD`
(1000) tags in one render, the point at which a very large repeated list should share one className
instead. The counter is `React.cache`-scoped and gated on `NODE_ENV`, so production drops both the
warning and its bookkeeping.

## Per-render reset

`mainSheet` is reset once per server render via `React.cache`, clearing `names`, `keyframeIds` and the
tag, so stale CSS cannot accumulate across HMR cycles. Clearing `keyframeIds` is safe because
components re-register keyframes through `keyframe.inject()` during render.

## StyleSheetManager under RSC

`StyleSheetManager` works in RSC through a module-level `rscContextOverride` slot. Single-threaded RSC
renders plus the per-render `React.cache` reset make this safe.

The override carries exactly four things: `shouldForwardProp`, `styleSheet`, `stylis` and
`stylisPlugins`. A nested manager inherits `stylisPlugins` and `shouldForwardProp` from its parent
when it omits them, which is what lets an inner manager set `namespace` or `enableVendorPrefixes`
while keeping the outer plugins. Passing `stylisPlugins={[]}` explicitly opts out and falls back to
the default stylis instance. When neither a custom stylis instance nor a `shouldForwardProp` survives
resolution, the override is cleared to `null` rather than set to a redundant object.

`nonce` is not part of that override. It is a sheet option, resolved by `getNonce()` in priority
order: `<meta property="csp-nonce">` (Vite, which puts the value in the `nonce` attribute and exposes
it only through the DOM property), then `<meta name="sc-nonce">` (the styled-components convention,
value in `content`), then the legacy `__webpack_nonce__` global. Header-based nonces, as used by
Next.js and Remix, are not auto-detectable and must be passed explicitly to `StyleSheetManager` or
`ServerStyleSheet`.

## Selectors broken by inline style tags

Inline `<style>` tags are real DOM children, so they perturb any selector that counts children or
walks siblings. `:first-of-type` and `:nth-of-type()` are naturally immune because they filter by tag
name.

`stylisPluginRSC` is the opt-in stylis plugin that repairs the rest. It is exported from `index.ts`
only, not `base.ts`, so UMD builds can tree-shake it, and it uses `/*#__PURE__*/
Object.defineProperty` to keep a stable `.name` after minification. It does two separate jobs.

**Child-index pseudo-selectors.** `:first-child`, `:last-child`, `:only-child`, `:nth-child()` and
`:nth-last-child()` are rewritten with CSS Selectors Level 4 `of S` syntax to exclude
`style[data-styled]` from the count. `:only-child` becomes the conjunction of a first and a last test.
An `:nth-child()`/`:nth-last-child()` that already carries its own ` of ` clause is left alone rather
than double-wrapped. This is a precise, spec-level fix, and it requires browser support for `of S`
(Chrome 111+, Firefox 113+, Safari 9+).

**Adjacent sibling combinators.** A `+` is expanded with fallback selectors that also match when one
or two `style[data-styled]` tags sit between the siblings. Two known limitations: a `+` inside a
pseudo-function (`:is()`, `:has()`, `:where()`, `:not()`) is not expanded, so prefer
`:first-of-type`/`:nth-of-type` or the general sibling combinator `~` there; and each `+` adds two
fallback selectors, growing the CSS output.

The two-tag bound on that expansion is stated in the plugin as `Fragment[kfStyle?, compStyle?,
element]` per component. The emitter on this branch produces a single combined style tag per
component, so the bound is conservative rather than tight. Re-derive it before relying on it if the
emitter changes.
