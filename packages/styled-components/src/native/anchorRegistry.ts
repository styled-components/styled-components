/**
 * Module-level registry of anchor rects for CSS Anchor Positioning.
 * Anchor names are app-global, matching the spec's global-by-default
 * naming; an element declaring `anchor-name: --x` publishes its
 * parent-relative onLayout rect here, and positioned siblings'
 * `anchor()` / `anchor-size()` resolvers read it at render time.
 *
 * Reactivity: rect changes bump a version counter and notify
 * subscribers; components whose CSS uses anchor functions subscribe
 * (useSyncExternalStore) and re-resolve. The version also participates
 * in their render-cache key so a re-render isn't served stale styles.
 */

import React from 'react';

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
  const nameRef = React.useRef<string | undefined>(undefined);
  nameRef.current = name;
  React.useEffect(
    () => () => {
      if (nameRef.current !== undefined) removeAnchor(nameRef.current);
    },
    []
  );
  if (name === undefined) return elementProps;
  const userOnLayout = elementProps.onLayout;
  const onLayout = (e: any) => {
    const l = e?.nativeEvent?.layout;
    if (l) setAnchorRect(name, { x: l.x, y: l.y, width: l.width, height: l.height });
    if (typeof userOnLayout === 'function') userOnLayout(e);
  };
  return { ...elementProps, onLayout };
}
