import React from 'react';
import type { Ref } from 'react';

/** Brand marking a ref this module produced, so a hook composing onto
 *  another hook's ref can tell it apart from a caller's. */
const COMPOSED = Symbol.for('sc.composedRef');

/** A ref callback built by {@link useComposedRef}. Always returns a
 *  teardown, so React never takes the legacy null-call path on it. */
export type ComposedRef<T> = ((node: T | null) => () => void) & { [COMPOSED]: true };

function isComposedRef<T>(ref: Ref<T> | undefined): ref is ComposedRef<T> {
  return typeof ref === 'function' && COMPOSED in ref;
}

/** Assign to an object ref or invoke a callback ref, returning whatever a
 *  callback ref handed back so React 19 cleanup semantics carry through. */
function applyRef<T>(ref: Ref<T> | undefined, node: T | null): unknown {
  if (typeof ref === 'function') return ref(node);
  if (ref !== null && ref !== undefined) {
    // React types `RefObject.current` as T even though React itself writes
    // null on detach. Scoped to the one property rather than the ref.
    (ref as { current: T | null }).current = node;
  }
  return undefined;
}

/**
 * Compose a library teardown onto the ref of an element that already has
 * one, whether from the caller or from another styled-components hook.
 *
 * This is how a hook that decorates props gets an unmount hook without an
 * effect: React 19 runs a ref callback's returned function on unmount and
 * on ref-identity change, and unlike `useInsertionEffect` a ref callback
 * may schedule state updates and sees the committed host instance.
 *
 * Returning a cleanup opts the whole composed ref out of React's legacy
 * null-call path, so the incoming ref is detached here instead: a
 * callback ref that returned its own cleanup gets that cleanup called,
 * and anything else is cleared with `null`.
 *
 * `keys` are the values whose change must re-arm the teardown: React
 * re-runs a ref callback whose identity changed, cleanup first, so a key
 * change detaches and reattaches. Pass `[]` where the teardown is
 * unmount-only, and the value that must re-arm otherwise, such as an
 * anchor name that has to release the old name before publishing the new
 * one. `attach` may close over anything, keys or not: it is read at
 * attach time rather than captured. `keys` is spread into a dependency
 * array, so a call site must pass a literal of constant length, the same
 * rule any dependency array carries.
 *
 * A caller's ref is never a key. It is read from a box at attach time,
 * because a caller writing an inline arrow (`ref={el => …}`) hands over a
 * new identity every render, which is ordinary React and the caller's own
 * business. Keying the library's teardown on it would tear the library
 * down every render too, and for a teardown that can only re-arm from the
 * next layout event, a re-render produces none: the registration would be
 * gone for good. The consequence of the box, and the reason it is the
 * right trade, is that a caller's ref is invoked on attach and detach
 * rather than on every render, and swapping to a genuinely different ref
 * between renders is not seen until the next attach. Detach releases the
 * exact ref it attached rather than whatever the box holds by then.
 *
 * A ref from another one of these hooks gets the opposite treatment: it
 * IS a key. These hooks nest, each wrapping the props the last one
 * returned, and React only ever sees the outermost identity. An inner
 * layer whose ref re-keys behind a frozen outer one would otherwise never
 * be re-invoked at all: its teardown would not run and its new setup
 * would not arm, silently. Keying on it propagates the re-arm outward.
 * Its identity is already memoized by the hook that produced it, so this
 * costs nothing on an ordinary render.
 */
export function useComposedRef<T>(
  attach: (node: T | null) => () => void,
  incoming: Ref<T> | undefined,
  keys: unknown[]
): ComposedRef<T> {
  const box = React.useRef<Ref<T> | undefined>(undefined);
  box.current = incoming;
  // `attach` is boxed too, so the memoized closure captures two refs and
  // nothing else. Capturing `attach` directly would pin the whole hook
  // activation that produced it -- including the caller's handlers from
  // that render -- for as long as the memo lives, which for a frozen ref
  // is the component's lifetime. Reading it at attach time also means an
  // attach always runs the committing render's version rather than the
  // one the memo happened to be built from.
  const attachBox = React.useRef(attach);
  attachBox.current = attach;
  const chain = isComposedRef(incoming) ? incoming : null;
  // `incoming` is deliberately absent from the dependencies: it reaches
  // the composed ref through the box, except when it is one of ours, in
  // which case `chain` carries it. See the note above.
  return React.useMemo(() => {
    const composed = (node: T | null) => {
      // Both captured, not re-read in the cleanup: detach must undo the
      // exact attach that ran and release the exact ref it took, even if
      // the caller has swapped either since.
      const detach = attachBox.current(node);
      const user = box.current;
      const userCleanup = applyRef(user, node);
      return () => {
        if (typeof userCleanup === 'function') userCleanup();
        else applyRef(user, null);
        detach();
      };
    };
    return Object.assign(composed, { [COMPOSED]: true as const });
  }, [chain, ...keys]);
}
