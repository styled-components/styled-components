/**
 * Module-level registry of anchor rects for CSS Anchor Positioning.
 * Anchor names are app-global, matching the spec's global-by-default
 * naming; an element declaring `anchor-name: --x` publishes its
 * parent-relative onLayout rect here, and positioned siblings'
 * `anchor()` / `anchor-size()` resolvers read it at render time.
 *
 * Reactivity: rect changes bump a version counter and notify
 * subscribers; components whose CSS uses anchor functions subscribe
 * (useSyncExternalStore) and re-render when the version bumps,
 * re-resolving against the current rects.
 */

import React from 'react';
import { useComposedRef } from './composeRef';
import { warnOnce } from './transform/dev';

export interface AnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const rects = new Map<string, AnchorRect>();
const listeners = new Set<() => void>();
let version = 0;

function notify(): void {
  version++;
  for (const l of listeners) l();
}

export function setAnchorRect(name: string, rect: AnchorRect): void {
  const prev = rects.get(name);
  if (
    prev !== undefined &&
    Math.abs(prev.x - rect.x) < 0.5 &&
    Math.abs(prev.y - rect.y) < 0.5 &&
    Math.abs(prev.width - rect.width) < 0.5 &&
    Math.abs(prev.height - rect.height) < 0.5
  ) {
    return;
  }
  rects.set(name, rect);
  notify();
}

export function removeAnchor(name: string): void {
  if (rects.delete(name)) notify();
}

export function getAnchorRect(name: string): AnchorRect | undefined {
  return rects.get(name);
}

export function subscribeAnchors(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAnchorVersion(): number {
  return version;
}

/** Test-only: clear all anchors without notifying. */
export function resetAnchorsForTest(): void {
  rects.clear();
  listeners.clear();
  version = 0;
}

/**
 * Render-path hook for elements declaring `anchor-name`: composes an
 * onLayout that publishes the parent-relative rect under the name and
 * removes it on unmount or rename. Hook order is unconditional;
 * `name === undefined` is a no-op pass-through.
 */
export function useAnchorNamePublisher(
  name: string | undefined,
  elementProps: Record<string, any>
): Record<string, any> {
  // Keyed on `name`: React runs a ref callback's cleanup when its
  // identity changes, so a rename releases the old name before the next
  // layout publishes under the new one. The unmount-only effect this
  // replaces read the name from a ref and so never fired on rename,
  // stranding the old rect for `anchor()` consumers to keep reading.
  // Forwarding `ref` is part of the contract a composed target owes this
  // hook, not something the library can work around: the rect is
  // module-global state whose only removal path is the ref cleanup, so a
  // target that forwards onLayout but drops `ref` would register a rect
  // nothing could ever remove. Gating publication on the ref makes both
  // halves share one fate, turning an unfixable leak into an inert
  // feature plus a dev warning naming what the target must do.
  const attached = React.useRef(false);
  const ref = useComposedRef<unknown>(
    () => {
      attached.current = true;
      return () => {
        attached.current = false;
        if (name !== undefined) removeAnchor(name);
      };
    },
    elementProps.ref,
    [name]
  );
  if (name === undefined) return elementProps;
  const userOnLayout = elementProps.onLayout;
  const onLayout = (e: any) => {
    const l = e?.nativeEvent?.layout;
    if (l) {
      if (attached.current) {
        setAnchorRect(name, { x: l.x, y: l.y, width: l.width, height: l.height });
      } else if (__DEV__) {
        warnOnce(
          'native-anchor-name-ref-dropped',
          `anchor-name: ${name} is inactive because the styled component never received a ref. styled-components publishes the anchor's rect from a ref callback so it can remove it again on unmount; a component that renders its own host without forwarding \`ref\` cannot participate. Forward the ref to the host element, or move anchor-name onto one that does.`,
          name
        );
      }
    }
    if (typeof userOnLayout === 'function') userOnLayout(e);
  };
  return { ...elementProps, onLayout, ref };
}
