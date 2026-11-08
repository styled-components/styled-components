import React from 'react';
import type { Dict, NativeTarget } from '../types';
import {
  EMPTY_SIBLINGS,
  PARENT_SLOT_PROP,
  type ParentContextValue,
  type SiblingInfo,
  type SiblingsList,
} from './ParentContext';
import type { CascadeHolder } from './publishCascade';

/**
 * Compute the {@link ParentContextValue} this component publishes to
 * descendants. Identity = `styledComponentId` + element target; the
 * ancestor chain accumulates the parent's so descendant combinators
 * can match an ancestor anywhere up the tree.
 *
 * Every instance publishes, including one nested in its own kind: its
 * children must read their own position under it, never the position this
 * component has under its parent. A recursive tree reuses the parent's
 * `ancestors` array while the parent's id is already its last entry, so it
 * costs nothing per level (descendant matching is membership only).
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
): ParentContextValue {
  const cached = cache.publishedValue;
  if (
    cached !== null &&
    cache.publishedKeyParentCtx === parent &&
    cache.publishedKeyElementType === elementType
  ) {
    return cached;
  }
  const inherited = parent.ancestors;
  const parentId = parent.parentId;
  const ancestors =
    parentId === null || inherited[inherited.length - 1] === parentId
      ? inherited
      : inherited.length === 0
        ? [parentId]
        : inherited.concat(parentId);
  const value: ParentContextValue = {
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

export interface ParentPublishCache extends CascadeHolder {
  /**
   * Latched once the component rendered, or could render, `background-blend-mode`
   * layers: its children then always sit behind a layer slot, so a layer
   * appearing or leaving never moves them.
   */
  blendLayerSlot: boolean;
  publishedKeyParentCtx: ParentContextValue | null;
  publishedKeyElementType: NativeTarget | null;
  publishedValue: ParentContextValue | null;
  perChild: Array<PerChildCacheEntry | null>;
  /** Stable SiblingsList wrapper; `entries` is mutated each render. */
  siblingsList: SiblingsList | null;
  /** The `Pressable` state wrap's own slot holder, so its rest and pressed values never replace the body's cached ones. */
  stateHolder: CascadeHolder | null;
}

export function createParentPublishCache(): ParentPublishCache {
  return {
    blendLayerSlot: false,
    cascadeSlot: null,
    publishedKeyParentCtx: null,
    publishedKeyElementType: null,
    publishedValue: null,
    perChild: [],
    siblingsList: null,
    stateHolder: null,
  };
}

const EMPTY_PREV_SIBLINGS: ReadonlyArray<string> = Object.freeze([]);

/** The statics a styled component carries on its element type. */
interface StyledStatics {
  styledComponentId?: string;
  target?: NativeTarget;
}

interface ChildTally {
  /** Elements counted so far, in JSX order. */
  count: number;
  siblings: SiblingInfo[];
  /** Elements per type, styled or plain, so `:nth-of-type` counts a plain sibling of the same type. */
  totalsByType: Map<unknown, number>;
}

interface IndexRun {
  cache: ParentPublishCache;
  /** Element index of the next element. */
  index: number;
  parentValue: ParentContextValue;
  prevId: string | null;
  prevSiblings: string[];
  /** NUL-joined fingerprint of `prevSiblings`, appended to as each styled sibling passes. */
  prevSiblingsKey: string;
  prevTarget: NativeTarget | null;
  seenByType: Map<unknown, number>;
  siblings: SiblingsList;
  total: number;
  totalsByType: Map<unknown, number>;
}

function styledIdOf(element: React.ReactElement): string | undefined {
  const type = element.type as StyledStatics | string;
  return typeof type === 'string' ? undefined : type.styledComponentId;
}

function childrenOf(element: React.ReactElement): React.ReactNode {
  return (element.props as { children?: React.ReactNode }).children;
}

/**
 * Stops at the first styled element, so a parent with no styled child costs a
 * scan and nothing else, and a parent whose first child is styled costs one check.
 */
function hasStyledChild(node: React.ReactNode): boolean {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      if (hasStyledChild(node[i])) return true;
    }
    return false;
  }
  if (!React.isValidElement(node)) return false;
  if (styledIdOf(node) !== undefined) return true;
  return node.type === React.Fragment && hasStyledChild(childrenOf(node));
}

/**
 * Count the elements among `node` in JSX order. Arrays and Fragments are counted
 * through; text, null, booleans, undefined and function children are skipped; any
 * other object (an iterable such as a generator, a portal, a thenable) is one
 * opaque element, never iterated, so React still receives it untouched.
 */
function tallyChildren(node: React.ReactNode, tally: ChildTally): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) tallyChildren(node[i], tally);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  if (!React.isValidElement(node)) {
    tally.count++;
    return;
  }
  if (node.type === React.Fragment) {
    tallyChildren(childrenOf(node), tally);
    return;
  }
  const id = styledIdOf(node);
  const index = tally.count++;
  let type: unknown = node.type;
  if (id !== undefined) {
    const target = (node.type as StyledStatics).target ?? null;
    tally.siblings.push({
      id,
      index,
      props: node.props as Readonly<Record<string, unknown>>,
      target,
    });
    type = target;
  }
  if (type !== null) {
    tally.totalsByType.set(type, (tally.totalsByType.get(type) ?? 0) + 1);
  }
}

/**
 * Rebuild `node` with each styled element carrying its own position in
 * {@link PARENT_SLOT_PROP}, copying an array or Fragment only when something
 * inside changed. `slot` is the raw position among the siblings (null and false
 * slots keep theirs), and keys a rebuilt element that has no key of its own, so a
 * slot keeps its fiber when the siblings around it come and go.
 */
function reindexChildren(node: React.ReactNode, slot: number, run: IndexRun): React.ReactNode {
  if (Array.isArray(node)) {
    let out: React.ReactNode[] | null = null;
    for (let i = 0; i < node.length; i++) {
      const child: React.ReactNode = node[i];
      const next = reindexChildren(child, i, run);
      if (next === child) continue;
      if (out === null) out = node.slice();
      out[i] = next;
    }
    return out ?? node;
  }
  if (typeof node !== 'object' || node === null) return node;
  if (!React.isValidElement(node)) {
    run.index++;
    run.prevId = null;
    run.prevTarget = null;
    return node;
  }
  if (node.type === React.Fragment) {
    const inner = childrenOf(node);
    const next = reindexChildren(inner, 0, run);
    return next === inner ? node : React.cloneElement(node, undefined, next);
  }
  return reindexElement(node, slot, run);
}

function reindexElement(element: React.ReactElement, slot: number, run: IndexRun): React.ReactNode {
  const index = run.index++;
  const { cache, seenByType, totalsByType } = run;
  const id = styledIdOf(element);
  const prevId = run.prevId;
  const prevTarget = run.prevTarget;
  if (id === undefined) {
    seenByType.set(element.type, (seenByType.get(element.type) ?? 0) + 1);
    cache.perChild[index] = null;
    run.prevId = null;
    run.prevTarget = null;
    return element;
  }

  const target = (element.type as StyledStatics).target ?? null;
  const idxOfType = target !== null ? (seenByType.get(target) ?? 0) : -1;
  const totalOfType = target !== null ? (totalsByType.get(target) ?? 0) : 0;
  const prevSiblingsKey = run.prevSiblingsKey;
  const { parentValue, siblings, total } = run;
  const cached = cache.perChild[index];
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
      siblingIndex: index,
      totalSiblings: total,
      prevSiblingId: prevId,
      prevSiblingTarget: prevTarget,
      prevSiblings: run.prevSiblings.length === 0 ? EMPTY_PREV_SIBLINGS : run.prevSiblings,
      prevSiblingsCount: run.prevSiblings.length,
      siblingIndexOfType: idxOfType,
      totalSiblingsOfType: totalOfType,
      siblings,
    };
    cache.perChild[index] = {
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
  run.prevSiblings.push(id);
  // Appended incrementally so a parent with N styled children costs O(N), not O(N²).
  run.prevSiblingsKey = prevSiblingsKey === '' ? id : prevSiblingsKey + '\0' + id;
  run.prevId = id;
  run.prevTarget = target;
  if (target !== null) seenByType.set(target, idxOfType + 1);

  const config: Dict<unknown> = { [PARENT_SLOT_PROP]: perChildValue };
  if (element.key === null) config.key = `__sc_sib_${slot}`;

  return React.cloneElement(element, config);
}

/**
 * Walk `children`, identifying styled descendants (those carrying a
 * `styledComponentId` static) and handing each one its sibling position in
 * {@link PARENT_SLOT_PROP}.
 * Plain elements, text, and everything else pass through in place, so
 * their position and fiber never depend on whether a styled sibling exists.
 *
 * Returns the original `children` when no styled children are present
 * so callers can reuse the original `elementProps` reference, keeping it
 * reference-stable for React.
 *
 * Sibling info is the element's index among the parent's JSX elements
 * (see `tallyChildren` for what counts). Combinator selectors only see
 * immediate styled-child relationships of a styled parent; a non-styled
 * wrapper between them means a deeper styled descendant sees no sibling
 * info (its inherited Provider holds the default values).
 *
 * Each per-child value is cached structurally by position: when the next
 * render produces the same (id, target, total, prev*, idx-of-type,
 * total-of-type, parentValue ref) at index i, the same `ParentContextValue`
 * reference is reused. JSX re-creation in the caller produces fresh React
 * elements each render, but the prop's value stays reference-stable, which
 * lets `React.memo` on styled descendants short-circuit cleanly.
 */
export function indexStyledChildren(
  cache: ParentPublishCache,
  children: React.ReactNode,
  parentValue: ParentContextValue
): React.ReactNode {
  if (!hasStyledChild(children)) return children;

  const tally: ChildTally = { count: 0, siblings: [], totalsByType: new Map() };
  tallyChildren(children, tally);

  // Reuse the cache's SiblingsList wrapper across renders; just swap
  // `.entries`. This keeps perChildValue identity stable when sibling
  // shape is unchanged while still giving of-selector matchers a fresh
  // array reference (so their entry-keyed plan caches invalidate).
  let siblings = cache.siblingsList;
  if (siblings === null) {
    siblings = { entries: tally.siblings };
    cache.siblingsList = siblings;
  } else {
    siblings.entries = tally.siblings;
  }
  if (cache.perChild.length !== tally.count) cache.perChild.length = tally.count;

  return reindexChildren(children, 0, {
    cache,
    index: 0,
    parentValue,
    prevId: null,
    prevSiblings: [],
    prevSiblingsKey: '',
    prevTarget: null,
    seenByType: new Map(),
    siblings,
    total: tally.count,
    totalsByType: tally.totalsByType,
  });
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
