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
 * Direct-children limitation: position + ancestor information threads
 * through styled-component-rendered children only. A non-styled user
 * component between the parent styled component and a matched
 * descendant breaks the chain — the descendant's ancestor list
 * reflects the parent it actually rendered under, not the parent of
 * the user component.
 */
import React from 'react';
import { NativeTarget } from '../types';

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
  /** Total siblings emitted by parent's React.Children.map pass. */
  totalSiblings: number;
  /** Immediate prior sibling's `styledComponentId`, for `+` matching. */
  prevSiblingId: string | null;
  /** Prior sibling's element target. */
  prevSiblingTarget: NativeTarget | null;
  /**
   * All prior siblings' `styledComponentId`s in render order. Powers
   * `${Foo} ~ &` general-sibling matching: fires when any preceding
   * sibling matches the referenced component.
   */
  prevSiblings: ReadonlyArray<string>;
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
}

const EMPTY_STR_ARRAY: ReadonlyArray<string> = Object.freeze([]);

export const DEFAULT_PARENT_CONTEXT: ParentContextValue = {
  parentId: null,
  parentTarget: null,
  ancestors: EMPTY_STR_ARRAY,
  siblingIndex: -1,
  totalSiblings: 0,
  prevSiblingId: null,
  prevSiblingTarget: null,
  prevSiblings: EMPTY_STR_ARRAY,
  siblingIndexOfType: -1,
  totalSiblingsOfType: 0,
};

export const ParentContext = React.createContext<ParentContextValue>(DEFAULT_PARENT_CONTEXT);

export function useParentContext(): ParentContextValue {
  return React.useContext(ParentContext);
}
