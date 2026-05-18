# Animation adapters

The v7 native engine has a pluggable animation contract (`src/native/animation/types.ts`). Three adapters share it; only one is active per running app.

| Adapter    | Module                               | Active when                                        |
| ---------- | ------------------------------------ | -------------------------------------------------- |
| Animated   | `src/native/animation/index.ts`      | Hermes target (`__NATIVE_WEB__ === false`)         |
| CSS-emit   | `src/native/animation/cssAdapter.ts` | rn-web target (`__NATIVE_WEB__ === true`)          |
| Reanimated | `src/native/reanimated/index.ts`     | User imports `styled-components/native/reanimated` |

The default Hermes adapter and the rn-web cssAdapter each gate their `setAnimationAdapter` call on `__NATIVE_WEB__`, so rollup tree-shakes the inactive one. Importing the reanimated subpath registers the reanimated adapter, replacing whichever default ran first.

## Reanimated 4 CSS-layer adapter

Reanimated 4 routes `animation*` / `transition*` style keys through native CSS managers (`src/css/native/managers/CSSManager.ts` upstream). Its prop filter only forwards animations when every `animationName` is a keyframes object or a `CSSKeyframesRule` (`src/css/utils/props.ts`); string names never reach the animation manager. Our adapter therefore converts `compiled.keyframes` plus the active `ResolveEnv` into that object shape (including per-keyframe `animationTimingFunction` when the compile snapshot carries easing). Upstream `ANIMATION_PROPS` does not include `animation-composition` yet, so we do not emit `animationComposition` on this path. Durations and delays are plain millisecond numbers, which match Reanimated's `TimeUnit` normalization (numeric values are treated as ms).

When `prefers-reduced-motion` is on in the adapter `ResolveEnv`, animation and transition durations and delays are forced to zero on this path so motion snaps, mirroring the Hermes adapter's collapse behavior.

`@starting-style` together with `transition` uses a two-frame handoff: the first commit overlays the resolved starting snapshot onto the flat style while transition longhands are present; a `requestAnimationFrame` tick then drops that overlay so Reanimated's transition manager observes a property change into the settled base.

`onAnimationEnd` / `onTransitionEnd` are not fired on this path yet: Reanimated's CSS managers do not surface completion callbacks to JS (see upstream discussion). The Hermes and rn-web adapters continue to honor these props.

## Spec coverage (Hermes Animated adapter)

CSS Animations L1+L2, Transitions L1+L2, Easing L1+L2.

### Covered

- **Reversing-shortening-factor** (Transitions §3.1): applies when the new target equals the previous transition's starting value; retargeted transitions (different third value) use the full duration.
- **animation-fill-mode**: `none`, `forwards`, `backwards`, `both` per §4.8. Overrides honored around the delay window and after end.
- **animation-play-state pause / resume**: pause captures linear progress + wall-clock iteration index; resume continues from the captured iteration. Spec-faithful across single iteration, multi-iteration (forward or reverse, integer or `infinite`), and alternate / alternate-reverse (finite or `infinite`). The descriptor pipeline reads play-state from the same dict as every other animation longhand, so a prop-driven interpolation (`animation-play-state: ${p => p.paused ? 'paused' : 'running'}`) drives the pause/resume cycle without parser-side changes.
- **Reverse-direction multi-iteration loops**: `Animated.loop` resets the underlying AnimatedValue to its construction-time starting value (0) between iterations, which leaves a naive reverse loop animating 0→0 from iteration 2 onward. The adapter wraps each looped iteration in a duration-0 `snap-to-1` prefix so reverse / `alternate-reverse` loops run correctly across any iteration count.
- **animation-composition: add / accumulate**: additive composition (CSS Animations L2 §4.3.2 + CSS Values 4 §6.1) combines the base value with each explicit keyframe value. `add` and `accumulate` are spec-distinguished only for list-valued properties (addition extends the list; accumulation pads and adds componentwise). For everything the adapter currently animates (numbers, lengths/angles/percentages, colors via componentwise sum in oklab with gamut clamp, and per-kind transform components where translate / scale / rotate combine kind-by-kind and absent kinds contribute identity), the two operations are identical and flow through the same combiner. Synthetic offset 0 / 1 endpoints stay base-only so the underlying value remains visible where no explicit keyframe value is given.
- **animation-iteration-count**: integer, fractional, `infinite`.
- **animation-direction**: `normal`, `reverse`, `alternate`, `alternate-reverse`.
- **transition-behavior: allow-discrete**: 50% flip for non-interpolable property pairs with cancellation on retarget.
- **@starting-style**: first-mount value override + transition-into-base on update.
- **onAnimationEnd / onTransitionEnd**: spec-shaped `{ animationName | propertyName, elapsedTime }` events fired on completion (suppressed for canceled / superseded timings per spec).
- **Per-keyframe color interpolation**: full CSS `<color>` grammar: hex (3/4/6/8), `rgb()`/`rgba()`, named keywords via `@react-native/normalize-colors`, `hsl()`/`hwb()`, and modern function forms (`oklch`, `oklab`, `lab`, `lch`, `color-mix`) via the shared color-math polyfill. Genuinely discrete pairs (`display`, `visibility`) still snap at 50% per spec.
- **Color interpolation space**: interpolates in oklab (CSS Color L4 §13 default) rather than linear-light sRGB. The conversion pair is hoisted out of the per-sample loop so the inner is a Lab lerp plus one matrix multiply.
- **Per-keyframe easing**: same-unit numeric values ride per-frame easing; the segmented interpolation samples easing curves so `cubic-bezier(...)` keyframes don't degrade to linear under the native driver.
- **Easing functions**: `linear`, `cubic-bezier(...)`, `steps(n, jump-type)`, multi-stop `linear(...)` with explicit positions.

### Gaps

- **`animation-range` / `animation-timeline`**: no scroll-timeline primitive on the UI thread; the host can't surface scroll position to JS at a rate the Animated bridge can consume without dropping frames.

## Spec coverage (rn-web CSS-emit adapter)

The browser implements the full CSS spec natively. The cssAdapter emits longhand properties (`transition-*`, `animation-*`) onto the style object and injects `@keyframes` rules into a managed `<style data-sc-anim>` tag. Sentinel-bearing keyframes hash by resolved body so theme changes produce a new `@keyframes` body under a unique name, leaving in-flight animations on the previous body intact.

When any parallel effect uses `animation-composition: add` or `accumulate`, the adapter also sets `animationComposition` as a comma-separated list aligned with `animation-name` (omitted when every effect stays at the initial `replace`, mirroring how `transition-behavior` is only emitted when `allow-discrete` appears).

All gaps above are absent on rn-web; the browser composites animations on its own pipeline with full spec semantics.

## Why two adapters

The Animated bridge is the only animation primitive available on Hermes, so we have to approximate spec behavior in JS. On rn-web the browser is right there, so routing CSS animations through it is _more_ spec-correct than emulating with `Animated.timing`. The compile-time gate keeps each bundle minimal: the Hermes bundle tree-shakes the cssAdapter's DOM access; the rn-web bundle tree-shakes the Animated bridge's JS interpolation.

Test coverage: `src/native/animation/test/animated-adapter.test.tsx` (Hermes), `src/native/animation/test/css-adapter.test.tsx` (rn-web), `src/native/animation/test/smoke.test.ts` (compile-time descriptor surface).
