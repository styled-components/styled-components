/**
 * Parent identity + sibling position for DOM-like selector matching.
 *
 * Published by each styled component when it renders; descendants read
 * it during their own render to evaluate Tier 2 selectors:
 *   - child combinator    `Form > Submit`
 *   - descendant           `Form Submit`
 *   - adjacent sibling     `Submit + Cancel`
 *   - general sibling      `Submit ~ Cancel`
 *   - `:nth-child(n)`      / `:first-child` / `:last-child`
 *   - `:nth-of-type(n)`
 *   - `:has(<simple>)`     (recursive own-children walk)
 *
 * Direct-children limitation: sibling position is published only for
 * styled elements that are direct children of the parent's JSX. A
 * non-styled component between the parent and a descendant is
 * transparent to the parent and ancestor chain (the descendant still
 * sees the nearest styled ancestor), but the descendant gets no
 * sibling position.
 */
import React from 'react';
import { NativeTarget } from '../types';

/**
 * Minimal shape a sibling publishes to its peers via `ParentContext.siblings`.
 * Powers `:nth-child(<formula> of <selector>)` matching: each sibling reads
 * the array to filter peers by the inner selector and find its own position
 * in the filtered list. Only styled siblings appear; non-styled intermediaries
 * are skipped (consistent with the `direct-children limitation` noted above).
 */
export interface SiblingInfo {
  /** Sibling's `styledComponentId`. */
  id: string;
  /** Sibling's element target (`'View' | 'Text' | …`); null if untracked. */
  target: NativeTarget | null;
  /** Reference to the sibling's authored props bag (read-only). */
  props: Readonly<Record<string, unknown>>;
  /**
   * This sibling's index in the parent's FULL child list (matching the
   * `siblingIndex` value the same element receives when reading parentCtx).
   * Lets the of-selector matcher find self in the siblings array via
   * `siblingIndex` comparison without an extra perChildValue field.
   */
  index: number;
}

/**
 * Stable wrapper around the per-parent siblings array. The wrapper
 * identity is reused across renders so `perChildValue` references stay
 * `===`-stable, but `entries` is replaced with a fresh array on every
 * parent walk so of-selector matchers always read current sibling
 * props. The of-selector filter cache keys on `entries` identity, so
 * fresh-per-render entries naturally invalidate stale plan caches.
 */
export interface SiblingsList {
  entries: ReadonlyArray<SiblingInfo>;
}

export interface ParentContextValue {
  /** Immediate parent styled component's `styledComponentId`. */
  parentId: string | null;
  /** Immediate parent's element target (`'View' | 'Text' | …`). */
  parentTarget: NativeTarget | null;
  /**
   * Ordered list of every styled-component ancestor up to root. Used
   * by descendant selectors (`Form Submit`) which need to know whether
   * a given selector matches any ancestor, not just the immediate
   * parent.
   */
  ancestors: ReadonlyArray<string>;
  /** Position among parent's children (0-based). -1 when not tracked. */
  siblingIndex: number;
  /** Total children of the parent, as counted by its child walk. */
  totalSiblings: number;
  /** Immediate prior sibling's `styledComponentId`, for `+` matching. */
  prevSiblingId: string | null;
  /** Prior sibling's element target. */
  prevSiblingTarget: NativeTarget | null;
  /**
   * Prior siblings' `styledComponentId`s in render order. May be a
   * shared running array; consumers must iterate up to
   * `prevSiblingsCount`, not `array.length`, since later siblings may
   * append to the same backing array during the parent's walk. Powers
   * `${Foo} ~ &` general-sibling matching.
   */
  prevSiblings: ReadonlyArray<string>;
  /** Valid prefix length of `prevSiblings` for this child. */
  prevSiblingsCount: number;
  /**
   * Index among same-target prior siblings. Used by `:nth-of-type`.
   * `-1` when no same-target sibling positioning is tracked.
   */
  siblingIndexOfType: number;
  /**
   * Total same-target siblings emitted by parent's walk. Combined with
   * `siblingIndexOfType` to evaluate `:nth-last-of-type` and
   * `:only-of-type`.
   */
  totalSiblingsOfType: number;
  /**
   * Mutable container holding the list of styled siblings under the
   * same parent. The wrapper identity is reused across renders (so
   * `perChildValue` stays `===`-stable); `entries` is replaced each
   * parent walk so consumers always read current sibling props.
   */
  siblings: SiblingsList;
}

const EMPTY_STR_ARRAY: ReadonlyArray<string> = Object.freeze([]);
const EMPTY_SIBLING_ENTRIES: ReadonlyArray<SiblingInfo> = Object.freeze([]);
const EMPTY_SIBLINGS: SiblingsList = Object.freeze({ entries: EMPTY_SIBLING_ENTRIES });

export const DEFAULT_PARENT_CONTEXT: ParentContextValue = {
  parentId: null,
  parentTarget: null,
  ancestors: EMPTY_STR_ARRAY,
  siblingIndex: -1,
  totalSiblings: 0,
  prevSiblingId: null,
  prevSiblingTarget: null,
  prevSiblings: EMPTY_STR_ARRAY,
  prevSiblingsCount: 0,
  siblingIndexOfType: -1,
  totalSiblingsOfType: 0,
  siblings: EMPTY_SIBLINGS,
};

export { EMPTY_SIBLINGS };

export const ParentContext = React.createContext<ParentContextValue>(DEFAULT_PARENT_CONTEXT);

export function useParentContext(): ParentContextValue {
  return React.useContext(ParentContext);
}
