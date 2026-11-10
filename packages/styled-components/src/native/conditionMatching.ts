import React from 'react';
import type { ConditionalAttr, ConditionalStyle, NthSpec } from '../models/compileNative';
import { applyVarDeferred } from '../models/compileNative';
import type { NthOfBranch } from '../parser/ast';
import type { Dict } from '../types';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import type { ContainerContextValue } from './NativeStyleContext';
import type { ParentContextValue, SiblingInfo } from './ParentContext';
import { matchMedia, type MediaQueryEnv } from './responsive';
import { matchSupports } from './supports';
import { applyResolvers, type ResolveEnv } from './transform/polyfills/resolvers';

// Mutable scratch env reused across container-query evaluations.
// matchMedia reads only `width`/`height` for container queries; the
// other fields are fixed defaults that never matter to the parser. We
// rewrite width/height in place rather than allocating a fresh object
// per condition per render.
const CONTAINER_ENV: MediaQueryEnv = {
  width: 0,
  height: 0,
  colorScheme: undefined,
  reduceMotion: false,
  fontScale: 1,
  pixelRatio: 1,
};

/** Whether a media, supports or container entry's environmental condition holds right now. */
export function conditionMatches(
  entry: ConditionalStyle,
  env: MediaQueryEnv,
  containerCtx: Pick<ContainerContextValue, 'named' | 'nearest'>
): boolean {
  if (entry.type === 'media') {
    return matchMedia(entry.condition, env);
  }
  if (entry.type === 'supports') {
    // Feature queries have their own grammar (declarations, not media
    // features); routing them through the media matcher silently
    // mismatches every condition.
    return matchSupports(entry.condition);
  }
  if (entry.type === 'container') {
    // CSS spec: anonymous `@container (…)` matches the nearest
    // container ancestor; named queries match the most-recent
    // container with that name. Fall back to `nearest` when no name
    // was written so users get sensible defaults without having to
    // declare `container-name`.
    const name = entry.containerName;
    const container = name ? containerCtx.named[name] : containerCtx.nearest;
    if (!container) return false;
    CONTAINER_ENV.width = container.width;
    CONTAINER_ENV.height = container.height;
    return matchMedia(entry.condition, CONTAINER_ENV);
  }
  return false;
}

/** The layers the matched buckets contribute. */
export interface MatchedLayers {
  normal: object[];
  /** Important overlay produced by matched buckets that carry an
   *  `!important` declaration. Lazily allocated on first push so the
   *  common case (no bucket has importance) costs no extra array. */
  important: object[] | null;
}

/** The result for an entry list with nothing to match. */
export const EMPTY_MATCHED: MatchedLayers = {
  normal: EMPTY_ARRAY as unknown as object[],
  important: null,
};

/** Resolve a matched bucket and append it (and its important overlay) to `out`. */
export function pushMatched(out: MatchedLayers, entry: ConditionalStyle, env: ResolveEnv): void {
  // varDeferred resolves at match time against the cascade map and may
  // contribute to either the normal or important layer depending on
  // each entry's importance flag.
  let varOut: { normal: Dict<unknown> | null; important: Dict<unknown> | null } | null = null;
  if (entry.varDeferred !== undefined) {
    varOut = applyVarDeferred(entry.varDeferred, env.customProperties, null, env);
  }
  out.normal.push(resolveBucket(entry, env, varOut !== null ? varOut.normal : null));
  if (
    entry.important !== undefined ||
    entry.importantResolvers !== undefined ||
    (varOut !== null && varOut.important !== null)
  ) {
    if (out.important === null) out.important = [];
    out.important.push(
      resolveImportantBucket(entry, env, varOut !== null ? varOut.important : null)
    );
  }
}

function resolveImportantBucket(
  entry: ConditionalStyle,
  env: ResolveEnv,
  varImportant: Dict<unknown> | null
): object {
  const imp = entry.important ?? EMPTY_OBJECT;
  const resolved = entry.importantResolvers
    ? applyResolvers(imp, entry.importantResolvers, env)
    : imp;
  return varImportant !== null ? { ...resolved, ...varImportant } : resolved;
}

/**
 * The layers of every non-pseudo entry whose condition, attributes or tree position match. Pseudo-gated
 * buckets are owned by the state callback, so this is fed the precomputed `nonPseudoEntries` subset
 * from compileNative and the per-render loop never iterates pseudo entries.
 */
export function matchConditionals(
  entries: ConditionalStyle[],
  env: MediaQueryEnv,
  containerCtx: Pick<ContainerContextValue, 'named' | 'nearest'>,
  props: Record<string, unknown>,
  resolveEnv: ResolveEnv,
  parentCtx: ParentContextValue
): MatchedLayers {
  const out: MatchedLayers = { normal: [], important: null };
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.type === 'attr') {
      if (attrMatches(entry, props)) pushMatched(out, entry, resolveEnv);
      continue;
    }
    if (entry.type === 'combinator') {
      if (!combinatorMatches(entry, parentCtx)) continue;
      pushMatched(out, entry, resolveEnv);
      continue;
    }
    if (entry.type === 'nthChild') {
      const matches = nthChildMatches(entry, parentCtx);
      if (entry.negate ? !matches : matches) pushMatched(out, entry, resolveEnv);
      continue;
    }
    if (entry.type === 'has') {
      const matches = hasMatches(entry, props.children as React.ReactNode);
      if (entry.negate ? !matches : matches) pushMatched(out, entry, resolveEnv);
      continue;
    }
    // media / container / supports;optionally gated on attrs too
    // when the at-rule body contained a nested attribute selector.
    if (!conditionMatches(entry, env, containerCtx)) continue;
    if (entry.attrs && !attrMatches(entry, props)) continue;
    pushMatched(out, entry, resolveEnv);
  }
  return out;
}

/**
 * Combinator selector match against ParentContext. Non-styled intermediaries are
 * transparent to both the descendant and the child combinator, since only styled
 * components publish ParentContext: the nearest styled ancestor is the "parent".
 */
export function combinatorMatches(entry: ConditionalStyle, parentCtx: ParentContextValue): boolean {
  const ancestorId = entry.condition;
  if (entry.combinator === 'child') return parentCtx.parentId === ancestorId;
  if (entry.combinator === 'adjacent-sibling') return parentCtx.prevSiblingId === ancestorId;
  if (entry.combinator === 'general-sibling') {
    const prev = parentCtx.prevSiblings;
    const cap = parentCtx.prevSiblingsCount;
    for (let i = 0; i < cap; i++) {
      if (prev[i] === ancestorId) return true;
    }
    return false;
  }
  // descendant; match the immediate parent OR any further ancestor.
  if (parentCtx.parentId === ancestorId) return true;
  const ancestors = parentCtx.ancestors;
  for (let i = 0; i < ancestors.length; i++) {
    if (ancestors[i] === ancestorId) return true;
  }
  return false;
}

/**
 * `&:has(<simple>)` match against `props.children`. Only React-element descendants
 * are inspected; descendants emitted inside a child's render body are invisible
 * because the walk reads pre-render children.
 */
export function hasMatches(entry: ConditionalStyle, children: React.ReactNode): boolean {
  const inner = entry.hasInner;
  if (!inner) return false;
  return walkForHas(children, inner);
}

/**
 * Arrays and elements only: an iterable such as a generator is never iterated,
 * since reading it here would consume it before React renders it.
 */
function walkForHas(
  children: React.ReactNode,
  inner: { kind: 'component'; id: string } | { kind: 'attr'; attr: ConditionalAttr }
): boolean {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      if (walkForHas(children[i], inner)) return true;
    }
    return false;
  }
  if (!React.isValidElement(children)) return false;
  if (matchesHasInner(children, inner)) return true;
  const grand = (children.props as { children?: React.ReactNode }).children;
  return grand !== undefined && grand !== null && walkForHas(grand, inner);
}

function matchesHasInner(
  el: React.ReactElement,
  inner: { kind: 'component'; id: string } | { kind: 'attr'; attr: ConditionalAttr }
): boolean {
  if (inner.kind === 'component') {
    const type = el.type as { styledComponentId?: string } | string;
    return typeof type !== 'string' && type.styledComponentId === inner.id;
  }
  return attrValueMatches(inner.attr, (el.props as Record<string, unknown>)[inner.attr.name]);
}

/** Whether the 1-based position `pos` is one of the `an+b` positions of `spec`. */
function nthPositionMatches(spec: NthSpec, pos: number): boolean {
  if (pos < 1) return false;
  if (spec.a === 0) return pos === spec.b;
  const k = (pos - spec.b) / spec.a;
  return k >= 0 && Math.floor(k) === k;
}

/** Whether the entry's `:nth-child` family selector matches this element's sibling position. */
export function nthChildMatches(entry: ConditionalStyle, parentCtx: ParentContextValue): boolean {
  const spec = entry.nthSpec;
  if (spec === undefined) return false;
  if (spec.of !== undefined) return nthChildOfSelectorMatches(entry, spec, spec.of, parentCtx);
  const idx = spec.ofType ? parentCtx.siblingIndexOfType : parentCtx.siblingIndex;
  if (idx < 0) return false;
  const tot = spec.ofType ? parentCtx.totalSiblingsOfType : parentCtx.totalSiblings;
  if (spec.onlyChild && tot !== 1) return false;
  // 1-based position from start or end.
  return nthPositionMatches(spec, spec.fromEnd ? tot - idx : idx + 1);
}

/**
 * `:nth-child(an+b of S)` and `:nth-last-child(an+b of S)`. Filters
 * `parentCtx.siblings` against the inner simple selector, finds self's
 * 1-based position in the filter via `parentCtx.siblingIndex`, applies
 * the formula. Result is cached on the entry keyed by the siblings array
 * reference so each subsequent sibling evaluating the same rule reuses
 * the precomputed filter (O(N) per parent render, not O(N²)).
 */
function nthChildOfSelectorMatches(
  entry: ConditionalStyle,
  spec: NthSpec,
  of: NthOfBranch,
  parentCtx: ParentContextValue
): boolean {
  const entries = parentCtx.siblings.entries;
  const selfIdx = parentCtx.siblingIndex;
  if (entries.length === 0 || selfIdx < 0) return false;

  // Persistent single-slot cache on the entry. The `Int32Array` is
  // indexed directly by a sibling's full-list position, so lookup is
  // O(1) (typed-array indexing, no Map hashing). The buffer is grown
  // by doubling when a parent's child count exceeds capacity and
  // reused across renders; only the touched range gets zeroed on
  // cache miss. Microbench across N=10..1000: -32% to -64% vs the
  // prior `Map<number, number>` plan at all densities.
  let plan = entry.__ofCache;
  if (plan === undefined) {
    plan = {
      entriesRef: null,
      maxIndex: 0,
      posByIndex: new Int32Array(NTH_OF_INITIAL_CAP),
      total: 0,
    };
    entry.__ofCache = plan;
  }
  if (plan.entriesRef !== entries) {
    let max = 0;
    for (let i = 0; i < entries.length; i++) {
      const idx = entries[i].index;
      if (idx > max) max = idx;
    }
    const need = max + 1;
    if (plan.posByIndex.length < need) {
      let cap = plan.posByIndex.length;
      while (cap < need) cap *= 2;
      plan.posByIndex = new Int32Array(cap);
    } else {
      // Reuse buffer; clear only the range previously touched OR the
      // new active range, whichever is larger (positions outside the
      // active range never get read so leaving stale data there is OK,
      // but we cover the union to keep the invariant simple).
      const oldMax = plan.maxIndex;
      const limit = oldMax >= max ? oldMax + 1 : need;
      plan.posByIndex.fill(0, 0, limit);
    }
    plan.maxIndex = max;
    let total = 0;
    for (let i = 0; i < entries.length; i++) {
      if (matchNthOfInner(entries[i], of)) {
        total++;
        plan.posByIndex[entries[i].index] = total;
      }
    }
    plan.total = total;
    plan.entriesRef = entries;
  }
  if (plan.total === 0) return false;
  if (spec.onlyChild && plan.total !== 1) return false;
  if (selfIdx > plan.maxIndex) return false;
  const filterPos = plan.posByIndex[selfIdx];
  if (filterPos === 0) return false;
  // 1-based position from start (filterPos) or end.
  return nthPositionMatches(spec, spec.fromEnd ? plan.total - filterPos + 1 : filterPos);
}

/** Initial capacity for the per-entry posByIndex pool. Doubles as needed.
 *  16 covers the typical small-list case without re-alloc. */
const NTH_OF_INITIAL_CAP = 16;

/**
 * Evaluate the inner branch of `:nth-child(of S)` against a sibling.
 * Mirrors `matchesHasInner` semantics: component-ref matches the
 * sibling's `styledComponentId`; attr selectors evaluate against the
 * sibling's props bag with the existing operator + case-flag rules.
 */
function matchNthOfInner(sibling: SiblingInfo, of: NthOfBranch): boolean {
  if (of.kind === 'component') return sibling.id === of.id;
  return attrValueMatches(of.attr, sibling.props[of.attr.name]);
}

function resolveBucket(
  entry: ConditionalStyle,
  env: ResolveEnv,
  varNormal: Dict<unknown> | null = null
): object {
  const resolved = entry.resolvers
    ? applyResolvers(entry.styles, entry.resolvers, env)
    : entry.styles;
  return varNormal !== null ? { ...resolved, ...varNormal } : resolved;
}

/**
 * AND-evaluate every (name, value?) pair in the bucket's chain. Boolean coercion
 * lets `aria-pressed={true}` and `aria-pressed="true"` both satisfy `value: 'true'`.
 */
export function attrMatches(entry: ConditionalStyle, props: Record<string, unknown>): boolean {
  const attrs = entry.attrs;
  if (!attrs || attrs.length === 0) return false;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (attrValueMatches(attr, props[attr.name]) === (attr.negate === true)) return false;
  }
  return true;
}

/**
 * Whether one attribute selector holds for the raw prop value: present, and when the selector names a
 * value, matching it. Boolean coercion lets `true` satisfy `'true'`.
 */
function attrValueMatches(attr: ConditionalAttr, raw: unknown): boolean {
  if (raw === undefined) return false;
  if (attr.value === undefined) return true;
  const stringified = typeof raw === 'boolean' ? (raw ? 'true' : 'false') : String(raw);
  const actual = attr.caseFlag === 'i' ? stringified.toLowerCase() : stringified;
  const expected = attr.caseFlag === 'i' ? attr.value.toLowerCase() : attr.value;
  return evaluateAttrOperator(attr.operator, actual, expected);
}

/**
 * Evaluate an attribute selector operator against the actual prop value. Default is
 * `=`. The caller pre-lowercases both operands when the `i` flag is present.
 */
function evaluateAttrOperator(
  operator: '=' | '~=' | '|=' | '^=' | '$=' | '*=' | undefined,
  actual: string,
  expected: string
): boolean {
  switch (operator) {
    case undefined:
    case '=':
      return actual === expected;
    case '~=': {
      // Whitespace-separated list contains `expected` as a complete word.
      if (expected.length === 0) return false;
      // Reject expected values with whitespace (per spec: matches nothing).
      for (let i = 0; i < expected.length; i++) {
        const c = expected.charCodeAt(i);
        if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) return false;
      }
      const tokens = actual.split(/\s+/);
      return tokens.indexOf(expected) !== -1;
    }
    case '|=':
      // Equals `expected` exactly OR begins with `expected-`.
      return actual === expected || actual.startsWith(expected + '-');
    case '^=':
      return expected.length > 0 && actual.startsWith(expected);
    case '$=':
      return expected.length > 0 && actual.endsWith(expected);
    case '*=':
      return expected.length > 0 && actual.indexOf(expected) !== -1;
  }
}
