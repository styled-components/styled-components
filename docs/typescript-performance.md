# TypeScript Type Performance

## Profiling

- `~/.claude/tools/tsc-perf.sh measure tsconfig.test-types.json`
- `npx tsc --noEmit --extendedDiagnostics --project tsconfig.test-types.json`
- Delete tsbuildinfo for clean measurement.
- Hot-spot detection + duplicate-package detection: `npx @typescript/analyze-trace /tmp/tsc-perf-trace`

## Library self-check vs. consumer cost

The `tsconfig.test-types.json` measurement covers everything under `src/`, so it
mostly reflects the library's own type-check workload. Consumer-side cost is
better measured by compiling a fixture that imports from the published `dist/`
d.ts. v7 adds ~50 internal source files (parser, native transform, plugins) that
do not propagate to consumers because the public surface is the same.

Indicative consumer numbers (TS 5.9.3, 100 styled components, real-world
mix of `styled.tag`, prop interpolations, `attrs`, polymorphic `as`,
`styled(C)`, object styles): ~22K types, ~321K instantiations,
~175MB memory, 0.50s check time.

## Measured constraints

### `OverrideStyle`

Accounts for ~22% of type instantiations (measured via ablation). Cannot be simplified without breaking `exactOptionalPropertyTypes` or JSX overload resolution. Do not touch without a major version plan.

The `& {}` wrap on `(S & {})` inside `style?: CSSPropertiesWithVars | (S & {})` is a real undefined-filter under `exactOptionalPropertyTypes: true`; DO NOT remove it. Without it, both `style?:` AND `style: undefined` become assignable, which changes semantics.

Don't replace built-in `Omit` with `FastOmit` in `OverrideStyle`; built-in `Omit` (Pick + Exclude) is more optimized (+17% instantiations when replaced).

### `MakeAttrsOptional<P, K>`

Defined as `FastOmit<P, K> & { [Key in Extract<keyof P, K>]?: P[Key] }`; direct mapped type rather than `Partial<Pick<P, K>>`.

`Partial<Pick<P, K>>` forces TS to materialize an intermediate `Pick<P, K>` type that union-distributes across heavily-discriminated component prop types (antd `Button`, MUI), exploding past the TS complexity ceiling (TS2590). Direct mapped type avoids the intermediate. Saves ~6.5% total instantiations on the styled-components type test corpus (#5725).

### `FastOmit` patterns

- `FastOmit<A, K> & B` (intersection) is 2.4x fewer instantiations than a single mapped type with per-key conditionals
- Homomorphic mapped types (`{ [K in keyof P]: ... }`) break React JSX overload resolution
- Flattening nested `Substitute` into parallel `FastOmit`s increases instantiations; TS deduplicates nested structures better

### `NoInfer`

Use built-in `NoInfer` (TS 5.4+) internally. **Never declare a local `NoInfer<T>`
alias in the same file as types that reference it** — within a single source
file, the local declaration shadows the global lib type and references resolve
to the slower form (`[T][T extends any ? 0 : never]` deferred type instead of
the built-in marker). v7 saw a measured -3% to -5% consumer instantiations from
removing one such shadow in `types.ts`.

### `Interpolation` union

`RuleSet<Props>` aliases `Interpolation<Props>[]`, so don't list both as
separate branches inside `Interpolation<Props>` — TS doesn't always collapse
type aliases against their expansion at union dedupe time.

### Inline trivial `FastOmit` results

`FastOmit<ExecutionProps, 'as' | 'forwardedAs'>` reduces to
`{ theme?: DefaultTheme | undefined }`. Inlining the literal in the
`PolymorphicComponent` overloads saves a `FastOmit` instantiation per element
type-check.

### Variance annotations

`out` / `in out` on `Styled`, `PolymorphicComponent`, `IStyledComponentBase`, etc. reduce variance computation (-72%) and memory (-16%).

### `domElements.forEach`

Uses `(styled as any)` cast; types are already declared via mapped type on the styled const, avoiding 120 redundant `Styled<>` instantiations.

### `KnownTarget` shape (don't re-narrow)

The 153-element `SupportedHTMLElements | AnyComponent` union looks like an obvious
target for narrowing. Don't. `ExecutionProps['as']: KnownTarget | undefined` is
load-bearing for the contextual typing of `.attrs({ as: 'label' })`: the literal
`'label'` only narrows against a union that includes `SupportedHTMLElements`. If
`KnownTarget` becomes plain `string | ComponentType<any>`, the literal widens to
`string` and downstream `ComponentPropsWithRef<Target>` resolves to the wrong
element / event types — breaking ref typing for attrs-overridden styled
components. The lib's `test/types.tsx:305-306` is the regression gate.

Localizing the literal union to an attrs-only helper type keeps the literal
narrowing but doesn't recover the win, since `Attrs<Props>` is referenced from
`IStyledStatics.attrs[]` — the literal-bearing type still propagates wherever a
styled component appears.
