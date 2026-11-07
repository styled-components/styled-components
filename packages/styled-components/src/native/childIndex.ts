import React, { createElement } from 'react';
import type { Dict, NativeTarget } from '../types';
import {
  EMPTY_SIBLINGS,
  ParentContext,
  type ParentContextValue,
  type SiblingInfo,
  type SiblingsList,
} from './ParentContext';

/**
 * Compute the {@link ParentContextValue} this component publishes to
 * descendants. Identity = `styledComponentId` + element target; the
 * ancestor chain accumulates the parent's so descendant combinators
 * can match an ancestor anywhere up the tree.
 *
 * Returns `null` when the inherited `parentId` already equals this
 * component's id (defensive; would accumulate duplicates on
 * re-render). The caller should fall through to the inherited context
 * without re-wrapping in a Provider.
 *
 * Result is memoized per-component in `ParentPublishCache` so the
 * `value` handed to `ParentContext.Provider` stays reference-stable
 * across renders with unchanged inherited context. That stability lets
 * `React.memo` on styled descendants short-circuit when their props
 * are equal: the provider's `value` no longer changes by reference on
 * every parent render.
 */
export function buildPublishedParentValue(
  cache: ParentPublishCache,
  parent: ParentContextValue,
  styledComponentId: string,
  elementType: NativeTarget
): ParentContextValue | null {
  if (cache.publishedKeyParentCtx === parent && cache.publishedKeyElementType === elementType) {
    return cache.publishedValue;
  }
  let value: ParentContextValue | null;
  if (parent.parentId === styledComponentId) {
    value = null;
  } else {
    const ancestors =
      parent.parentId === null
        ? parent.ancestors
        : parent.ancestors.length === 0
          ? [parent.parentId]
          : parent.ancestors.concat(parent.parentId);
    value = {
      parentId: styledComponentId,
      parentTarget: elementType,
      ancestors,
      siblingIndex: -1,
      totalSiblings: 0,
      prevSiblingId: null,
      prevSiblingTarget: null,
      prevSiblings: EMPTY_PREV_SIBLINGS,
      prevSiblingsCount: 0,
      siblingIndexOfType: -1,
      totalSiblingsOfType: 0,
      siblings: EMPTY_SIBLINGS,
    };
  }
  cache.publishedKeyParentCtx = parent;
  cache.publishedKeyElementType = elementType;
  cache.publishedValue = value;
  // Per-child cache entries reference the prior published value via
  // `parentValue`; let `indexStyledChildren` invalidate them lazily
  // when its entry-by-entry compare mismatches.
  return value;
}

interface PerChildCacheEntry {
  id: string | null;
  target: NativeTarget | null;
  total: number;
  prevId: string | null;
  prevTarget: NativeTarget | null;
  prevSiblingsKey: string;
  idxOfType: number;
  totalOfType: number;
  parentValue: ParentContextValue;
  /** Identity of the SiblingsList wrapper at the time perChildValue was built. */
  siblings: SiblingsList;
  perChildValue: ParentContextValue;
}

export interface ParentPublishCache {
  publishedKeyParentCtx: ParentContextValue | null;
  publishedKeyElementType: NativeTarget | null;
  publishedValue: ParentContextValue | null;
  perChild: Array<PerChildCacheEntry | null>;
  /** Stable SiblingsList wrapper; `entries` is mutated each render. */
  siblingsList: SiblingsList | null;
}

export function createParentPublishCache(): ParentPublishCache {
  return {
    publishedKeyParentCtx: null,
    publishedKeyElementType: null,
    publishedValue: null,
    perChild: [],
    siblingsList: null,
  };
}

const EMPTY_PREV_SIBLINGS: ReadonlyArray<string> = Object.freeze([]);

/**
 * Walk `children`, identifying styled descendants (those carrying a
 * `styledComponentId` static) and wrapping each one in a per-child
 * `ParentContext.Provider` that publishes its sibling position.
 * Non-styled children pass through untouched.
 *
 * Returns the original `children` when no styled children are present
 * so callers can reuse the original `elementProps` reference, keeping it
 * reference-stable for React.
 *
 * Sibling info reflects literal JSX position among the parent's direct
 * children. Combinator selectors only see immediate styled-child
 * relationships of a styled parent; a non-styled wrapper between them
 * means a deeper styled descendant sees no sibling info (its inherited
 * Provider holds the default values).
 *
 * Each per-child Provider's `value` is cached structurally by position:
 * when the next render produces the same (id, target, total, prev*,
 * idx-of-type, total-of-type, parentValue ref) at slot i, the same
 * `ParentContextValue` reference is reused. JSX re-creation in the
 * caller produces fresh React elements each render, but the per-child
 * Provider `value` stays reference-stable, which lets `React.memo` on
 * styled descendants short-circuit cleanly.
 */
export function indexStyledChildren(
  cache: ParentPublishCache,
  children: React.ReactNode,
  parentValue: ParentContextValue
): React.ReactNode {
  if (children === undefined || children === null) return children;
  if (typeof children === 'string' || typeof children === 'number') return children;

  const arr = React.Children.toArray(children);
  if (arr.length === 0) return children;

  // First pass: identify styled children, total per target, and collect
  // the `SiblingInfo` array used by `:nth-child(<formula> of <selector>)`
  // matchers. Skipping non-styled entries keeps the array aligned with
  // the parent walk's view of "styled children" used elsewhere.
  const total = arr.length;
  const childIds: Array<string | null> = new Array(total);
  const childTargets: Array<NativeTarget | null> = new Array(total);
  const totalsByTarget = new Map<NativeTarget, number>();
  const siblingsMut: SiblingInfo[] = [];
  let hasAnyStyled = false;
  for (let i = 0; i < total; i++) {
    const c = arr[i];
    if (React.isValidElement(c)) {
      const tp = c.type as { styledComponentId?: string; target?: NativeTarget } | string;
      if (typeof tp !== 'string' && tp.styledComponentId !== undefined) {
        const id = tp.styledComponentId;
        childIds[i] = id;
        const target = tp.target ?? null;
        childTargets[i] = target;
        hasAnyStyled = true;
        if (target !== null) {
          totalsByTarget.set(target, (totalsByTarget.get(target) ?? 0) + 1);
        }
        siblingsMut.push({
          id,
          target,
          props: c.props as Readonly<Record<string, unknown>>,
          index: i,
        });
        continue;
      }
    }
    childIds[i] = null;
    childTargets[i] = null;
  }
  if (!hasAnyStyled) return children;
  // Reuse the cache's SiblingsList wrapper across renders; just swap
  // `.entries`. This keeps perChildValue identity stable when sibling
  // shape is unchanged while still giving of-selector matchers a fresh
  // array reference (so their entry-keyed plan caches invalidate).
  let siblings = cache.siblingsList;
  if (siblings === null) {
    siblings = { entries: siblingsMut };
    cache.siblingsList = siblings;
  } else {
    siblings.entries = siblingsMut;
  }

  const prevSiblingsRunning: string[] = [];
  // Running NUL-joined fingerprint of `prevSiblingsRunning`. Maintained
  // incrementally so each iteration appends one id (O(1) amortized) instead
  // of re-joining the whole array (O(i) per iteration, O(n²) total). For a
  // parent with N styled children this drops the total work from quadratic
  // to linear.
  let prevSiblingsKeyRunning = '';
  const sameTypeCount = new Map<NativeTarget, number>();
  const nextChildren: React.ReactNode[] = new Array(total);
  const perChildCache = cache.perChild;
  if (perChildCache.length !== total) perChildCache.length = total;
  for (let i = 0; i < total; i++) {
    const child = arr[i];
    const id = childIds[i];
    if (id === null) {
      nextChildren[i] = child;
      perChildCache[i] = null;
      continue;
    }
    const target = childTargets[i];
    const prevId = i > 0 ? childIds[i - 1] : null;
    const prevTarget = i > 0 ? childTargets[i - 1] : null;
    const idxOfType = target !== null ? (sameTypeCount.get(target) ?? 0) : -1;
    const totalOfType = target !== null ? (totalsByTarget.get(target) ?? 0) : 0;
    const prevSiblingsKey = prevSiblingsKeyRunning;
    const cached = perChildCache[i];
    let perChildValue: ParentContextValue;
    if (
      cached !== null &&
      cached !== undefined &&
      cached.id === id &&
      cached.target === target &&
      cached.total === total &&
      cached.prevId === prevId &&
      cached.prevTarget === prevTarget &&
      cached.prevSiblingsKey === prevSiblingsKey &&
      cached.idxOfType === idxOfType &&
      cached.totalOfType === totalOfType &&
      cached.parentValue === parentValue &&
      cached.siblings === siblings
    ) {
      perChildValue = cached.perChildValue;
    } else {
      // Publish the shared running array directly. Each child's
      // `prevSiblingsCount` caps the valid prefix; later siblings will
      // append to the same backing array as the parent walk continues,
      // but consumers (e.g. general-sibling combinator matcher) iterate
      // up to the count, not the array's length. Avoids the O(N²) slice
      // cost of per-child copies on first parent render.
      perChildValue = {
        parentId: parentValue.parentId,
        parentTarget: parentValue.parentTarget,
        ancestors: parentValue.ancestors,
        siblingIndex: i,
        totalSiblings: total,
        prevSiblingId: prevId,
        prevSiblingTarget: prevTarget,
        prevSiblings: prevSiblingsRunning.length === 0 ? EMPTY_PREV_SIBLINGS : prevSiblingsRunning,
        prevSiblingsCount: prevSiblingsRunning.length,
        siblingIndexOfType: idxOfType,
        totalSiblingsOfType: totalOfType,
        siblings,
      };
      perChildCache[i] = {
        id,
        target,
        total,
        prevId,
        prevTarget,
        prevSiblingsKey,
        idxOfType,
        totalOfType,
        parentValue,
        siblings,
        perChildValue,
      };
    }
    nextChildren[i] = createElement(
      ParentContext.Provider,
      { value: perChildValue, key: (child as React.ReactElement).key ?? `__sc_sib_${i}` },
      child
    );
    prevSiblingsRunning.push(id);
    prevSiblingsKeyRunning =
      prevSiblingsKeyRunning === '' ? id : prevSiblingsKeyRunning + '\0' + id;
    if (target !== null) sameTypeCount.set(target, idxOfType + 1);
  }
  return nextChildren;
}

/**
 * Substitute `children` on `elementProps` with `indexedChildren` if the
 * latter is a fresh reference. When `indexedChildren === elementProps.children`,
 * the original object is returned so it stays reference-stable for React.
 */
export function withIndexedChildren(
  elementProps: Dict<unknown>,
  indexedChildren: React.ReactNode
): Dict<unknown> {
  if (indexedChildren === elementProps.children) return elementProps;
  return { ...elementProps, children: indexedChildren };
}
