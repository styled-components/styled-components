# TypeScript Type Performance

Consumer type-check cost is budgeted in CI. `pnpm --filter styled-components type-perf` type-checks a
generated fixture against the built `dist/*.d.ts` and fails when types, instantiations or memory drift
past what `type-perf.budget.json` records. Measure there rather than against `src`, since internal
files never reach consumers. Raise the budget with `--update` only once the growth is understood.

## The budget

The budget stores the measured figures plus a tolerance rather than bare ceilings, so an improvement is
reported ("run `--update` to bank it") instead of silently becoming slack for the next regression.

Memory is budgeted alongside the counters because the counters alone would have read 6.4.4 as an
improvement: against the same fixture 6.4.4 has fewer instantiations than 6.4.3 while using more
memory. Types and instantiations are bit-identical run to run; memory is the only host-sensitive
figure, which is why the script pins the V8 heap. No metric is wall-clock, so a slower CI box measures
the same numbers a laptop does.

The budget records the `typescript` and `@types/react` versions it was measured on and warns when they
differ, since a dependency bump moves every figure on its own.

## What the fixture guards

`skipLibCheck: true` hides a broken `dist`: if the shipped declarations cannot resolve their own
dependencies, every export degrades to `any`, the fixture still compiles, and the run reports an
enormous fake win (measured: a degraded package reported 3,843 types where the healthy one reported
40,398). The fixture's `canary.tsx` is the guard, holding `@ts-expect-error` directives that error only
while the types are intact, so a degraded package turns them into TS2578 and fails the clean gate.
Verify any change to that file by pointing the fixture at a deliberately broken package.

The fixture covers the native entry too. `TargetProps` is shared by both entries, so a native-only type
regression is invisible to a web-only fixture and to `tsconfig.test-types.json`, which checks `src`
rather than what consumers resolve.

The `unionTarget` kind wraps a component whose props are a union and passes a member-specific prop at
the call site. It prices the distributive path in `OverrideStyle`, and because the run fails on any
fixture compile error it also fails outright if that union ever collapses again (#5787), making it a
correctness canary sitting inside the perf gate. Adding it moved the recorded budget on its own
(instantiations 699,924 to 850,438 at 100 components); that jump is fixture growth, not a regression. A
kind added or a weight changed here changes what the budget means, so re-measure with `--update` and
say in the commit that the fixture, not the cost, is what moved.

## Target prop resolution

`TargetProps<R, T>` (`types.ts`) must stay ONE distributive conditional over `T`. Wrapping it in an
outer `T extends KnownTarget ? … : {}` check nests two distributions over the ~153-member target union
and costs ~4x the check time; folding the KnownTarget test into the helper's own `AnyComponent` arm is
what makes it cheap. The `R` gate inside `ComponentTargetProps` is not that shape: it distributes over
`Runtime`, not over `T`.

Resolve HTML tag props by indexed access (`React.JSX.IntrinsicElements[T]`), never
`React.ComponentPropsWithRef<T>`. On @types/react 18 the latter rebuilds the whole ~265-key prop bag
through `Omit` just to strip legacy string refs; the indexed access already carries `ref` via
`DetailedHTMLProps`. This was the entire #5767 regression: `ComponentPropsWithRef` went from 496 to
59,944 types in a 100-component fixture.

Do NOT "fix" a distributive conditional by bracketing it as `[T] extends [X] ? F<T & X> : …`. The
`T & X` intersection cross-products two ~153-member unions and OOMs tsc. Bracketing is only safe when
the true branch does not need `T` narrowed.

The `.attrs()` re-resolution seam in `constructWithOptions` keeps
`React.ComponentPropsWithRef<PrivateResolvedTarget>` and must NOT be switched to `TargetProps`, even
though `TargetProps` is cheaper everywhere else. The function form
`.attrs(({ as }) => ({ as: as || 'button' }))` makes the resolved target a union, and `TargetProps` is
two conditionals, so it distributes inside the distribution that seam already performs. Measured on a
three-line repro: 6.4.2 157K instantiations, `TargetProps` 6.9M, and TS2589 (excessively deep) with one
more chained layer, a hard failure against both 6.4.2 and 6.4.4 rather than a slowdown.
`ComponentPropsWithRef` there costs ~2% instantiations on the consumer fixture and lands the same repro
at 133K, below 6.4.2. Cheaper in count but deeper in nesting is a real trade, and this one position is
where nesting wins.

## The style widening

The widening is web-only, gated on `TargetProps`' first parameter (`R extends Runtime`, deliberately
undefaulted, since a default is what would let a native call site pick web CSS up by omission). Only
`ComponentTargetProps` carries the gate: `NativeTarget` is `AnyComponent`, so the intrinsic arm is
unreachable on native. The conditional is over `Runtime`, two members and concrete at every entry
point, which is why it costs nothing measurable (+0.55% instantiations, +0.05% types, memory flat)
where a conditional over the target union costs ~4x. Before this, `styled.View` accepted `float` and
custom properties on 6.4.2 through 6.4.4 alike; both are pinned as `@ts-expect-error` in the native
contract suite. `width: '3em'` is still accepted and is NOT ours: `@types/react-native` 0.71 types
`FlexStyle['width']` as `number | string`.

It applies once per render target inside `TargetProps`, never to a merged prop bag at a JSX call site.
A target's props are shared by every component built on it, so the widening resolves once per tag
rather than once per component; the call-site form was the largest single consumer cost (measured 5.2x
the types). The cost is per component-type instantiation, not per JSX site: multiplying call sites
sixfold moves it only a few percent, so a fixture that grows sites rather than components will not show
the difference. Only the component arm (`ComponentTargetProps`) routes through the `OverrideStyle`
guard; every intrinsic element provably declares `style` (the set of `React.JSX.IntrinsicElements` keys
lacking it is `never`), so `IntrinsicProps` applies `WithCSSVars` directly rather than asking a question
with one possible answer.

Five things are load-bearing about the current shape, each found by measurement:

- The test is `'style' extends keyof P`, not `P extends { style?: infer S }`. `{}` vacuously satisfies
  the latter, which would hand every un-introspectable target a `style` key and defeat
  `WidenUntypedProps` (regresses #5756).
- It must still distribute over `P`, via the outer `P extends unknown`. `keyof` a union is the keys
  *common* to every member, so an undistributed pass widens `A | B` against the shared keys alone and
  silently drops every member-specific prop: `styled(C)` where `C` takes `ButtonProps | AnchorProps`
  stops accepting `href` (#5787). The earlier `P extends { style?: infer S }` spelling distributed for
  free because `P` was naked; moving the test to `keyof P` removed the distribution along with it,
  which is how 6.5.0 shipped the collapse. Measured cost of restoring it: +22 instantiations on the
  100-component fixture, types and memory flat.
- `Attrs<Props>` does NOT re-apply it. `Props` already carries the widened style, and re-applying it
  stops `Attrs<any>` relating to `Attrs<OuterProps>` inside `StyledComponent`/`StyledNativeComponent`.
- The explicit `| undefined` keeps `style={undefined}` assignable under `exactOptionalPropertyTypes`,
  which the call-site form allowed.
- `Substitute`'s second parameter is deliberately unbounded. Bounding it to `BaseObject` forces callers
  to write `TargetProps<R, T> & BaseObject` to satisfy it, and `{}` is retained rather than reduced
  inside an intersection, so that one bound propagates an unreducible node through every prop bag
  downstream. Measured cost of adding it back: +47K types and +73% check time on a 100-component
  fixture. Never intersect `& {}` into a type that flows into prop bags.

## The empty-prop-bag guard in Substitute and MergeProps

Both aliases short-circuit to `A` when `B` contributes nothing, which keeps `FastOmit<A, never> & {}`
out of every prop bag (`TargetProps` returns `{}` for a non-target, and `Props` defaults to
`BaseObject`). The test cannot be `keyof B extends never` alone: `keyof` a union is the keys common to
every member, so a union of disjoint shapes reports `never` while being a real prop bag, and the fast
path dropped it wholesale. `styled.div<{ a: string } | { b: number }>` rejected both `a` and `b`, as did
`as` pointing at such a component. This predates 6.5.0 and is a different mechanism from the
`OverrideStyle` collapse above, which is why the `ButtonProps | AnchorProps` cases cannot catch it:
those members share most of their keys, so `keyof` is never `never` and the guard is never consulted.

The guard is now `keyof B extends never ? ({} extends B ? A : Substituted<A, B>) : Substituted<A, B>`.
`{}` is assignable to an empty bag and not to a union whose members each require a key, which separates
the two states. The taken branch needs no distribution of its own, since `FastOmit<A, never> & B` is an
intersection and an intersection over a union distributes already. Measured: +0.04% instantiations,
memory flat.

Do NOT replace that test with a per-member re-ask (`B extends unknown ?` nested inside the guard). It is
the more complete fix and it was measured as fatal: it tips tsc into TS2589 against a caller that
spreads props carrying `as?: WebTarget`, because the added distribution nests inside the one the
polymorphic call signature already performs over that ~153-member union. The `#4112` case in the
contract suite is what fails.

Accepted limitation, pinned in the contract suite: a disjoint union whose members are all-optional still
collapses, because `{}` is assignable to every member. Such a union accepts `{}` regardless, so the
flattened all-optional object is equivalent and works.

Rejected alternative, do not re-explore: intersecting instead of omitting inside `OverrideStyle`
(`P & { style?: … }`). It measured -33% types and -22% check time but is strictly worse than widening
at the source, and it breaks a component's own narrow `style` type by narrowing rather than replacing
it.

## Declared style props

A declared `style` merges rather than replaces, and the merge is an intersection, not a conditional:
`MergeProps` simply does not omit `style` from the target, so `CSSPropertiesWithVars & { width: number }`
narrows one field and keeps the rest. Both conditional spellings were measured and rejected. Testing
`keyof A` tips tsc into TS2590 outright, and testing `keyof B` costs +54% types because it stays
deferred while `B` is generic and the checker materializes both branches. `never` ablates a field and
`CustomStyle` ablates everything unnamed, so full override stays expressible without making it the
default.

`PolymorphicComponentProps` merges rather than substitutes the `as`/`forwardedAs` target's props over
`BaseProps`, so a declared `style` constraint is not escapable by rendering the same component through
a different tag. Measured on the consumer fixture: +0.016% types, +0.48% instantiations, memory
unchanged. This is the one place a per-JSX-site cost was accepted, and it was accepted only because it
buys a contract `CustomStyle` otherwise states falsely.

Known limitation, characterized in the contract suite: under `exactOptionalPropertyTypes`, a component
declaring its own `style` rejects an explicit `style={undefined}`, because intersecting the declared
type leaves no `undefined` arm. Omitting the prop is unaffected and `style?: X | undefined` restores it.
Do not "fix" this by reintroducing a conditional in `MergeProps`; that shape measured +54% types.
Accepted and documented in the changeset instead.

## Standing limitations

`CSSProp`'s recursion through `RuleSet` is load-bearing and must not be flattened to "fix" #3496
(`css?: CSSProp` plus react-spring's recursive `animated` types tips TS2589). Ablated against the real
packages: react-spring alone is fine and `css?: string` is fine, so the depth is ours, but every
shallower `CSSProp` that fixes it also stops `css={cssHelperOutput}` being assignable, which is the
primary use of the prop. It reproduces identically on 6.4.2 and 6.4.4, so it is a standing limitation
rather than a regression.

## Permissiveness for un-introspectable targets

Permissiveness is decided from the TARGET's props, not from the finished prop bag. `WidenUntypedProps`
asks whether the merged bag is empty, which stops being true as soon as a component adds a transient
prop, so `styled(PolymorphicTarget)<{ $variant: string }>` silently lost the permissiveness and started
rejecting `children` (#5756, on 6.4.2 and 6.4.4 alike). `WidenForUntypedTarget` tests `Target` instead.
Applying it over an already-widened bag is a no-op, since the index signature makes `keyof` be `string`.

## Attribution discipline

When a cost cliff appears after several changes land together, ablate to the cause before attributing
it. The TS2589 above was blamed in turn on the `Exclude` inside `MergeProps` and on `MergeProps`
itself; making `MergeProps` byte-identical to `Substitute` still reproduced it, which is what pointed at
the `.attrs()` seam. A fix that makes the symptom go away is not evidence about the cause, and a comment
recording the wrong cause outlives the session that guessed it.

## Type-level idioms

Use built-in `NoInfer` (TS 5.4+) internally. Never declare a local `NoInfer` alias in a file that also
uses it: the local declaration shadows the intrinsic within that module and silently downgrades every
reference to the slower deferred form. A re-export (`export type { NoInfer } from './utils/noInfer'`)
introduces no local binding and is safe. Do NOT probe which form is in play by testing whether inference
is blocked, since the deferred form blocks identically and both the test and its negative control pass.
The only instrument that separates them is resolving the identifier through the compiler API and reading
which file the symbol lands in (`lib.es5.d.ts` means the intrinsic).

Keep a conditional type's branches as named top-level aliases (`WithCSSVars`, `IntrinsicProps`,
`ComponentTargetProps`, `Substituted`). A conditional alias loses its name the moment it resolves,
because the checker returns the branch type and drops the `aliasSymbol`, so an inlined branch prints its
whole expansion in every hover and error. Naming the branches took a styled component's displayed type
from roughly 380 characters to 95 at no measurable cost. Do not inline them back for tidiness; the
tidiness is the point.

Do NOT reach for the popular `Prettify<T> = { [K in keyof T]: T[K] } & {}` to clean up a displayed type
here. It is a homomorphic mapped type (which breaks JSX overload resolution) ending in the `& {}` that
never reduces. It is fine on a leaf type a user hovers, and poison on anything that flows into prop bags.

Further measured results:

- `FastOmit<A, K> & B` (intersection) is 2.4x fewer instantiations than a single mapped type with
  per-key conditionals.
- Homomorphic mapped types (`{ [K in keyof P]: ... }`) break React JSX overload resolution.
- Flattening nested `Substitute` into parallel `FastOmit`s increases instantiations, because TS
  deduplicates nested structures better.
- Do not replace built-in `Omit` with `FastOmit` in `OverrideStyle`. Built-in `Omit` (Pick + Exclude) is
  more optimized, measuring +17% instantiations when replaced.
- Variance annotations (`out`/`in out`) on `Styled`, `PolymorphicComponent`, `IStyledComponentBase` and
  friends reduce variance computation (-72%) and memory (-16%).
- `domElements.forEach` uses a `(styled as any)` cast. The types are already declared via a mapped type
  on the `styled` const, which avoids one redundant `Styled<>` instantiation per element in
  `domElements`.

## Profiling

`tsc --noEmit` cannot see editor behavior. A change to the polymorphic call signature must also be
checked by driving a real tsserver at a half-typed JSX attribute (`<Comp as="video" l|>` must still
offer `loop`). Always include a positive control in that probe: a caret that lands wrong returns zero
completions, which reads identically to a genuine regression.

- `~/.claude/tools/tsc-perf.sh measure tsconfig.test-types.json`, or
  `npx tsc --noEmit --extendedDiagnostics --project tsconfig.test-types.json`. Delete `tsbuildinfo`
  first for a clean measurement.
- `npx @typescript/analyze-trace /tmp/tsc-perf-trace` detects hot spots and duplicate packages.
