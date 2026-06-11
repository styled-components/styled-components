/**
 * Consolidated render-state context for the native dynamic path.
 *
 * Carries the tree-pushed state v7's resolver needs in one provider:
 *
 *   - `container`: nearest + named CSS Container Query ancestors.
 *     Published by `ContainerPublisher` when a component declares
 *     `container-type`.
 *   - `cascade`: the per-tree-position style values downstream
 *     resolvers need to interpret cascade-dependent units and
 *     keywords (`em`, `lh`, `rlh`, `text-align: start | end`,
 *     sentinel-base relative color).
 *
 * Why one consolidated context (rather than one per concern):
 *   - All fields update from in-tree Providers, not external
 *     subscriptions (those flow via `useMediaEnv`'s
 *     useSyncExternalStore).
 *   - The consumer set is the same every render (useDynamicImpl
 *     reads both fields). Splitting wouldn't reduce re-renders.
 *   - One stable object reference per render lets the render cache's
 *     identity check short-circuit cleanly when neither field
 *     changed.
 *
 * Theme stays in `ThemeContext` (`models/ThemeProvider`): it's the
 * public ergonomic surface (`<ThemeProvider theme={…}>`) and the
 * public-API contract is worth preserving across the v7 reshape.
 *
 * Media + viewport env (width, color scheme, reduce-motion, font
 * scale) flow through `useMediaEnv` because they're external state,
 * not React-tree state.
 */
import React from 'react';

/** One CSS Container Query ancestor's published metrics. */
export interface ContainerEntry {
  name?: string | undefined;
  width: number;
  height: number;
}

export interface ContainerContextValue {
  /** Nearest unnamed CSS Container Query ancestor, if any. */
  nearest: ContainerEntry | null;
  /** Map of named CSS Container Query ancestors up the tree. */
  named: Readonly<Record<string, ContainerEntry>>;
}

const EMPTY_NAMED: Readonly<Record<string, ContainerEntry>> = Object.freeze({});

export const EMPTY_CONTAINER_CTX: ContainerContextValue = Object.freeze({
  nearest: null,
  named: EMPTY_NAMED,
});

export interface NativeCascadeValues {
  /** Parent's resolved font-size in px. Anchors `em` resolution. */
  fontSize: number;
  /**
   * Parent's resolved line-height in px. Anchors `lh` resolution. RN's
   * `lineHeight` is always px once resolved, even when the source CSS
   * used a unitless multiplier (the resolver multiplies at compile time).
   */
  lineHeight: number;
  /** Root font size; anchors `rem` and `rlh`. */
  rootFontSize: number;
  /**
   * Inherited writing direction. Anchors `text-align: start | end`
   * resolution under horizontal-tb.
   */
  direction: 'ltr' | 'rtl';
  /**
   * CSS custom properties contributed by every ancestor on the path to
   * the root, deep-merged so the nearest ancestor wins. Anchors `var()`
   * substitution at render time. Native bundles only; rn-web defers to
   * the browser's cascade.
   */
  customProperties?: ReadonlyMap<string, string>;
  /**
   * Published by a `display: grid` container so its direct children can
   * size themselves. `ownerId` is the container's `styledComponentId`;
   * only children whose `parentId` equals it are grid items (the spec's
   * direct-children rule). `contentWidth` is the measured content-box
   * width in dp, `0` before the first layout. Native bundles only;
   * rn-web defers to the browser's grid layout.
   */
  grid?: {
    ownerId: string;
    columns: number;
    columnGap: number;
    rowGap: number;
    contentWidth: number;
  };
}

export interface NativeStyleContextValue {
  container: ContainerContextValue;
  cascade: NativeCascadeValues;
}

export const DEFAULT_CASCADE: NativeCascadeValues = {
  fontSize: 16,
  lineHeight: 24,
  rootFontSize: 16,
  direction: 'ltr',
};

export const DEFAULT_NATIVE_STYLE: NativeStyleContextValue = {
  container: EMPTY_CONTAINER_CTX,
  cascade: DEFAULT_CASCADE,
};

export const NativeStyleContext =
  React.createContext<NativeStyleContextValue>(DEFAULT_NATIVE_STYLE);

export function useNativeStyleContext(): NativeStyleContextValue {
  return React.useContext(NativeStyleContext);
}
