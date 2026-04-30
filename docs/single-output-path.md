# Plan: collapse to a single CSS output path

## Status quo

Two paths feed the web emitter today:

- **Source / AST direct** (`src/parser/compile.ts`). Construction-time AST walks at render time, fills sentinels with evaluated interpolation values, runs `emit-web`.
- **Legacy** (`flatten` + `joinStringArray` + `compiler(css, ...)` from `utils/compiler.ts`). Resolves interpolations to a JS string, then `normalize` + `parse` + `emit-web` runs at render time.

The fast path is used when `evaluateForFastPath` returns a non-null filled[]. Otherwise we bail to legacy. Both funnel through `emit-web` so output is byte-identical for any case the fast path covers.

## Goal

`emit-web` is the only emitter; `parser.parse` happens once at construction time only; `flatten`, `joinStringArray`, and the per-render `normalize + parse` calls in `createCompiler` are deleted.

## Bailouts to retire (in order)

1. **Keyframes refs in value position** (`animation-name: ${kf}`). Today the keyframes object has a `name` string and a `$$typeof` brand. Fast path bails on any `$$typeof !== undefined`. Detect keyframes specifically (brand check) and substitute `kf.name` like a primitive.
2. **Styled-component class refs in value position** (`color: ${OtherComp}`). Substitutes the class-name string. Same brand detection as keyframes; substitute the styled component's `componentId` plus dedup-name once it's resolvable. In practice this lookup needs a sheet handle, so it has to flow through the same plumbing as the legacy `flatten` does.
3. **`css\`\`` fragment interpolations**. When a slot resolves to a fragment, today the fragment is itself a `Source`-bearing RuleSet. The fast path needs to splice the fragment's pre-built AST into the parent at the slot position, with sentinel re-numbering (`\0I0\0` in the child remaps to `\0I<offset+0>\0` in the parent) and the child's interpolations array concatenated. Block-position fragments: splice as siblings at the InterpolationNode site. Embedded-position fragments: only legal when the fragment is a single decl-list with no nested rules; otherwise still a bailout (we deliberately do not invent CSS surface area).
4. **Block-level interpolations producing nested rules** (`${() => '&:hover { color: red; }'}`). The slot resolves to a string with `{`/`}`. Today we bail. The fix is to parse the substituted fragment with the existing `parser.parse` call, then splice. Per-render parse cost only pays on this case, not on the common path. Caches per-substituted-string AST keyed on the joined string.
5. **Multi-arg helper functions** (`fn.length > 1`). These are user helpers, not prop resolvers. Keep the bailout indefinitely - they are free-form code and have no reasonable static shape. The legacy path resolves them by calling `fn(...)` somehow (via flatten), so consolidation requires moving that single call into the fast path's evaluator. Probably defer past v7.0.
6. **Inline style objects / attrs results in value position**. Rare in template literals; usually attrs returns objects. If a slot is an object that's neither styled-component nor keyframes, today it bails. After (1)-(5) ship, this case is the "unknown shape" tail; we keep it as a bailout but with no path to fall back to once legacy is gone. Plan: emit a dev warning and produce `''`. Production behavior matches "fragment that produced empty string."

## Phases

### Phase A - rename (done)

`src/parser/fillAndEmit.ts` -> `src/parser/compile.ts`. No behavior change. Already done.

### Phase B - keyframes + styled-component value-position refs

- `compile.ts::resolveInterpolation` - detect `$$typeof === KEYFRAME_TAG` -> return `slot.name`. Detect styled-component brand -> return `'.' + componentId`. Both behave identically to what `flatten` does for these shapes.
- New unit tests: `${kf}`, `${OtherComp}` in value position round-trip via fast path with byte parity to legacy.
- Removes 2 of the 6 bailouts; expected hit-rate jump on real apps is large since keyframes and component selectors are common.

### Phase C - css`` fragment splicing

- `Source.merge(parent, slotIndex, child)` helper in `source.ts`: walks `child.ast`, renumbers `\0I<n>\0` and `\0J<n>\0` sentinels to `\0I<offset+n>\0`/`\0J<offset+n>\0`, concatenates `parent.interpolations` with `child.interpolations`.
- For embedded-position fragments (slot inside a value), splice the child's flat decl-list into the parent's value string. Bail on nested rules.
- For block-position fragments (slot at statement boundary), splice the child's AST nodes into the parent at the InterpolationNode site.
- Uses the construction-time AST of the fragment - no per-render parse.
- New parity tests in `compile.test.ts` covering: `${mixin}`, `${condition && mixin}`, nested mixins, mixins inside `@media`, mixins that themselves contain interpolations.
- Removes the `css\`\`` bailout, the largest single category by usage.

### Phase D - block-level fragment string fallback

- For the `() => '&:hover { ... }'` case, `compile.ts` parses the substituted string at fill time using the existing `parser.parse`. Result spliced like a fragment via the same `Source.merge` helper.
- Cached per-substituted-string with a small LRU. Real apps rarely hit this path with unbounded string variation; the cache hits in practice.
- Bail only on substituted strings that fail to parse (malformed CSS the legacy path would also drop).

### Phase E - delete the legacy path

After B-D land, only the multi-arg-fn and unknown-object bailouts remain. Both are dev-error-shaped; production hit rate near zero. At that point:
- Delete `flatten.ts` and `joinStringArray.ts`.
- `utils/compiler.ts::createCompiler` becomes a thin wrapper around `compile.ts::compileWebFilled`. The legacy `compile(css, selector, prefix, componentId)` callable goes away; `compile.emit(source, filled, parentSelector, componentId)` becomes the only call shape.
- `WebStyle.generate` and `NativeStyle.compile` stop carrying their dual-path logic. Two of the three caches (`dynamicNameCache`, `interpKeyCache`) collapse into one keyed on the filled tuple.
- Remove the `compiler(css, ...)` callable from `Compiler` type. Update `jest-styled-components` invariants doc - this is a private API but worth flagging the shape change for downstream tooling.
- Bench: expected modest win on cold-render (-1 parse pass), larger win on warm-render (no `flatten` walk). Bundle drops ~0.5-0.8 kB gzip from the deleted modules.

### Phase F - parser collapse (optional, post-v7.0)

`parser.parse` runs at construction time only. `normalize` becomes an internal helper of `parseSource`. The "wrap in `selector{...}`" trick in `createCompiler` becomes unnecessary. We can simplify `parser.ts` by dropping the wrapping logic and the selfRefSelector-as-parent option that only the legacy path used.

## Open questions

- **Multi-arg helper functions**: do we ship a "compile-time helper" that re-shapes them, or accept the bailout permanently? The latter is fine if the bailout falls through to a synchronous evaluator that doesn't re-parse; legacy currently re-parses, but post-Phase-E there's no parser at runtime so we'd need a minimal shim.
- **Substituted-string AST cache eviction**: align with `dynamicNameCache` LIMIT (200) or pick its own bound? Real-world cache size depends on how variable user-generated CSS strings are.
- **`jest-styled-components` impact**: the matcher reads `__PRIVATE__.mainSheet.toString()`, not the compile internals, so the consolidation should be invisible. Confirm via a CI matrix run before Phase E lands.

## Risk surface

- Hash stability: `compile.ts` already produces byte-identical CSS to the legacy path for cases the fast path covers; that invariant must survive each Phase. The parity corpus in `compile.test.ts` is the gate.
- SSR rehydration: same-origin concern - cached HTML must rehydrate. Same gate.
- `__PRIVATE__` sheet shape: unchanged; jest-styled-components keeps working.
