# Animation adapters

The v7 native engine has a pluggable animation contract (`src/native/animation/types.ts`). Two adapters share it; only one is active per running app.

| Adapter    | Module                           | Active when                                        |
| ---------- | -------------------------------- | -------------------------------------------------- |
| Animated   | `src/native/animation/index.ts`  | Hermes target, by default                          |
| Reanimated | `src/native/reanimated/index.ts` | User imports `styled-components/native/reanimated` |

The Animated adapter registers itself when the native engine loads. Importing the reanimated subpath registers the reanimated adapter, replacing the default.

The rn-web bundle has no animation adapter. Its entry (`src/native/web-bridge/index.tsx`) builds on the web styling pipeline and never imports the native engine, so `animation*`, `transition*`, and `@keyframes` reach the browser as real CSS and the browser runs them with full spec semantics. `treeshake.test.ts` locks the engine out of that bundle.

## Reanimated 4 CSS-layer adapter

Reanimated 4 routes `animation*` / `transition*` style keys through native CSS managers (`src/css/native/managers/CSSManager.ts` upstream). Its prop filter only forwards animations when every `animationName` is a keyframes object or a `CSSKeyframesRule` (`src/css/utils/props.ts`); string names never reach the animation manager. Our adapter therefore converts `compiled.keyframes` plus the active `ResolveEnv` into that object shape (including per-keyframe `animationTimingFunction` when the compile snapshot carries easing). Upstream `ANIMATION_PROPS` does not include `animation-composition` yet, so we do not emit `animationComposition` on this path. Durations and delays are plain millisecond numbers, which match Reanimated's `TimeUnit` normalization (numeric values are treated as ms).

When `prefers-reduced-motion` is on in the adapter `ResolveEnv`, animation and transition durations and delays are forced to zero on this path so motion snaps, mirroring the Hermes adapter's collapse behavior.

`@starting-style` together with `transition` uses a two-frame handoff: the first commit overlays the resolved starting snapshot onto the flat style while transition longhands are present; a `requestAnimationFrame` tick then drops that overlay so Reanimated's transition manager observes a property change into the settled base.

`onAnimationEnd` / `onTransitionEnd` are not fired on this path yet: Reanimated's CSS managers do not surface completion callbacks to JS (see upstream discussion). The Hermes adapter honors these props.

## Spec coverage (Hermes Animated adapter)

CSS Animations L1+L2, Transitions L1+L2, Easing L1+L2.

### Covered

- **Reversing-shortening-factor** ([CSS Transitions](https://drafts.csswg.org/css-transitions-1/)): applies when the new target equals the previous transition's starting value; retargeted transitions (different third value) use the full duration.
- **animation-fill-mode**: `none`, `forwards`, `backwards`, `both` per [CSS Animations](https://drafts.csswg.org/css-animations-1/). Overrides honored around the delay window and after end.
- **animation-play-state pause / resume**: pause captures linear progress + wall-clock iteration index; resume continues from the captured iteration. Spec-faithful across single iteration, multi-iteration (forward or reverse, integer or `infinite`), and alternate / alternate-reverse (finite or `infinite`). The descriptor pipeline reads play-state from the same dict as every other animation longhand, so a prop-driven interpolation (`animation-play-state: ${p => p.paused ? 'paused' : 'running'}`) drives the pause/resume cycle without parser-side changes.
- **Reverse-direction multi-iteration loops**: `Animated.loop` resets the underlying AnimatedValue to its construction-time starting value (0) between iterations, which leaves a naive reverse loop animating 0→0 from iteration 2 onward. The adapter wraps each looped iteration in a duration-0 `snap-to-1` prefix so reverse / `alternate-reverse` loops run correctly across any iteration count.
- **animation-composition: add / accumulate**: additive composition ([CSS Animations 2](https://drafts.csswg.org/css-animations-2/) with [CSS Values 4](https://drafts.csswg.org/css-values-4/) value combination) combines the base value with each explicit keyframe value. `add` and `accumulate` are spec-distinguished only for list-valued properties (addition extends the list; accumulation pads and adds componentwise). For everything the adapter currently animates (numbers, lengths/angles/percentages, colors via componentwise sum in oklab with gamut clamp, and per-kind transform components where translate / scale / rotate combine kind-by-kind and absent kinds contribute identity), the two operations are identical and flow through the same combiner. Synthetic offset 0 / 1 endpoints stay base-only so the underlying value remains visible where no explicit keyframe value is given.
- **animation-iteration-count**: integer, fractional, `infinite`.
- **animation-direction**: `normal`, `reverse`, `alternate`, `alternate-reverse`.
- **transition-behavior: allow-discrete**: 50% flip for non-interpolable property pairs with cancellation on retarget.
- **@starting-style**: first-mount value override + transition-into-base on update.
- **onAnimationEnd / onTransitionEnd**: spec-shaped `{ animationName | propertyName, elapsedTime }` events fired on completion (suppressed for canceled / superseded timings per spec). `elapsedTime` is in seconds. For an animation it is the active duration (duration times the iteration count) and does not include `animation-delay`. For a transition it is the transition duration and does not include `transition-delay`.
- **Per-keyframe color interpolation**: full CSS `<color>` grammar: hex (3/4/6/8), `rgb()`/`rgba()`, named keywords via React Native's `processColor`, `hsl()`/`hwb()`, and modern function forms (`oklch`, `oklab`, `lab`, `lch`, `color-mix`) via the shared color-math polyfill. Genuinely discrete pairs (`display`, `visibility`) still snap at 50% per spec.
- **Color interpolation space**: interpolates in oklab (the [CSS Color 4](https://drafts.csswg.org/css-color-4/) default interpolation space) rather than linear-light sRGB. The conversion pair is hoisted out of the per-sample loop so the inner is a Lab lerp plus one matrix multiply.
- **Per-keyframe easing**: same-unit numeric values ride per-frame easing; the segmented interpolation samples easing curves so `cubic-bezier(...)` keyframes don't degrade to linear under the native driver.
- **Easing functions**: `linear`, `cubic-bezier(...)`, `steps(n, jump-type)`, multi-stop `linear(...)` with explicit positions.

### Animated string-interpolation constraints (RN 0.85)

`Animated` interpolates a string `outputRange` by extracting numeric runs from each entry and interpolating each position independently, so every entry must carry the same number of numeric tokens. Hex colors break that invariant (hex letters split digit runs unevenly), which is why the adapter converts every color to a fixed-arity form before building an interpolation. A string pair that does not share a template, or a one-shot prop such as `experimental_backgroundImage` (its native gradient parser reads only the first commit), cannot morph through `Animated`; cross-fade stacked layers on `opacity` instead.

### Scroll-driven timelines

- **`animation-timeline: scroll()` + named scroll timelines + `animation-range`**: progress comes from the scroller's offset instead of the timing engine; iteration count, direction, and attachment ranges remap onto a segmented interpolation over the finite range. Styled scroll containers publish offset/extent through `ScrollTimelineContext`. Each entry carries TWO offset value pairs: a UI-thread pair mapped via `Animated.attachNativeEvent` that drives native-driver-eligible keyframes (opacity, transforms) in lockstep with the finger, and a JS pair fed from the JS scroll handler for everything else (width, colors); a single shared pair would either tag layout-prop interpolations native (hard error) or leave UI-thread consumers lagging. The JS handler echoes offsets into both pairs so the native pair stays readable before attachment.
- **`animation-timeline: view()`**: the subject's onLayout places its visibility range within the scroller; the named view ranges (`cover`, `contain`, `entry`, `exit`, `entry-crossing`, `exit-crossing`, `scroll`) resolve through the same boundary resolver as `animation-range`. Subjects must be direct children of the scroll container (onLayout coordinates are parent-relative).

### Gaps

- **`scroll(root)` / `scroll(self)`**: no document viewport scroller on RN; self-referencing scrollers aren't wired. Inactive with a dev warning.
- **Named view timelines (`view-timeline-*`) and `view-timeline-inset`**: not implemented; a declared inset warns and the visibility range stays the scrollport.
- **Scroll-driven fill-mode**: progress clamps at the attachment-range edges, so edge frames hold (the `both` behavior) regardless of the declared fill-mode.
- **Infinite iteration count under a scroll timeline**: inactive with a dev warning.
- **Reanimated adapter**: its CSS layer is time-based; any `animation-timeline` animation warns and is skipped there.

## rn-web

None of the gaps above apply on rn-web, where the browser runs the CSS itself. `onAnimationEnd` and `onTransitionEnd` fire on styled primitives whose ref is the DOM element, including `View` and `Text`, and on `FlatList`, `SectionList`, and `VirtualizedList`. They do not fire on `KeyboardAvoidingView`, whose ref is the component instance; put the callback on a styled `View` inside it. The payload is `{ animationName, elapsedTime }` or `{ propertyName, elapsedTime }`. `propertyName` is the camelCase style key, so `background-color` is reported as `backgroundColor`. `elapsedTime` is in seconds and does not include `animation-delay` or `transition-delay`, matching the Hermes adapter. A completion that bubbles from a descendant does not call an ancestor's callback, a completion on a pseudo-element does not call it, and `animationcancel` / `transitioncancel` do not call these props.

react-native-web primitives forward only an allowlist of props to the DOM element (`react-native-web/dist/modules/forwardedProps`). Those two callbacks are not on it, so the bridge listens for `animationend` and `transitionend` on the host node.

Test coverage: `src/native/animation/test/animated-adapter.test.tsx` (Hermes), `src/native/animation/test/reanimated-adapter.test.ts` (Reanimated), `src/native/animation/test/smoke.test.ts` (compile-time descriptor surface), `src/test/web-bridge.test.tsx` (rn-web completion callbacks).
