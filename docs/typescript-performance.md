# TypeScript Type Performance

## Profiling

- `~/.claude/tools/tsc-perf.sh measure tsconfig.test-types.json`
- `npx tsc --noEmit --extendedDiagnostics --project tsconfig.test-types.json`
- Delete tsbuildinfo for clean measurement.
- Hot-spot detection + duplicate-package detection: `npx @typescript/analyze-trace /tmp/tsc-perf-trace`

## Library self-check vs. consumer cost

The `tsconfig.test-types.json` measurement covers everything under `src/`, so it
mostly reflects the library's own type-check workload. That is the wrong number
for judging what an upgrade costs an app: v7 adds ~50 internal source files
(parser, native transform, plugins) that never propagate to consumers, and a
regression in the public prop-resolution types barely moves it.

Consumer cost is budgeted separately. `pnpm --filter styled-components type-perf`
generates a fixture in the shape large apps have, type-checks it against the
built `dist/*.d.ts` (what consumers and editors actually resolve), and fails when
types, instantiations, or memory drift past what `type-perf.budget.json` records.
That file is the live figure and `type-perf` prints the current one; neither is
restated here, because a number copied into prose is a number that silently goes
stale. Raise the budget with `--update` only once the increase is understood.

Design notes worth keeping:

- The budget stores the measured figures plus a tolerance, not bare ceilings, so
  an improvement is reported ("run `--update` to bank it") instead of silently
  becoming slack for the next regression.
- Memory is budgeted alongside the counters because the counters alone would have
  read 6.4.4 as an improvement: against the same fixture it has fewer
  instantiations than 6.4.3 while using more memory. Types and instantiations are
  bit-identical run to run; memory is the only host-sensitive figure, which is
  why the script pins the V8 heap. No metric is wall-clock, so a slower CI box
  measures the same numbers a laptop does.
- The budget records the `typescript` and `@types/react` versions it was measured
  on and warns when they differ, since a dependency bump moves every figure on
  its own.
- The fixture runs under `skipLibCheck: true`, which hides a broken `dist`: if
  the package's own declarations cannot resolve their dependencies, every export
  degrades to `any`, the fixture still compiles, and the run reports an enormous
  fake win. `canary.tsx` is the guard. Its expressions error only while the types
  are intact, which is what keeps their `@ts-expect-error` directives used; once
  the types degrade the errors stop, `tsc` emits TS2578 on the now-unused
  directives, and the clean-compile gate catches it. Verify any change to that
  file by pointing `--against` at a deliberately broken package root.
- The fixture covers the native entry too, since both entries resolve target
  props through the same types and a native-only regression is invisible to a
  web-only fixture.

`--against <package root>` measures some other copy of the package with the same
fixture, which is how a claim about being cheaper or dearer than a released
version gets settled. Install the comparison version anywhere and name its root.

## Measured constraints

### Target prop resolution

`TargetProps<R, T>` resolves a render target's props once per target. Tags go through indexed access (`React.JSX.IntrinsicElements[T]`, which already carries `ref` via `DetailedHTMLProps`); components go through `ComponentPropsWithRef`.

Don't bracket the test. An outer `T extends KnownTarget` re-check costs several times the check time, and `T & KnownTarget` cross-products two large unions. The `AnyComponent` arm doubles as the test.

Both branches are named (`IntrinsicProps`, `ComponentTargetProps`). A conditional alias loses its `aliasSymbol` the moment it resolves, so an inline branch prints its full expansion in every hover and error message.

The shape this replaced applied `ComponentPropsWithRef` per JSX call site against a ~150-member constraint. Removing it is the bulk of the consumer-cost win; ablate it before assuming any smaller item matters.

`.attrs()`'s target resolution deliberately stays on `ComponentPropsWithRef`. A function-form `.attrs(({ as }) => …)` makes that target a union, and `TargetProps` distributing inside that distribution blows past the complexity ceiling.

### `OverrideStyle` / `WithCSSVars`

Applied once per target inside `TargetProps`, never to a merged prop bag at a JSX call site. That placement is load-bearing for correctness, not only cost: built-in `Omit` is `Pick` + `Exclude`, and `keyof (X & (A | B))` sees only the union's shared keys, so widening a bag that already merged a union-typed target's props silently drops every member-specific prop. Per target, the union is still a union and distributes.

The outer `P extends unknown` is what makes the widening distribute over a union of prop shapes. Without it a component typed `ButtonProps | AnchorProps` stops accepting `href`.

The test is `'style' extends keyof P`, not `P extends { style?: infer S }`. The latter is vacuously satisfied by `{}`, which hands a `style` key to targets that expose no props at all and defeats `WidenForUntypedTarget`.

The `& {}` wrap inside `style?: CSSPropertiesWithVars | (P[keyof P & 'style'] & {}) | undefined` is a real undefined-filter under `exactOptionalPropertyTypes: true`; DO NOT remove it. Without it, both `style?:` AND `style: undefined` become assignable, which changes semantics. The explicit `| undefined` then restores `style={undefined}`.

Don't replace built-in `Omit` with `FastOmit` in `WithCSSVars`; built-in `Omit` (Pick + Exclude) is more optimized (+17% instantiations when replaced).

The widening is web-only, gated on the runtime in `ComponentTargetProps`. A native `style` takes a native style object and accepts neither web CSS nor custom properties. `src/test/types.native.tsx` pins that; the gate's absence shows up there as two unused `@ts-expect-error` directives.

### `Substitute` / `MergeProps`

`B` is unconstrained on both. Bounding it to `BaseObject` forces callers passing a still-generic target's props to intersect `& BaseObject`, and `{}` is retained rather than reduced inside an intersection, so the bound propagates an unreducible node through every prop bag downstream.

The empty-prop-bag guard is `keyof B extends never ? {} extends B ? A : …`. `keyof B extends never` alone is not enough: `keyof` a union is the keys _common_ to every member, so a union of disjoint shapes reports `never` while being a perfectly real prop bag, and the fast path drops it wholesale. `{} extends B` separates the two.

Do not instead re-ask `keyof` per member. It is more complete and it tips `tsc` into TS2589 where a caller spreads props carrying `as?: WebTarget`.

Accepted limitation: a union whose members are all-optional still takes the fast path, since `{}` is assignable to each member. Such a union accepts `{}` anyway, so the flattened declaration is equivalent and works.

`MergeProps` differs from `Substitute` by one `Exclude<keyof B, 'style'>`, which is what lets a declared `style` type constrain named fields while the target's remaining CSS still comes through. Keep it an intersection: testing `keyof A` tips past the complexity ceiling outright, and testing `keyof B` costs about half again as many types.

### `MakeAttrsOptional<P, K>`

Defined as `FastOmit<P, K> & { [Key in Extract<keyof P, K>]?: P[Key] }`; direct mapped type rather than `Partial<Pick<P, K>>`.

`Partial<Pick<P, K>>` forces TS to materialize an intermediate `Pick<P, K>` type that union-distributes across heavily-discriminated component prop types (antd `Button`, MUI), exploding past the TS complexity ceiling (TS2590). Direct mapped type avoids the intermediate. Saves ~6.5% total instantiations on the styled-components type test corpus (#5725).

### `FastOmit` patterns

- `FastOmit<A, K> & B` (intersection) is 2.4x fewer instantiations than a single mapped type with per-key conditionals
- Homomorphic mapped types (`{ [K in keyof P]: ... }`) break React JSX overload resolution
- Flattening nested `Substitute` into parallel `FastOmit`s increases instantiations; TS deduplicates nested structures better

### `NoInfer`

Use built-in `NoInfer` (TS 5.4+) internally. **Never declare a local `NoInfer<T>`
alias in the same file as types that reference it** - within a single source
file, the local declaration shadows the global lib type and references resolve
to the slower form (`[T][T extends any ? 0 : never]` deferred type instead of
the built-in marker). v7 saw a measured -3% to -5% consumer instantiations from
removing one such shadow in `types.ts`.

### `Interpolation` union

`RuleSet<Props>` aliases `Interpolation<Props>[]`, so don't list both as
separate branches inside `Interpolation<Props>` - TS doesn't always collapse
type aliases against their expansion at union dedupe time.

### Pre-resolve trivial `FastOmit` results

`FastOmit<ExecutionProps, 'as' | 'forwardedAs'>` reduces to
`{ theme?: DefaultTheme | undefined }`. That reduction is spelled out as the
`ThemedExecutionProps` interface, so the polymorphic call-props types relate
against a concrete interface instead of re-instantiating a `FastOmit` per
element type-check.

### Variance annotations

`out` / `in out` on `Styled`, `PolymorphicComponent`, `IStyledComponentBase`, etc. reduce variance computation (-72%) and memory (-16%).

### Element shorthands

`styled.div` and friends are synthesized at runtime by a `Proxy`, and their types
come from a single mapped type over `SupportedHTMLElements` asserted onto the
`styled` const. Declaring them any other way (a per-element assignment, or typing
the proxy target as the mapped type) instantiates `Styled<>` once per element.

### `KnownTarget` shape (don't re-narrow)

The `SupportedHTMLElements | AnyComponent` union looks like an obvious
target for narrowing. Don't. `ExecutionProps['as']: KnownTarget | undefined` is
load-bearing for the contextual typing of `.attrs({ as: 'label' })`: the literal
`'label'` only narrows against a union that includes `SupportedHTMLElements`. If
`KnownTarget` becomes plain `string | ComponentType<any>`, the literal widens to
`string` and downstream `ComponentPropsWithRef<Target>` resolves to the wrong
element / event types - breaking ref typing for attrs-overridden styled
components. The lib's `test/types.tsx:305-306` is the regression gate.

Localizing the literal union to an attrs-only helper type keeps the literal
narrowing but doesn't recover the win, since `Attrs<Props>` is referenced from
`IStyledStatics.attrs[]` - the literal-bearing type still propagates wherever a
styled component appears.

## Testing the type surface

Type contracts are gated in `src/test/types.tsx` (web) and `src/test/types.native.tsx` (the React Native entry), compiled by `pnpm test:types` (`tsc --noEmit -p tsconfig.test-types.json`, which includes all of `src`). No runtime, no extra deps. Keep native-only cases in the native file: both entries resolve target props through the same types, so a regression on the component arm would otherwise pass on web coverage alone. Both files are listed as knip entries, since nothing imports them.

- Negative assertions use `@ts-expect-error` on the line directly above the offending expression, each with a one-line comment stating what must fail. This is a deliberate test, not a suppression: if the type gets looser and the error stops occurring, the directive itself errors as unused, which flags the regression.
- `declare module` augmentation is project-wide: it leaks into every file in the same `tsc` program. The suite augments the declaration's own source location (`'../models/ThemeProvider'` for `DefaultTheme`, `'react'` for `CSSProp`) because the test imports from `src`, not the published package; consumers instead augment the public specifier, `declare module 'styled-components'`. If a future augmentation test needs a variant that would collide with the suite's, give it its own tsconfig project (including only that file) run as a separate `tsc` pass, rather than letting two augmentations collide in one program.
- `test:types` checks `src`, not the built `.d.ts`. A regression that only appears after the dts rollup (a dropped or mangled export) is not caught here; `pnpm --filter styled-components type-perf` compiles against the built `dist` and is the gate for that class.
