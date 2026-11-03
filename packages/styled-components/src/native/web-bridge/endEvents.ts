import React from 'react';
import type { Ref } from 'react';
import type { NativeAnimationEvent, NativeTransitionEvent } from '../animation/types';
import { camelize } from '../transform';
import { IS_RSC } from '../../utils/isRsc';
import { warnOnce } from '../../utils/warnOnce';

type AnimationEndHandler = (event: NativeAnimationEvent) => void;
type TransitionEndHandler = (event: NativeTransitionEvent) => void;

type EndSlot = {
  composed: ((node: unknown) => void | (() => void)) | null;
  detach: () => void;
  incoming: Ref<unknown> | undefined;
  onAnimationEnd: AnimationEndHandler | undefined;
  onTransitionEnd: TransitionEndHandler | undefined;
};

const END_HOST_WARNING =
  "onAnimationEnd and onTransitionEnd did not run because this component's ref is not the element the CSS is on. Move the callback to a styled View or Text. FlatList, SectionList, and VirtualizedList do run it. KeyboardAvoidingView does not, so put the callback on a styled View inside it.";

function noop(): void {}

function asHandler<T>(value: unknown): T | undefined {
  return typeof value === 'function' ? (value as T) : undefined;
}

function isListenable(node: unknown): node is EventTarget {
  return (
    typeof node === 'object' &&
    node !== null &&
    typeof (node as { addEventListener?: unknown }).addEventListener === 'function' &&
    typeof (node as { removeEventListener?: unknown }).removeEventListener === 'function'
  );
}

function scrollableNode(node: object): unknown {
  const inst = node as { getScrollableNode?: () => unknown };
  if (typeof inst.getScrollableNode !== 'function') return null;
  return inst.getScrollableNode();
}

/**
 * `FlatList`, `SectionList`, and `VirtualizedList` expose the class
 * instance as their ref. The CSS lands on the scrollable host, which
 * those instances return from `getScrollableNode`.
 */
function resolveListenable(node: unknown): EventTarget | null {
  if (isListenable(node)) return node;
  if (typeof node !== 'object' || node === null) return null;
  const first = scrollableNode(node);
  if (isListenable(first)) return first;
  if (typeof first === 'object' && first !== null) {
    const second = scrollableNode(first);
    if (isListenable(second)) return second;
  }
  return null;
}

function elapsedSeconds(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function isPseudoElementEvent(event: Event): boolean {
  const pseudo = (event as AnimationEvent).pseudoElement;
  return typeof pseudo === 'string' && pseudo !== '';
}

function animationPayload(event: Event): NativeAnimationEvent {
  const source = event as AnimationEvent;
  return {
    animationName: typeof source.animationName === 'string' ? source.animationName : '',
    elapsedTime: elapsedSeconds(source.elapsedTime),
  };
}

function transitionPayload(event: Event): NativeTransitionEvent {
  const source = event as TransitionEvent;
  const propertyName = typeof source.propertyName === 'string' ? source.propertyName : '';
  return {
    elapsedTime: elapsedSeconds(source.elapsedTime),
    propertyName: camelize(propertyName),
  };
}

function applyIncoming(ref: Ref<unknown> | undefined, node: unknown): void {
  if (typeof ref === 'function') {
    ref(node);
    return;
  }
  if (ref !== null && ref !== undefined) {
    (ref as { current: unknown }).current = node;
  }
}

/**
 * Listen for `animationend` and `transitionend` on the host node and
 * call the matching props.
 *
 * react-native-web forwards an allowlist of DOM props, and these two
 * are not on it, so handing them to the primitive drops them. The
 * browser still runs the CSS. The payload is `{ animationName, elapsedTime }`
 * or `{ propertyName, elapsedTime }`, with `propertyName` camelCased to
 * the runtime style key. A bubbled event whose target is a descendant
 * is ignored, and so is a pseudo-element completion: the payload has no
 * field that would tell it from the element's own.
 *
 * With no callback the caller ref is returned unchanged. An inline ref
 * keeps the re-invoke behavior of the primitive's own ref, and the hook
 * is a single `useRef` with nothing else allocated on that path.
 *
 * With a callback, the returned ref is built here rather than with
 * `useComposedRef`. That helper deliberately does not key on the caller
 * ref, and react-native-web's `useMergeRefs` only re-runs when the ref
 * it receives changes, so a stable wrapper would drop a swapped or
 * newly added ref. The identity therefore follows the caller ref and
 * the callbacks. The callbacks are the ones closed over when the ref
 * attached, which is the committed render: a render React discards
 * never becomes the listener.
 *
 * react-native-web merges refs in `useMergeRefs` and drops the callback's
 * return value, then clears with `null`. The remover is stored so that
 * null path still detaches. The returned cleanup covers a host that
 * honors a ref callback's return value, such as a class-instance ref.
 *
 * On the server and in a server component there is no host to listen
 * on, so the caller ref is returned and no hook runs.
 */
export function useEndEventRef(
  onAnimationEnd: unknown,
  onTransitionEnd: unknown,
  incoming: Ref<unknown> | undefined
): Ref<unknown> | undefined {
  if (__SERVER__ || IS_RSC) return incoming;

  // biome-ignore lint/correctness/useHookAtTopLevel: __SERVER__ is a build-time constant and IS_RSC is a load-time constant, so this branch is fixed for the whole bundle rather than varying per render
  const slotRef = React.useRef<EndSlot | null>(null);

  const animHandler = asHandler<AnimationEndHandler>(onAnimationEnd);
  const transHandler = asHandler<TransitionEndHandler>(onTransitionEnd);
  if (animHandler === undefined && transHandler === undefined) {
    const idle = slotRef.current;
    if (idle !== null) {
      idle.composed = null;
      idle.incoming = undefined;
      idle.onAnimationEnd = undefined;
      idle.onTransitionEnd = undefined;
    }
    return incoming;
  }

  let slot = slotRef.current;
  if (slot === null) {
    slot = {
      composed: null,
      detach: noop,
      incoming,
      onAnimationEnd: animHandler,
      onTransitionEnd: transHandler,
    };
    slotRef.current = slot;
  } else if (
    slot.composed !== null &&
    slot.incoming === incoming &&
    slot.onAnimationEnd === animHandler &&
    slot.onTransitionEnd === transHandler
  ) {
    return slot.composed;
  }

  const capturedAnim = animHandler;
  const capturedTrans = transHandler;
  const capturedIncoming = incoming;
  const composed = (node: unknown): void | (() => void) => {
    const detach = slot.detach;
    slot.detach = noop;
    detach();

    if (node == null) {
      applyIncoming(capturedIncoming, null);
      return;
    }

    applyIncoming(capturedIncoming, node);
    const target = resolveListenable(node);
    if (target === null) {
      if (__DEV__) warnOnce('rn-web-end-event-host', END_HOST_WARNING);
      return () => {
        applyIncoming(capturedIncoming, null);
      };
    }

    const onAnim = (event: Event) => {
      if (event.target !== target || isPseudoElementEvent(event)) return;
      if (capturedAnim === undefined) return;
      capturedAnim(animationPayload(event));
    };
    const onTrans = (event: Event) => {
      if (event.target !== target || isPseudoElementEvent(event)) return;
      if (capturedTrans === undefined) return;
      capturedTrans(transitionPayload(event));
    };
    target.addEventListener('animationend', onAnim);
    target.addEventListener('transitionend', onTrans);
    const remove = () => {
      target.removeEventListener('animationend', onAnim);
      target.removeEventListener('transitionend', onTrans);
    };
    slot.detach = remove;
    return () => {
      if (slot.detach === remove) slot.detach = noop;
      remove();
      applyIncoming(capturedIncoming, null);
    };
  };

  slot.composed = composed;
  slot.incoming = incoming;
  slot.onAnimationEnd = animHandler;
  slot.onTransitionEnd = transHandler;
  return composed;
}
