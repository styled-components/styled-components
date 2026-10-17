import React from 'react';
import type { Ref } from 'react';
import type { NativeAnimationEvent, NativeTransitionEvent } from '../animation/types';
import { type ComposedRef, useComposedRef } from '../composeRef';
import { camelize } from '../transform';

type AnimationEndHandler = (event: NativeAnimationEvent) => void;
type TransitionEndHandler = (event: NativeTransitionEvent) => void;

type EndHandlers = {
  onAnimationEnd: AnimationEndHandler | undefined;
  onTransitionEnd: TransitionEndHandler | undefined;
};

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

function elapsedSeconds(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
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

/**
 * Listen for `animationend` and `transitionend` on the host node and
 * call the matching props.
 *
 * react-native-web forwards an allowlist of DOM props, and these two
 * are not on it, so handing them to the primitive drops them. The
 * browser still runs the CSS. The payload matches the Hermes adapter:
 * `{ animationName, elapsedTime }` and `{ propertyName, elapsedTime }`,
 * with `propertyName` camelCased to that adapter's runtime style key.
 * Events that bubbled from a descendant are ignored, because completion
 * belongs to the component the CSS is on.
 *
 * The listener is armed only while a callback is present, and the
 * callback is read when the event fires. A new function identity does
 * not re-arm. Passing or removing a callback does, via `keys`.
 *
 * react-native-web merges refs in `useMergeRefs` and drops the callback's
 * return value, then clears with `null`. The remover is stored so that
 * null path still detaches. The returned cleanup covers a host that
 * honors a ref callback's return value.
 */
export function useEndEventRef(
  onAnimationEnd: unknown,
  onTransitionEnd: unknown,
  incoming: Ref<unknown> | undefined
): ComposedRef<unknown> {
  const handlers = React.useRef<EndHandlers>({
    onAnimationEnd: undefined,
    onTransitionEnd: undefined,
  });
  handlers.current.onAnimationEnd = asHandler<AnimationEndHandler>(onAnimationEnd);
  handlers.current.onTransitionEnd = asHandler<TransitionEndHandler>(onTransitionEnd);
  const listen =
    handlers.current.onAnimationEnd !== undefined || handlers.current.onTransitionEnd !== undefined;
  const detachRef = React.useRef<() => void>(() => {});

  return useComposedRef<unknown>(
    node => {
      detachRef.current();
      detachRef.current = () => {};
      const armed =
        handlers.current.onAnimationEnd !== undefined ||
        handlers.current.onTransitionEnd !== undefined;
      if (!armed || !isListenable(node)) return () => {};
      const onAnim = (event: Event) => {
        if (event.target !== node) return;
        const cb = handlers.current.onAnimationEnd;
        if (cb === undefined) return;
        cb(animationPayload(event));
      };
      const onTrans = (event: Event) => {
        if (event.target !== node) return;
        const cb = handlers.current.onTransitionEnd;
        if (cb === undefined) return;
        cb(transitionPayload(event));
      };
      node.addEventListener('animationend', onAnim);
      node.addEventListener('transitionend', onTrans);
      const detach = () => {
        node.removeEventListener('animationend', onAnim);
        node.removeEventListener('transitionend', onTrans);
      };
      detachRef.current = detach;
      return detach;
    },
    incoming,
    [listen]
  );
}
