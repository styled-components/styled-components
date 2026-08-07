---
'styled-components': minor
---

styled-components does no work in a passive or layout effect on its render path.

This is a correctness and predictability guarantee rather than a speed one. Where the library needs a lifecycle hook it uses the narrowest thing that fits: a ref callback for teardown that needs a committed host, `useSyncExternalStore` for external mutable state, and `useInsertionEffect` for stylesheet writes.

On React Native several teardowns now run before paint instead of after, so a sibling reading a scroll-snap or anchor registry never paints a frame against a stale entry. The render-count effect is small and was measured rather than assumed: `position: sticky` elements render once per layout change instead of twice. Scrolling itself is unchanged, and no timing benchmark was run.

On React Native, `anchor-name` and `scroll-snap-align` now require the styled target to forward its `ref`, because the library registers and deregisters through a ref callback. `styled.View` and every other host target already do. `styled(YourComponent)` needs `YourComponent` to pass `ref` down to the host element it renders; if it does not, the declaration is inert and says so in development rather than stranding an entry nothing can remove.

Three carve-outs remain, each documented at its site, so this is a guarantee about the library's own render path rather than an absolute: the `position: sticky` overlay publish and its paired deregistration, the reanimated `@starting-style` two-pass flip, and the default Animated adapter's unmount teardown, which is on the path of every animated native component.
