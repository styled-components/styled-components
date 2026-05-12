import React, { createElement, Ref } from 'react';
import {
  getRN,
  matchMedia,
  MediaQueryEnv,
  useContainerContext,
  useMediaEnv,
} from '../native/responsive';
import {
  getAnimationAdapter,
  NOOP_ADAPTER,
  type AnimatedStyleInput,
} from '../native/animation/types';
import {
  ContainerContextValue,
  ContainerEntry,
  DEFAULT_CASCADE,
  DEFAULT_NATIVE_STYLE,
  EMPTY_CONTAINER_CTX,
  NativeCascadeValues,
  NativeStyleContext,
  NativeStyleContextValue,
} from '../native/NativeStyleContext';
import { DEFAULT_PARENT_CONTEXT, ParentContext, ParentContextValue } from '../native/ParentContext';
import { applyStylePolyfills, normalizeStyleForWeb } from '../native/polyfills';
import { applyResolvers, ResolveEnv } from '../native/transform/polyfills/resolvers';
import { concatSourceInputs } from '../parser/source';
import type {
  Attrs,
  BaseObject,
  CompiledAst,
  Dict,
  ExecutionContext,
  ExecutionProps,
  INativeStyleConstructor,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledStatics,
  NativeTarget,
  OmitNever,
  RuleSet,
  StyledOptions,
} from '../types';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import { themeValue } from '../utils/themePath';
import { tracePostAttr, type PostAttrsPlan } from '../utils/tracePostAttrs';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import generateDisplayName from '../utils/generateDisplayName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import { IS_RSC } from '../utils/isRsc';
import isStyledComponent from '../utils/isStyledComponent';
import shallowEqual from '../utils/shallowEqual';
import { warnOnce } from '../utils/warnOnce';
import type { NativeStyles, ConditionalStyle, ConditionalAttr, PseudoState } from './compileNative';
import { hasResponsiveOutput, SPECIAL_CASE_PROPS } from './compileNative';
import { DefaultTheme, ThemeContext } from './ThemeProvider';

let _View: any;
function get3dIsolationView(): any {
  if (!_View) _View = require('react-native').View;
  return _View;
}

const hasOwn = Object.prototype.hasOwnProperty;

const HOIST_EXCLUDE = {
  attrs: true,
  nativeStyle: true,
  displayName: true,
  shouldForwardProp: true,
  styledComponentId: true,
  target: true,
} as const;

function resolveContext<Props extends object>(
  theme: DefaultTheme = EMPTY_OBJECT,
  props: Props,
  attrs: Attrs<Props>[]
): ExecutionContext & Props {
  const context: ExecutionContext & Props = { ...props, theme };

  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    // Arity-2 function attrs run after compile in `applyPostAttrs` so they can
    // pop/peek the compiled style. Skip them in the pre-compile phase.
    if (isFunction(attr) && (attr as Function).length >= 2) continue;
    const resolvedAttrDef = isFunction(attr) ? attr({ ...context }) : attr;

    for (const key in resolvedAttrDef) {
      // Mirrors the web behavior (PR #5683): an explicit `undefined` prop
      // wins over an attrs-provided value so users can opt out of an attrs
      // default by passing `undefined`.
      if (key in props && (props as Dict<unknown>)[key] === undefined) continue;
      // attrs intentionally add arbitrary keys; cast at the assignment site.
      (context as unknown as Dict<unknown>)[key] = (resolvedAttrDef as Dict<unknown>)[key];
    }
  }

  return context;
}

function hasPostAttrsNative<Props extends object>(attrs: Attrs<Props>[]): boolean {
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i];
    if (typeof a === 'function' && (a as Function).length >= 2) return true;
  }
  return false;
}

/**
 * Walk the final attrs chain and trace each arity-2 callback against the
 * component's rules. Output is parallel-indexed with the arity-2 entries
 * in iteration order. A `null` slot signals an untraceable callback ;
 * the render path invokes the original function for that slot.
 */
function buildPostAttrsPlans<Props extends object>(
  attrs: Attrs<Props>[],
  rules: RuleSet<Props>
): ReadonlyArray<PostAttrsPlan | null> {
  const plans: (PostAttrsPlan | null)[] = [];
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i];
    if (typeof a !== 'function' || (a as Function).length < 2) continue;
    plans.push(tracePostAttr(a as (p: any, ast: CompiledAst) => any, rules));
  }
  return plans;
}

/** Merge an arity-2 attr's result bag (plan output OR runtime return) into context. */
function mergePostAttrsResult<Props extends object>(
  context: ExecutionContext & Props,
  props: Props,
  resolved: Dict<unknown>
): void {
  for (const key in resolved) {
    if (key in props && (props as Dict<unknown>)[key] === undefined) continue;
    (context as unknown as Dict<unknown>)[key] = resolved[key];
  }
}

/**
 * Post-compile attrs phase. Each arity-2 attr runs in order: a static
 * plan (folded at construction by `tracePostAttr`) merges directly into
 * context and applies pops to `effectiveBase`. Untraceable callbacks
 * fall back to runtime invocation with a live `ast` accessor over
 * `effectiveBase`. `effectiveBase` is the cloned compiled base;safe to
 * mutate; the canonical compiled object is left intact for cache reuse.
 */
function applyPostAttrs<Props extends object>(
  context: ExecutionContext & Props,
  props: Props,
  attrs: Attrs<Props>[],
  plans: ReadonlyArray<PostAttrsPlan | null> | undefined,
  effectiveBase: Dict<any>
): void {
  let ast: CompiledAst | null = null;
  let planIdx = 0;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (!isFunction(attr) || (attr as Function).length < 2) continue;
    const plan = plans !== undefined ? plans[planIdx] : null;
    planIdx++;

    if (plan !== null && plan !== undefined) {
      mergePostAttrsResult(context, props, plan.output);
      if (plan.popped !== null) {
        plan.popped.forEach(key => {
          delete effectiveBase[key];
        });
      }
      continue;
    }

    if (ast === null) {
      const theme = (context as { theme?: unknown }).theme;
      // Per-render lookup cache: same key resolved once. Theme-path walks
      // and effectiveBase reads alike skip on a cache hit. Pop's destructive
      // intent is preserved because the cached value is returned even after
      // the source slot is removed; the cache also makes pop idempotent
      // when called more than once with the same key in one render.
      const cache = new Map<string, unknown>();
      const lookup = (keyOrPath: string): unknown => {
        let v: unknown = cache.get(keyOrPath);
        if (v !== undefined || cache.has(keyOrPath)) return v;
        if (keyOrPath.indexOf('.') !== -1) {
          v = themeValue(theme, keyOrPath);
        } else {
          v = effectiveBase[keyOrPath];
        }
        cache.set(keyOrPath, v);
        return v;
      };
      ast = {
        pop(keyOrPath: string, fallback?: unknown): unknown {
          const v = lookup(keyOrPath);
          if (keyOrPath.indexOf('.') === -1) delete effectiveBase[keyOrPath];
          return v !== undefined ? v : fallback;
        },
        peek(keyOrPath: string, fallback?: unknown): unknown {
          const v = lookup(keyOrPath);
          return v !== undefined ? v : fallback;
        },
      } as CompiledAst;
    }
    const resolvedAttrDef = (
      attr as (p: ExecutionContext & Props, a: CompiledAst) => ExecutionProps & Partial<Props>
    )({ ...context }, ast);
    mergePostAttrsResult(context, props, resolvedAttrDef as Dict<unknown>);
  }
}

interface StyledComponentImplProps extends ExecutionProps {
  style?: any;
}

function buildPropsForElement(
  context: Record<string, any>,
  elementToBeCreated: NativeTarget,
  shouldForwardProp: ((prop: string, el: NativeTarget) => boolean) | undefined
): Dict<any> {
  const out: Dict<any> = {};
  for (const key in context) {
    if (key[0] === '$' || key === 'as' || key === 'theme' || key === 'ref') continue;
    else if (key === 'forwardedAs') {
      out.as = context[key];
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      out[key] = context[key];
    }
  }
  return out;
}

/**
 * The bottom of a `styled(styled(...))` chain;either a host string,
 * a component constructor, or nothing. Special-case dev warnings narrow
 * against this shape rather than `any`.
 */
type LeafTarget = string | { displayName?: string; name?: string } | null | undefined;

/**
 * Walk down through styled-component wrappers to the innermost native (or
 * unknown) leaf. Used to type-check special-case CSS like `line-clamp` ;
 * which only does something on `Text` / `TextInput`;even when the user
 * has wrapped Text once or twice with `styled(Text)\`...\``.
 */
function resolveLeafTarget(target: unknown): LeafTarget {
  let cur: unknown = target;
  while (cur && isStyledComponent(cur)) {
    cur = (cur as unknown as IStyledStatics<'native', BaseObject>).target;
  }
  return cur as LeafTarget;
}

function leafName(leaf: LeafTarget): string | undefined {
  if (typeof leaf === 'string') return leaf;
  if (leaf == null) return undefined;
  // RN core components are functions (typeof === 'function'), user wrappers
  // can be classes (typeof === 'object' or 'function'). Both expose
  // `displayName` / `name` as enumerable on the constructor.
  return leaf.displayName || leaf.name;
}

function targetMatchesValidOn(target: unknown, validOn: ReadonlyArray<string>): boolean {
  const name = leafName(resolveLeafTarget(target));
  if (name === undefined) return false;
  for (let i = 0; i < validOn.length; i++) if (name === validOn[i]) return true;
  return false;
}

const specialCaseWarned = new WeakSet<object>();

/**
 * Single owner of the trailing prop-finalization sequence shared by
 * useStaticImpl / useDynamicImpl. Builds the forwarded prop bag,
 * attaches the assembled style, lifts compiled special-case keys onto
 * the bag (e.g. `numberOfLines` from `line-clamp`), and forwards the ref.
 */
function finalizeElementProps(
  source: Record<string, any>,
  elementToBeCreated: NativeTarget,
  shouldForwardProp: ((prop: string, el: NativeTarget) => boolean) | undefined,
  style: any,
  specialCases: Dict<any> | undefined,
  forwardedRef: Ref<any> | undefined,
  forwardedComponent: IStyledComponent<'native', any>
): Dict<any> {
  const elementProps = buildPropsForElement(source, elementToBeCreated, shouldForwardProp);
  elementProps.style = style;
  applySpecialCases(elementProps, specialCases, elementToBeCreated, forwardedComponent);
  if (forwardedRef) elementProps.ref = forwardedRef;
  return elementProps;
}

/**
 * Spread compiled special-case props (e.g. `numberOfLines` from `line-clamp`)
 * onto element props with USER PROPS WINNING;mirrors how user `style`
 * overrides compiled styles. Emits a one-time dev warning when the rendered
 * element type doesn't read the prop (e.g. `line-clamp` on a `View`).
 */
function applySpecialCases(
  elementProps: Dict<any>,
  specialCases: Dict<any> | undefined,
  effectiveTarget: unknown,
  warningKey: object
): void {
  if (!specialCases) return;
  for (const k in specialCases) {
    const meta = SPECIAL_CASE_PROPS[k];
    const priority = meta !== undefined && meta.priority !== undefined ? meta.priority : 0;
    if (priority > 0) {
      // Priority keys (CSS UI 4 §6.3 `interactivity: inert`) overwrite
      // the user value. Spec requires the underlying surfaces (hit-
      // testing / a11y / focus / selection / editable) to behave as if
      // the prop had the inert value regardless of what the author
      // wrote.
      elementProps[k] = specialCases[k];
    } else if (!(k in elementProps)) {
      elementProps[k] = specialCases[k];
    }
    if (__DEV__) {
      if (meta && !targetMatchesValidOn(effectiveTarget, meta.validOn)) {
        if (!specialCaseWarned.has(warningKey)) {
          specialCaseWarned.add(warningKey);
          const name = leafName(resolveLeafTarget(effectiveTarget)) ?? 'this component';
          const validList = meta.validOn.map(n => `<${n}>`).join(' or ');
          warnOnce(
            'native-special-case-target',
            `\`${meta.source}\` only works on ${validList} in React Native, but it's being applied to <${name}>. \`${meta.source}\` maps to React Native's \`${k}\` prop, which ${validList} reads;other components will ignore it.`,
            meta.source + ':' + name
          );
        }
      }
    }
  }
}

const EMPTY_INSETS = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

function buildResolveEnv(
  env: MediaQueryEnv,
  containerCtx: ContainerContextValue,
  theme: Record<string, any>,
  cascade: NativeCascadeValues
): ResolveEnv {
  return {
    media: env,
    container: containerCtx.nearest,
    theme: theme ?? EMPTY_OBJECT,
    insets: EMPTY_INSETS,
    rootFontSize: cascade.rootFontSize,
    fontSize: cascade.fontSize,
    lineHeight: cascade.lineHeight,
    direction: cascade.direction,
  };
}

/**
 * Derive the cascade values to publish to descendants from the
 * resolved style. Returns the original `inherited` reference when no
 * cascade-relevant property fires (the caller skips the Provider
 * wrap), otherwise a fresh merged cascade.
 *
 * Single right-to-left walk over array layers (matches RN's array-style
 * merge semantics — last write wins). Each layer captures all three
 * fields at once. The common case is a flat object with no cascade-
 * relevant property, which returns after one object visit.
 */
function computePublishedCascade(
  inherited: NativeCascadeValues,
  resolvedStyle: any
): NativeCascadeValues {
  // Refs box let the recursive walker write back via a single
  // out-param without leaking allocations on the hot path.
  const slots: [unknown, unknown, unknown] = [undefined, undefined, undefined];
  collectCascadeSlots(resolvedStyle, slots);
  const [fs, lh, dir] = slots;
  if (fs === undefined && lh === undefined && dir === undefined) return inherited;
  const fontSize = typeof fs === 'number' ? fs : inherited.fontSize;
  const lineHeight = typeof lh === 'number' ? lh : inherited.lineHeight;
  const direction: 'ltr' | 'rtl' = dir === 'rtl' || dir === 'ltr' ? dir : inherited.direction;
  if (
    fontSize === inherited.fontSize &&
    lineHeight === inherited.lineHeight &&
    direction === inherited.direction
  ) {
    return inherited;
  }
  return { fontSize, lineHeight, rootFontSize: inherited.rootFontSize, direction };
}

function collectCascadeSlots(style: any, slots: [unknown, unknown, unknown]): boolean {
  if (style === null || style === undefined) return false;
  if (Array.isArray(style)) {
    for (let i = style.length - 1; i >= 0; i--) {
      if (collectCascadeSlots(style[i], slots)) return true;
    }
    return false;
  }
  if (typeof style !== 'object') return false;
  if (slots[0] === undefined && 'fontSize' in style) slots[0] = style.fontSize;
  if (slots[1] === undefined && 'lineHeight' in style) slots[1] = style.lineHeight;
  if (slots[2] === undefined && 'direction' in style) slots[2] = style.direction;
  return slots[0] !== undefined && slots[1] !== undefined && slots[2] !== undefined;
}

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

function conditionMatches(
  entry: ConditionalStyle,
  env: MediaQueryEnv,
  containerCtx: Pick<ContainerContextValue, 'named' | 'nearest'>
): boolean {
  if (entry.type === 'media' || entry.type === 'supports') {
    return matchMedia(entry.condition, env);
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

// Pseudo-gated buckets are owned by the state callback; this walker
// is fed a precomputed `nonPseudoEntries` subset from compileNative so
// the per-render loop never iterates pseudo entries.
function matchConditionals(
  entries: ConditionalStyle[],
  env: MediaQueryEnv,
  containerCtx: Pick<ContainerContextValue, 'named' | 'nearest'>,
  props: Record<string, unknown>,
  resolveEnv: ResolveEnv,
  parentCtx: ParentContextValue
): object[] {
  const out: object[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.type === 'attr') {
      const matches = attrMatches(entry, props);
      if (entry.negate ? !matches : matches) out.push(resolveBucket(entry, resolveEnv));
      continue;
    }
    if (entry.type === 'combinator') {
      if (!combinatorMatches(entry, parentCtx)) continue;
      out.push(resolveBucket(entry, resolveEnv));
      continue;
    }
    if (entry.type === 'nthChild') {
      const matches = nthChildMatches(entry, parentCtx);
      if (entry.negate ? !matches : matches) out.push(resolveBucket(entry, resolveEnv));
      continue;
    }
    if (entry.type === 'has') {
      const matches = hasMatches(entry, props.children as React.ReactNode);
      if (entry.negate ? !matches : matches) out.push(resolveBucket(entry, resolveEnv));
      continue;
    }
    // media / container / supports;optionally gated on attrs too
    // when the at-rule body contained a nested attribute selector.
    if (!conditionMatches(entry, env, containerCtx)) continue;
    if (entry.attrs && !attrMatches(entry, props)) continue;
    out.push(resolveBucket(entry, resolveEnv));
  }
  return out;
}

/**
 * CSS Selectors 4 §15 — descendant / child combinator match against
 * the parent context. `condition` holds the ancestor styled-component
 * id; `combinator` selects between `descendant` (anywhere up the
 * chain) and `child` (only the immediate styled parent).
 *
 * Chain semantics: every styled component publishes ParentContext via
 * `wrapParentContext` from both useStaticImpl and useDynamicImpl, so
 * it becomes the new immediate parent for its subtree. Non-styled
 * components (`View`, `Text`, host elements) are transparent — React
 * Context propagation hands the surrounding styled parent's value
 * through unchanged. Consequence: a styled intermediary between the
 * matching ancestor and the matched component intercepts the child
 * combinator (new parentId) but not the descendant combinator (the
 * ancestor remains in `ancestors`).
 */
function combinatorMatches(entry: ConditionalStyle, parentCtx: ParentContextValue): boolean {
  const ancestorId = entry.condition;
  if (entry.combinator === 'child') return parentCtx.parentId === ancestorId;
  if (entry.combinator === 'adjacent-sibling') return parentCtx.prevSiblingId === ancestorId;
  if (entry.combinator === 'general-sibling') {
    const prev = parentCtx.prevSiblings;
    for (let i = 0; i < prev.length; i++) {
      if (prev[i] === ancestorId) return true;
    }
    return false;
  }
  // descendant — match the immediate parent OR any further ancestor.
  if (parentCtx.parentId === ancestorId) return true;
  const ancestors = parentCtx.ancestors;
  for (let i = 0; i < ancestors.length; i++) {
    if (ancestors[i] === ancestorId) return true;
  }
  return false;
}

/**
 * CSS Selectors 4 §9 — tree-structural pseudo-class match against
 * ParentContext's sibling position. Reads `siblingIndex` /
 * `totalSiblings` / `siblingIndexOfType` (and the parent's
 * same-target sibling totals reconstructed from the ofType counter
 * plus the published indexes). The matcher uses 1-based CSS position;
 * `fromEnd` flips the direction; `onlyChild` adds a total === 1 gate.
 *
 * When the styled component has no surrounding styled parent that
 * published per-child indexing, `siblingIndex` is -1 — return false
 * (no sibling info, no match).
 */
/**
 * CSS Selectors 4 §13.1 — `&:has(<simple>)` match against the
 * element's own children subtree. Walks `props.children` recursively,
 * short-circuiting on the first descendant that satisfies the inner
 * predicate.
 *
 * Scope: only inspects React-element descendants; non-element children
 * (text, numbers, null) can't carry a `styledComponentId` or props of
 * interest. Compiled / memoized JSX trees in `children` work fine —
 * `React.Children.forEach` handles arrays and fragments transparently.
 * `:has` cannot see descendants that only appear after a child
 * component's render returns (e.g. inside a `useMemo` body), since the
 * walk reads pre-render `props.children` only.
 */
function hasMatches(entry: ConditionalStyle, children: React.ReactNode): boolean {
  const inner = entry.hasInner;
  if (!inner) return false;
  return walkForHas(children, inner);
}

function walkForHas(
  children: React.ReactNode,
  inner: { kind: 'component'; id: string } | { kind: 'attr'; attr: ConditionalAttr }
): boolean {
  let found = false;
  React.Children.forEach(children, child => {
    if (found) return;
    if (!React.isValidElement(child)) return;
    if (matchesHasInner(child, inner)) {
      found = true;
      return;
    }
    const grand = (child.props as { children?: React.ReactNode }).children;
    if (grand !== undefined && grand !== null && walkForHas(grand, inner)) {
      found = true;
    }
  });
  return found;
}

function matchesHasInner(
  el: React.ReactElement,
  inner: { kind: 'component'; id: string } | { kind: 'attr'; attr: ConditionalAttr }
): boolean {
  if (inner.kind === 'component') {
    const type = el.type as { styledComponentId?: string } | string;
    return typeof type !== 'string' && type.styledComponentId === inner.id;
  }
  // attr
  const attr = inner.attr;
  const props = el.props as Record<string, unknown>;
  const raw = props[attr.name];
  if (raw === undefined) return false;
  if (attr.value === undefined) return true;
  const str = typeof raw === 'boolean' ? (raw ? 'true' : 'false') : String(raw);
  const actual = attr.caseFlag === 'i' ? str.toLowerCase() : str;
  const expected = attr.caseFlag === 'i' ? attr.value.toLowerCase() : attr.value;
  return evaluateAttrOperator(attr.operator, actual, expected);
}

function nthChildMatches(entry: ConditionalStyle, parentCtx: ParentContextValue): boolean {
  const spec = entry.nthSpec;
  if (spec === undefined) return false;
  const idx = spec.ofType ? parentCtx.siblingIndexOfType : parentCtx.siblingIndex;
  if (idx < 0) return false;
  const tot = spec.ofType ? parentCtx.totalSiblingsOfType : parentCtx.totalSiblings;
  if (spec.onlyChild && tot !== 1) return false;
  // 1-based position from start or end.
  const pos = spec.fromEnd ? tot - idx : idx + 1;
  if (pos < 1) return false;
  if (spec.a === 0) return pos === spec.b;
  const k = (pos - spec.b) / spec.a;
  return k >= 0 && Math.floor(k) === k;
}

function resolveBucket(entry: ConditionalStyle, env: ResolveEnv): object {
  return entry.resolvers ? applyResolvers(entry.styles, entry.resolvers, env) : entry.styles;
}

/**
 * AND-evaluate every (name, value?) pair in the bucket's chain.
 * Compound selectors (`&[a][b]`) require both attributes present;
 * single-attr is the n=1 case. Boolean coercion lets
 * `aria-pressed={true}` and `aria-pressed="true"` both satisfy
 * `value: 'true'`.
 */
function attrMatches(entry: ConditionalStyle, props: Record<string, unknown>): boolean {
  const attrs = entry.attrs;
  if (!attrs || attrs.length === 0) return false;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    const raw = props[attr.name];
    if (raw === undefined) return false;
    if (attr.value !== undefined) {
      const stringified = typeof raw === 'boolean' ? (raw ? 'true' : 'false') : String(raw);
      const actual = attr.caseFlag === 'i' ? stringified.toLowerCase() : stringified;
      const expected = attr.caseFlag === 'i' ? attr.value.toLowerCase() : attr.value;
      if (!evaluateAttrOperator(attr.operator, actual, expected)) return false;
    }
  }
  return true;
}

/**
 * CSS Selectors 4 §6.2 — evaluate an attribute selector operator
 * against the actual prop value. Default operator is `=` (exact).
 * Case-sensitivity (§6.3) is handled by the caller pre-lowercasing
 * both operands when the `i` flag is present.
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

// Maps our pseudo-state names to the field RN's `style` callback exposes.
const PSEUDO_TO_STATE_KEY: Record<PseudoState, 'pressed' | 'hovered' | 'focused' | 'disabled'> = {
  pressed: 'pressed',
  hover: 'hovered',
  focus: 'focused',
  disabled: 'disabled',
};

function pseudoActive(
  pseudo: PseudoState,
  state: { pressed?: boolean; hovered?: boolean; focused?: boolean; disabled?: boolean }
): boolean {
  return !!state[PSEUDO_TO_STATE_KEY[pseudo]];
}

function pseudoStylesForState(
  entries: ConditionalStyle[],
  state: { pressed?: boolean; hovered?: boolean; focused?: boolean; disabled?: boolean },
  env: MediaQueryEnv,
  containerCtx: Pick<ContainerContextValue, 'named' | 'nearest'>,
  props: Record<string, unknown>,
  resolveEnv: ResolveEnv,
  parentCtx: ParentContextValue
): object[] {
  // Caller passes the precomputed `pseudoEntries` subset; every entry
  // is guaranteed pseudo-bearing (either `type==='pseudo'` or a
  // compound carrying `entry.pseudo`), so the inner branches skip the
  // membership re-check.
  const out: object[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.type === 'pseudo') {
      const active = pseudoActive(entry.condition as PseudoState, state);
      if (entry.negate ? !active : active) out.push(resolveBucket(entry, resolveEnv));
      continue;
    }
    // Compound: entry.pseudo is guaranteed set here.
    if (!pseudoActive(entry.pseudo!, state)) continue;
    // Attrs AND-gate for compound forms like `&[disabled]:hover`.
    if (entry.attrs) {
      const attrOk = attrMatches(entry, props);
      if (entry.negate ? attrOk : !attrOk) continue;
    }
    // Structural AND-gate for Tier 2 combinations like
    // `&:nth-child(2):hover` or `${Foo} > &:active`.
    if (entry.type === 'combinator') {
      if (!combinatorMatches(entry, parentCtx)) continue;
    } else if (entry.type === 'nthChild') {
      const matches = nthChildMatches(entry, parentCtx);
      if (entry.negate ? matches : !matches) continue;
    } else if (entry.type === 'has') {
      const matches = hasMatches(entry, props.children as React.ReactNode);
      if (entry.negate ? matches : !matches) continue;
    } else if (entry.type !== 'attr' && !conditionMatches(entry, env, containerCtx)) {
      // media / container / supports environmental gate.
      continue;
    }
    out.push(resolveBucket(entry, resolveEnv));
  }
  return out;
}

// [props, theme, propsKeyCount, context, compiled, env, nativeStyleCtx,
//  composedStyle, elementToBeCreated, elementProps, resolveEnv, effectiveBase]
//
// Slot 6 holds the full NativeStyleContext (container + cascade), not
// just the container. The cache must invalidate when an ancestor
// publishes a fresh cascade (font-size / line-height / direction)
// even if the container side is unchanged — otherwise em / lh /
// `text-align: start | end` / sentinel-base relative colors render
// with stale `ResolveEnv` values.
type RenderCache = [
  object,
  DefaultTheme | undefined,
  number,
  object,
  NativeStyles,
  MediaQueryEnv,
  NativeStyleContextValue,
  any,
  NativeTarget,
  Dict<any>,
  ResolveEnv,
  Dict<any>,
];

/**
 * Compose a static `base` style with the user-supplied `props.style`. RN's
 * `Pressable`/`TextInput` accept a function for `style` (state callback);
 * pass-through that shape by wrapping the function call.
 *
 * `normalizeStyleForWeb` is invoked on the user-supplied side; it patches
 * around rn-web's translation gaps (e.g. 16-element matrix transforms).
 * It's a no-op on native and returns the same reference when no rewrite
 * is needed, so identity-based caches downstream stay intact.
 */
export function composeBase(base: object, userStyle: any): any {
  if (userStyle === undefined || userStyle === null) return base;
  if (isFunction(userStyle)) {
    return (state: any) => {
      const u = normalizeStyleForWeb(userStyle(state));
      return Array.isArray(u) ? [base].concat(u) : [base, u];
    };
  }
  const normalized = normalizeStyleForWeb(userStyle);
  return Array.isArray(normalized) ? [base as object].concat(normalized) : [base, normalized];
}

/**
 * Resolve the runtime container name for a component. Returns the
 * explicit `container-name` CSS value if the user wrote one, otherwise
 * the component's `styledComponentId` so anonymous-from-CSS containers
 * still have a stable identity for the runtime publisher and for
 * `${Component}` interpolation in `@container <name>` queries.
 *
 * Returns `undefined` when the component doesn't declare any
 * containment (`container-type` absent or set to `normal`); the
 * render path uses that to short-circuit `ContainerPublisher`.
 */
function resolveContainerName(
  info: NativeStyles['containerInfo'] | undefined,
  styledComponentId: string
): string | undefined {
  if (!info) return undefined;
  return info.explicitName ?? styledComponentId;
}

/**
 * Inject `container-name: <styledComponentId>` into the rendered
 * style when a component declares `container-type` without an
 * explicit `container-name`. Lets rn-web emit the matching CSS so
 * `@container <id> (...)` queries written via `${Component}`
 * interpolation match against the source on the browser side; on
 * native this prop is ignored by the view manager (the runtime
 * publisher carries the same name through `ContainerContext`).
 */
function appendStyle(composed: any, extra: object): any {
  if (composed === undefined || composed === null) return extra;
  if (isFunction(composed)) {
    return (state: any) => {
      const u = composed(state);
      return Array.isArray(u) ? [...u, extra] : [u, extra];
    };
  }
  return Array.isArray(composed) ? [...composed, extra] : [composed, extra];
}

function injectAutoContainerName(
  composed: any,
  info: NativeStyles['containerInfo'] | undefined,
  styledComponentId: string
): any {
  if (!info || info.explicitName !== undefined) return composed;
  return appendStyle(composed, { containerName: styledComponentId });
}

function composeStaticStyle(
  compiled: NativeStyles,
  userStyle: any,
  styledComponentId: string
): any {
  const composed = composeBase(compiled.base, userStyle);
  return injectAutoContainerName(composed, compiled.containerInfo, styledComponentId);
}

function createFastElement(
  elementToBeCreated: NativeTarget,
  elementProps: Dict<any>,
  containerName: string | undefined
): React.ReactElement {
  if (containerName) {
    return createElement(StaticContainerPublisherDispatch, {
      name: containerName,
      elementType: elementToBeCreated,
      elementProps,
    });
  }
  return createElement(elementToBeCreated, elementProps);
}

interface StaticContainerPublisherDispatchProps {
  name: string;
  elementType: NativeTarget;
  elementProps: Dict<any>;
}

/**
 * Container-publish dispatch for the static path. `NativeStyleContext`
 * is read only when the rendered component declares `container-type`
 * in its CSS, so the common case of a non-container component pays no
 * useContext for the container/cascade pair.
 */
function StaticContainerPublisherDispatch({
  name,
  elementType,
  elementProps,
}: StaticContainerPublisherDispatchProps): React.ReactElement {
  const parent = React.useContext(NativeStyleContext);
  return createElement(ContainerPublisher, {
    name,
    parent,
    cascadeOverride: null,
    elementType,
    elementProps,
  } as ContainerPublisherProps);
}

// Eligibility is frozen at construction (INativeStyle.staticEligible) so hook
// ordering stays stable. Reads ParentContext so descendants of this
// element see it as an ancestor under Tier 2 combinator selectors
// (`${Foo} &`, `${Foo} > &`). Without this read, every static-eligible
// styled component would be invisible to the chain — which would mean
// `${Foo} &` only matches when Foo happens to have responsive CSS.
function useStaticImpl<Props extends StyledComponentImplProps>(
  forwardedComponent: IStyledComponent<'native', Props>,
  props: Props,
  forwardedRef: Ref<any> | undefined
): React.ReactElement {
  const { nativeStyle, target, styledComponentId } = forwardedComponent;
  const compiled = nativeStyle.staticCompiled!;
  const elementToBeCreated: NativeTarget = (props.as as NativeTarget) || target;
  const containerName = resolveContainerName(compiled.containerInfo, styledComponentId);
  const elementProps = finalizeElementProps(
    props,
    elementToBeCreated,
    undefined,
    composeStaticStyle(compiled, props.style, styledComponentId),
    compiled.specialCases,
    forwardedRef,
    forwardedComponent
  );
  if (IS_RSC) {
    return createFastElement(
      elementToBeCreated,
      applyStylePolyfills(elementProps as Record<string, unknown>) as Dict<any>,
      containerName
    );
  }
  const parentCtx = React.useContext(ParentContext);
  const publishCacheRef = React.useRef<ParentPublishCache | null>(null);
  if (publishCacheRef.current === null) publishCacheRef.current = createParentPublishCache();
  // Index sibling positions BEFORE running polyfills + createFastElement
  // so per-child Providers attach to user JSX even when a container
  // wrap is in the way (createFastElement would otherwise hand the
  // host construction to StaticContainerPublisherDispatch, hiding the
  // children).
  const publishedValue = buildPublishedParentValue(
    publishCacheRef.current,
    parentCtx,
    styledComponentId,
    elementToBeCreated
  );
  const effectiveProps =
    publishedValue !== null
      ? withIndexedChildren(
          elementProps,
          indexStyledChildren(publishCacheRef.current, elementProps.children, publishedValue)
        )
      : elementProps;
  const inner = createFastElement(
    elementToBeCreated,
    applyStylePolyfills(effectiveProps as Record<string, unknown>) as Dict<any>,
    containerName
  );
  return publishedValue !== null
    ? createElement(ParentContext.Provider, { value: publishedValue }, inner)
    : inner;
}

/**
 * Render path for any component that needs runtime work: `attrs`,
 * `shouldForwardProp`, function interpolations, responsive features
 * (`@media`, `@container`, `@supports`, pseudo states, attribute
 * selectors, theme tokens, viewport units), animations, transitions,
 * `@starting-style`, or container publishing.
 *
 * Hooks (5, stable per component lifetime): useContext (theme),
 * useMediaEnv, useContainerContext, useRef (cache),
 * adapter.useAnimatedStyle.
 *
 * Tier'd cache:
 *  - Full hit (props/theme/env/containerCtx all reference-equal): reuse
 *    every cached field including elementProps. The adapter is still
 *    invoked for hook-order, but on stable inputs the default adapter
 *    returns the same style and wrapped element-type references it
 *    returned last render, so the cached elementProps stays valid.
 *  - Partial hit (props/theme equal, env or containerCtx changed):
 *    reuse compile, re-run assembly so media/container buckets and
 *    viewport/container-unit resolvers reflect the new env.
 *  - Miss: re-resolve attrs, recompile.
 *
 * Components with provably-static CSS (no responsive features, no
 * animations, no cascade-significant declarations) bypass this path
 * entirely and use `useStaticImpl`, which reads `ParentContext` and a
 * memoization ref but skips theme / env / container subscription and
 * the full assembly pipeline.
 */
function useDynamicImpl<Props extends StyledComponentImplProps>(
  forwardedComponent: IStyledComponent<'native', Props>,
  props: Props,
  forwardedRef: Ref<any> | undefined
) {
  const { attrs: componentAttrs, nativeStyle, shouldForwardProp, target } = forwardedComponent;

  const contextTheme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
  const theme = determineTheme(props, contextTheme) || EMPTY_OBJECT;

  const env = useMediaEnv();
  // Consolidated native render state: container + cascade live behind a
  // single provider so a parent's font-size / line-height / direction
  // changes invalidate the cache cleanly. Tier 2 selectors (`>`, `+`,
  // `~`, `:nth-child`, `:has`) read sibling / ancestor info from
  // ParentContext.
  const nativeStyleCtx = !IS_RSC ? React.useContext(NativeStyleContext) : DEFAULT_NATIVE_STYLE;
  const containerCtx = nativeStyleCtx.container;
  const parentCtx = !IS_RSC ? React.useContext(ParentContext) : DEFAULT_PARENT_CONTEXT;

  const renderCacheRef = (!IS_RSC ? React.useRef<RenderCache | null>(null) : { current: null }) as {
    current: RenderCache | null;
  };
  const prev = renderCacheRef.current;
  const publishCacheRef = (
    !IS_RSC ? React.useRef<ParentPublishCache | null>(null) : { current: null }
  ) as { current: ParentPublishCache | null };
  if (!IS_RSC && publishCacheRef.current === null) {
    publishCacheRef.current = createParentPublishCache();
  }

  let context: ExecutionContext & Props;
  let compiled: NativeStyles;
  let composedStyle: any;
  let elementToBeCreated: NativeTarget;
  let resolveEnv: ResolveEnv;
  let effectiveBase: Dict<any>;
  let propsKeyCount = prev !== null ? prev[2] : 0;

  const propsMatch = prev !== null && prev[1] === theme && shallowEqual(prev[0], props, prev[2]);
  const fullHit = propsMatch && prev![5] === env && prev![6] === nativeStyleCtx;

  if (fullHit) {
    context = prev![3] as typeof context;
    compiled = prev![4];
    composedStyle = prev![7];
    elementToBeCreated = prev![8];
    resolveEnv = prev![10];
    effectiveBase = prev![11];
  } else {
    if (propsMatch) {
      context = prev![3] as typeof context;
      compiled = prev![4];
      elementToBeCreated = prev![8];
      // post-attrs effects depend only on props/theme/context+compiled, all
      // stable on a partial hit, so the cached effectiveBase is reusable.
      effectiveBase = prev![11];
    } else {
      context = resolveContext<Props>(theme, props, componentAttrs);
      compiled = nativeStyle.compile(context) as NativeStyles;
      // resolveContext spreads props before applying attrs, so context.as already
      // covers props.as; no separate fallback needed.
      elementToBeCreated = (context.as as NativeTarget | undefined) || target;
      propsKeyCount = 0;
      for (const key in props) {
        if (hasOwn.call(props, key)) propsKeyCount++;
      }
      // Post-compile attrs phase: clone `compiled.base` (canonical, must stay
      // intact for cache reuse) and run arity-2 attrs in order. Each attr
      // either applies a static plan (folded at construction) or invokes
      // its callback at runtime via the `ast` accessor. Skipped entirely
      // when no arity-2 attrs are present (zero overhead for the common case).
      if (forwardedComponent.hasPostAttrs === true) {
        effectiveBase = { ...compiled.base };
        applyPostAttrs<Props>(
          context,
          props,
          componentAttrs,
          forwardedComponent.postAttrsPlans,
          effectiveBase
        );
      } else {
        effectiveBase = compiled.base;
      }
    }
    resolveEnv = buildResolveEnv(
      env,
      containerCtx,
      theme as Record<string, any>,
      nativeStyleCtx.cascade
    );
    const baseOverride = effectiveBase !== compiled.base ? effectiveBase : undefined;
    const baseComposed = hasResponsiveOutput(compiled)
      ? assembleFinalStyle(
          compiled,
          env,
          containerCtx,
          theme,
          props.style,
          // Generic Props can't structurally satisfy `Record<string, unknown>`
          // (TS lacks unsealed-object covariance); normalize at the boundary.
          props as Record<string, unknown>,
          baseOverride,
          nativeStyleCtx.cascade,
          parentCtx
        )
      : composeBase(effectiveBase, props.style);
    composedStyle = injectAutoContainerName(
      baseComposed,
      compiled.containerInfo,
      forwardedComponent.styledComponentId
    );
  }

  const animationAdapter = getAnimationAdapter() ?? NOOP_ADAPTER;
  const userProps = props as Props & {
    onAnimationEnd?: AnimatedStyleInput['onAnimationEnd'];
    onTransitionEnd?: AnimatedStyleInput['onTransitionEnd'];
  };
  const animInput: AnimatedStyleInput = {
    compiled,
    resolved: composedStyle,
    target: elementToBeCreated,
    env: resolveEnv,
  };
  if (userProps.onAnimationEnd !== undefined) animInput.onAnimationEnd = userProps.onAnimationEnd;
  if (userProps.onTransitionEnd !== undefined)
    animInput.onTransitionEnd = userProps.onTransitionEnd;
  const animOut = animationAdapter.useAnimatedStyle(animInput);

  let elementProps: Dict<any>;
  // Adapters with off-React state machinery (allow-discrete 50% flip,
  // for example) signal `invalidateCache` to force an elementProps
  // rebuild when their internal state changed despite stable inputs.
  if (fullHit && !animOut.invalidateCache) {
    elementProps = prev![9];
  } else {
    elementProps = applyStylePolyfills(
      finalizeElementProps(
        context,
        animOut.elementType,
        shouldForwardProp,
        animOut.style,
        compiled.specialCases,
        forwardedRef,
        forwardedComponent
      ) as Record<string, unknown>
    ) as Dict<any>;
    renderCacheRef.current = [
      props,
      theme,
      propsKeyCount,
      context,
      compiled,
      env,
      nativeStyleCtx,
      composedStyle,
      elementToBeCreated,
      elementProps,
      resolveEnv,
      effectiveBase,
    ];
  }

  // `field-sizing: content` dev guard. The polyfill lifts `multiline:
  // true` via SPECIAL_CASE_PROPS, and RN's Yoga measure callback for a
  // multiline TextInput grows the view to its text size on its own. If
  // the user passed `multiline={false}`, the lift is voided and the
  // input renders single-line — warn so the missing autosize is
  // visible. Skipped on rn-web (browser handles `field-sizing`
  // natively against the textarea the polyfill also lifts).
  if (
    __DEV__ &&
    !__NATIVE_WEB__ &&
    compiled.fieldSizing === 'content' &&
    elementProps.multiline === false
  ) {
    warnOnce(
      'native-field-sizing-needs-multiline',
      '`field-sizing: content` requires `multiline={true}` so React Native renders the input as a multiline TextInput that can grow with its content. The component received `multiline={false}` and will render at a fixed single-line height instead. Drop the explicit `multiline` prop or remove the `field-sizing: content` declaration.'
    );
  }

  const containerName = resolveContainerName(
    compiled.containerInfo,
    forwardedComponent.styledComponentId
  );
  // Compute the cascade to publish to descendants. The fast path
  // returns the same reference as the inherited cascade when this
  // component declares no font-size / line-height / direction, so
  // the Provider wrap below short-circuits.
  const publishedCascade = computePublishedCascade(nativeStyleCtx.cascade, composedStyle);
  const cascadeChanged = publishedCascade !== nativeStyleCtx.cascade;

  // Publish this component's identity to descendants so Tier 2
  // combinator selectors (`${Foo} &`, `${Foo} > &`) can match. Index
  // child sibling position BEFORE layering any cascade / container /
  // isolate-3d Provider wrap, otherwise the per-child Providers would
  // attach to the wrapper rather than the host's user JSX.
  const publishCache = !IS_RSC ? publishCacheRef.current! : createParentPublishCache();
  const publishedValue = buildPublishedParentValue(
    publishCache,
    parentCtx,
    forwardedComponent.styledComponentId,
    animOut.elementType
  );
  const effectiveProps =
    publishedValue !== null
      ? withIndexedChildren(
          elementProps,
          indexStyledChildren(publishCache, elementProps.children, publishedValue)
        )
      : elementProps;

  let inner: React.ReactElement;
  if (containerName !== undefined) {
    inner = createElement(ContainerPublisher, {
      name: containerName,
      parent: nativeStyleCtx,
      cascadeOverride: cascadeChanged ? publishedCascade : null,
      elementType: animOut.elementType,
      elementProps: effectiveProps,
    } as ContainerPublisherProps);
  } else {
    inner = createElement(animOut.elementType, effectiveProps);
    if (animOut.isolate3d) {
      inner = createElement(get3dIsolationView(), { collapsable: false }, inner);
    }
    if (cascadeChanged) {
      inner = createElement(
        NativeStyleContext.Provider,
        { value: { container: nativeStyleCtx.container, cascade: publishedCascade } },
        inner
      );
    }
  }

  return publishedValue !== null
    ? createElement(ParentContext.Provider, { value: publishedValue }, inner)
    : inner;
}

/**
 * Compute the {@link ParentContextValue} this component publishes to
 * descendants. Identity = `styledComponentId` + element target; the
 * ancestor chain accumulates the parent's so descendant combinators
 * can match an ancestor anywhere up the tree.
 *
 * Returns `null` when the inherited `parentId` already equals this
 * component's id (defensive — would accumulate duplicates on
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
function buildPublishedParentValue(
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
      siblingIndexOfType: -1,
      totalSiblingsOfType: 0,
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
  perChildValue: ParentContextValue;
}

interface ParentPublishCache {
  publishedKeyParentCtx: ParentContextValue | null;
  publishedKeyElementType: NativeTarget | null;
  publishedValue: ParentContextValue | null;
  perChild: Array<PerChildCacheEntry | null>;
}

function createParentPublishCache(): ParentPublishCache {
  return {
    publishedKeyParentCtx: null,
    publishedKeyElementType: null,
    publishedValue: null,
    perChild: [],
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
 * so callers can reuse the original `elementProps` reference and keep
 * the render cache identity intact.
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
function indexStyledChildren(
  cache: ParentPublishCache,
  children: React.ReactNode,
  parentValue: ParentContextValue
): React.ReactNode {
  if (children === undefined || children === null) return children;
  if (typeof children === 'string' || typeof children === 'number') return children;

  const arr = React.Children.toArray(children);
  if (arr.length === 0) return children;

  // First pass: identify styled children + total per target. Second
  // pass: compute per-child positions and wrap with Provider.
  const total = arr.length;
  const childIds: Array<string | null> = new Array(total);
  const childTargets: Array<NativeTarget | null> = new Array(total);
  const totalsByTarget = new Map<NativeTarget, number>();
  let hasAnyStyled = false;
  for (let i = 0; i < total; i++) {
    const c = arr[i];
    if (React.isValidElement(c)) {
      const tp = c.type as { styledComponentId?: string; target?: NativeTarget } | string;
      if (typeof tp !== 'string' && tp.styledComponentId !== undefined) {
        childIds[i] = tp.styledComponentId;
        const target = tp.target ?? null;
        childTargets[i] = target;
        hasAnyStyled = true;
        if (target !== null) {
          totalsByTarget.set(target, (totalsByTarget.get(target) ?? 0) + 1);
        }
        continue;
      }
    }
    childIds[i] = null;
    childTargets[i] = null;
  }
  if (!hasAnyStyled) return children;

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
      cached.parentValue === parentValue
    ) {
      perChildValue = cached.perChildValue;
    } else {
      perChildValue = {
        parentId: parentValue.parentId,
        parentTarget: parentValue.parentTarget,
        ancestors: parentValue.ancestors,
        siblingIndex: i,
        totalSiblings: total,
        prevSiblingId: prevId,
        prevSiblingTarget: prevTarget,
        prevSiblings:
          prevSiblingsRunning.length === 0 ? EMPTY_PREV_SIBLINGS : prevSiblingsRunning.slice(),
        siblingIndexOfType: idxOfType,
        totalSiblingsOfType: totalOfType,
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
 * the original object is returned so the render-cache identity is preserved.
 */
function withIndexedChildren(elementProps: Dict<any>, indexedChildren: React.ReactNode): Dict<any> {
  if (indexedChildren === elementProps.children) return elementProps;
  return { ...elementProps, children: indexedChildren };
}

interface ContainerPublisherProps {
  name: string;
  /** Inherited NativeStyle from the nearest ancestor publisher; the
   *  cascade fields carry through unchanged and only `container.named`
   *  / `container.nearest` get rewritten with this publisher's entry. */
  parent: NativeStyleContextValue;
  /** Cascade values to publish if this component overrides any of
   *  font-size / line-height / direction. `null` when the inherited
   *  cascade should flow through. */
  cascadeOverride: NativeCascadeValues | null;
  elementType: NativeTarget;
  elementProps: Dict<any>;
}

/**
 * Sum the explicit horizontal and vertical insets (padding + border) on
 * a styled-components-emitted RN style. Walks arrays of style objects
 * and respects RN's longhand-overrides-shorthand rule (`paddingLeft`
 * beats `paddingHorizontal` beats `padding`; logical `paddingStart` /
 * `paddingEnd` map to left / right since Yoga's only writing mode is
 * horizontal-tb LTR-equivalent).
 *
 * Used by `ContainerPublisher` to convert RN's border-box `onLayout`
 * width into the content-box width that CSS `%` and `cq*` units
 * resolve against.
 */
function getContentBoxInsets(style: any): { horizontal: number; vertical: number } {
  const m: Record<string, any> = {};
  mergeStyle(style, m);
  const pa = m.padding;
  const ph = m.paddingHorizontal;
  const pv = m.paddingVertical;
  const pl = m.paddingLeft ?? m.paddingStart ?? ph ?? pa;
  const pr = m.paddingRight ?? m.paddingEnd ?? ph ?? pa;
  const pt = m.paddingTop ?? pv ?? pa;
  const pb = m.paddingBottom ?? pv ?? pa;
  const ba = m.borderWidth;
  const bl = m.borderLeftWidth ?? m.borderStartWidth ?? ba;
  const br = m.borderRightWidth ?? m.borderEndWidth ?? ba;
  const bt = m.borderTopWidth ?? ba;
  const bb = m.borderBottomWidth ?? ba;
  return {
    horizontal: numOrZero(pl) + numOrZero(pr) + numOrZero(bl) + numOrZero(br),
    vertical: numOrZero(pt) + numOrZero(pb) + numOrZero(bt) + numOrZero(bb),
  };
}

function mergeStyle(style: any, out: Record<string, any>): void {
  if (style == null) return;
  if (Array.isArray(style)) {
    for (let i = 0; i < style.length; i++) mergeStyle(style[i], out);
    return;
  }
  if (typeof style !== 'object') return;
  for (const k in style) out[k] = style[k];
}

function numOrZero(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}

/**
 * Mounted only for styled components that publish themselves as a
 * container (CSS `container-type` declaration present). Owns the
 * layout-tracking state and provides the updated `ContainerContext`
 * value to descendants. Pulled out of the main render path so the four
 * extra hook slots only fire when the feature is actually used.
 */
function ContainerPublisher({
  name,
  parent,
  cascadeOverride,
  elementType,
  elementProps,
}: ContainerPublisherProps): React.ReactElement {
  const [entry, setEntry] = React.useState<ContainerEntry | null>(null);
  const lastRef = React.useRef<ContainerEntry | null>(null);

  // The published width/height drives both `cq*` units and the calc(%)
  // polyfill for descendants. Per spec, child %s and cq-units resolve
  // against the container's CONTENT-box, but RN's `onLayout.width` is
  // the border-box (includes padding + border). Stash the latest style
  // in a ref so the layout handler can subtract horizontal/vertical
  // insets without re-creating the handler each render.
  const styleRef = React.useRef<any>(elementProps.style);
  styleRef.current = elementProps.style;

  const onLayout = React.useMemo(
    () => (e: any) => {
      const { width, height } = e.nativeEvent.layout;
      const insets = getContentBoxInsets(styleRef.current);
      // Floor to the device pixel grid Yoga snaps to internally.
      // Without this, fractional dp widths (Android densities like
      // 2.625) make descendant `%` resolve to a width Yoga's snapped
      // slot can't fit, which trips flex-wrap even though the spec
      // math is exact.
      const ratio = getRN().PixelRatio?.get?.() ?? 1;
      const snap = (v: number) => (ratio > 1 ? Math.floor(v * ratio) / ratio : v);
      const w = width > insets.horizontal ? snap(width - insets.horizontal) : 0;
      const h = height > insets.vertical ? snap(height - insets.vertical) : 0;
      const last = lastRef.current;
      if (last && last.width === w && last.height === h && last.name === name) return;
      const next: ContainerEntry = { name, width: w, height: h };
      lastRef.current = next;
      setEntry(next);
    },
    [name]
  );

  const value = React.useMemo<NativeStyleContextValue>(() => {
    // Pre-measurement we publish a width=0 "pending" entry so the
    // calc(%) resolver can distinguish "no container ancestor"
    // (top-level — fall back to viewport) from "ancestor pending
    // measurement" (defer one frame). Inheriting `parent` here
    // over-sized descendants and Android Yoga didn't always reflow
    // on the second render.
    const parentContainer = parent.container;
    let container: ContainerContextValue;
    if (!entry) {
      const pending: ContainerEntry = { name, width: 0, height: 0 };
      const named = name
        ? Object.freeze({ ...parentContainer.named, [name]: pending })
        : parentContainer.named;
      container = { nearest: pending, named };
    } else {
      const named = Object.freeze({ ...parentContainer.named, [name]: entry });
      container = { nearest: entry, named };
    }
    // Cascade fields pass through unchanged except when this
    // component declares a cascade-significant override
    // (font-size / line-height / direction); useDynamicImpl computes
    // the override and forwards it via `cascadeOverride`.
    return { container, cascade: cascadeOverride ?? parent.cascade };
  }, [entry, name, parent, cascadeOverride]);

  const existingOnLayout = elementProps.onLayout;
  const composedOnLayout = React.useMemo(
    () =>
      existingOnLayout
        ? (e: any) => {
            onLayout(e);
            existingOnLayout(e);
          }
        : onLayout,
    [onLayout, existingOnLayout]
  );
  // The render cache reuses the same `elementProps` object across full
  // cache-hit renders, so mutating it in place would feed back the
  // previously-composed handler as `existingOnLayout` next time and grow
  // the call chain by one wrapper per render.
  const finalProps = { ...elementProps, onLayout: composedOnLayout };

  return createElement(
    NativeStyleContext.Provider,
    { value },
    createElement(elementType, finalProps)
  );
}

/**
 * Assemble the final `style` value passed to the underlying RN element.
 * Pulled out of the render hook so the cache-hit path can short-circuit
 * to a single property read without paying for any of this work.
 */
export function assembleFinalStyle(
  compiled: NativeStyles,
  env: MediaQueryEnv,
  containerCtx: ContainerContextValue,
  theme: Record<string, any>,
  userStyle: any,
  props: Record<string, unknown>,
  baseOverride?: Dict<any>,
  cascade: NativeCascadeValues = DEFAULT_CASCADE,
  parentCtx: ParentContextValue = DEFAULT_PARENT_CONTEXT
): any {
  // Patch around rn-web translation gaps before merging (no-op on native).
  // Function-form userStyle is normalized at call time inside the closures
  // below, since the result depends on the runtime state argument.
  if (!isFunction(userStyle)) userStyle = normalizeStyleForWeb(userStyle);
  const nonPseudoEntries = compiled.nonPseudoEntries;
  const pseudoEntries = compiled.pseudoEntries;
  const hasConditional = nonPseudoEntries.length > 0;
  const hasPseudoState = compiled.hasPseudo;
  const resolveEnv = buildResolveEnv(env, containerCtx, theme, cascade);

  const activeConditional = hasConditional
    ? matchConditionals(nonPseudoEntries, env, containerCtx, props, resolveEnv, parentCtx)
    : EMPTY_ARRAY;

  // Use post-attrs `effectiveBase` (clone with pops applied) when supplied;
  // otherwise the canonical compiled base.
  const sourceBase = baseOverride !== undefined ? baseOverride : compiled.base;
  const base = compiled.resolvers
    ? applyResolvers(sourceBase, compiled.resolvers, resolveEnv)
    : sourceBase;

  if (hasPseudoState) {
    const preStateStyles: object[] =
      activeConditional.length > 0 ? [base as object].concat(activeConditional) : [base as object];
    return (state: any) => {
      const styles: any[] = preStateStyles.slice();
      const matched = pseudoStylesForState(
        pseudoEntries,
        state || EMPTY_OBJECT,
        env,
        containerCtx,
        props,
        resolveEnv,
        parentCtx
      );
      for (let i = 0; i < matched.length; i++) styles.push(matched[i]);
      if (isFunction(userStyle)) {
        const userResolved = normalizeStyleForWeb(userStyle(state));
        Array.isArray(userResolved)
          ? styles.push.apply(styles, userResolved)
          : styles.push(userResolved);
      } else if (userStyle) {
        Array.isArray(userStyle) ? styles.push.apply(styles, userStyle) : styles.push(userStyle);
      }
      return styles;
    };
  }

  if (isFunction(userStyle)) {
    const preStateStyles: object[] =
      activeConditional.length > 0 ? [base as object].concat(activeConditional) : [base as object];
    return (state: any) => preStateStyles.concat(normalizeStyleForWeb(userStyle(state)));
  }
  if (userStyle) {
    return activeConditional.length > 0
      ? [base as object].concat(activeConditional, userStyle)
      : [base as object, userStyle];
  }
  if (activeConditional.length > 0) {
    return [base as object].concat(activeConditional);
  }
  return base;
}

export default (NativeStyle: INativeStyleConstructor<any>) => {
  const createStyledNativeComponent = <
    Target extends NativeTarget,
    OuterProps extends ExecutionProps,
    Statics extends object = BaseObject,
  >(
    target: Target,
    options: StyledOptions<'native', OuterProps>,
    rules: RuleSet<OuterProps>
  ): ReturnType<IStyledComponentFactory<'native', Target, OuterProps, Statics>> => {
    const isTargetStyledComp = isStyledComponent(target);
    const styledComponentTarget = target as IStyledComponent<'native', OuterProps>;

    const { displayName = generateDisplayName(target), attrs = EMPTY_ARRAY } = options;
    const componentId =
      options.componentId || generateComponentId(displayName + (options.parentComponentId || ''));
    const styledComponentId = options.displayName
      ? escape(options.displayName) + '-' + componentId
      : componentId;

    // fold the underlying StyledComponent attrs up (implicit extend)
    const finalAttrs =
      isTargetStyledComp && styledComponentTarget.attrs
        ? styledComponentTarget.attrs.concat(attrs).filter(Boolean)
        : (attrs as Attrs<OuterProps>[]);

    let shouldForwardProp = options.shouldForwardProp;

    if (isTargetStyledComp && styledComponentTarget.shouldForwardProp) {
      const shouldForwardPropFn = styledComponentTarget.shouldForwardProp;

      if (options.shouldForwardProp) {
        const passedShouldForwardPropFn = options.shouldForwardProp;

        // compose nested shouldForwardProp calls
        shouldForwardProp = (prop, elementToBeCreated) =>
          shouldForwardPropFn(prop, elementToBeCreated) &&
          passedShouldForwardPropFn(prop, elementToBeCreated);
      } else {
        shouldForwardProp = shouldForwardPropFn;
      }
    }

    const finalRules = isTargetStyledComp
      ? concatSourceInputs(
          styledComponentTarget.nativeStyle.rules.concat(rules),
          styledComponentTarget.nativeStyle.rules,
          rules
        )
      : rules;
    const nativeStyleInstance = new NativeStyle(finalRules) as InstanceType<
      INativeStyleConstructor<OuterProps>
    >;

    // Pick the render impl once, frozen at construction. Hook ordering stays stable
    // per component for the lifetime of the WrappedStyledComponent. The static path
    // requires empty attrs + no shouldForwardProp + provably-static CSS with no
    // runtime work (no responsive features, no animations); everything else uses the
    // dynamic path.
    // staticEligible is set only when staticCompiled is non-null, so the latter check
    // is implicit.
    const canUseStatic =
      finalAttrs.length === 0 &&
      shouldForwardProp === undefined &&
      nativeStyleInstance.staticEligible;
    const impl = canUseStatic ? useStaticImpl : useDynamicImpl;

    // React 19 ref-as-prop; no forwardRef wrapper. Wrapping in `React.memo`
    // means the parent's re-render skips this component entirely when its
    // props are shallow-equal to the previous render, eliminating the hook
    // calls, our render-cache check, and React's reconciliation work for the
    // child subtree. The internal render-cache in `useDynamicImpl` remains as
    // a layered fallback for the harder cases (different prop references with
    // same values, env or container-context shifts) that memo doesn't catch.
    const RenderInner: {
      (props: ExecutionProps & OuterProps & { ref?: React.Ref<any> }): React.JSX.Element;
      displayName?: string;
    } = props =>
      impl<OuterProps>(
        WrappedStyledComponent,
        // impl reads props as ExecutionProps & OuterProps; the `ref`
        // intersection is captured in the second argument.
        props,
        props.ref
      );
    RenderInner.displayName = displayName;
    const MemoizedRenderInner = React.memo(RenderInner);
    // displayName must live on the memo wrapper, not the inner: React DevTools
    // and Hermes inspector read it off the wrapper.
    (MemoizedRenderInner as { displayName?: string }).displayName = displayName;

    // In dev, wrap the memoized inner with an injector that adds the current
    // `nativeStyle` reference into props as a `$$`-prefixed sentinel.
    // React.memo's default shallow comparator then naturally invalidates when
    // the reference changes (which it does on HMR, since module re-eval
    // produces a fresh `NativeStyle` instance). The leading `$` keeps
    // `buildPropsForElement` from forwarding it onto the underlying element
    // (transient prop convention). The `else` branch tree-shakes out of the
    // production bundle so prod has zero residue.
    let RenderStyledComponent: typeof RenderInner;
    if (__DEV__) {
      const RenderInjector: typeof RenderInner = props =>
        // `$$nativeStyle` is a sentinel transient prop, not part of the public
        // RenderInner props; cast at the createElement boundary.
        React.createElement(MemoizedRenderInner, {
          ...props,
          $$nativeStyle: WrappedStyledComponent.nativeStyle,
        } as any);
      RenderInjector.displayName = displayName;
      RenderStyledComponent = RenderInjector;
    } else {
      RenderStyledComponent = MemoizedRenderInner as unknown as typeof RenderInner;
    }
    RenderStyledComponent.displayName = displayName;

    let WrappedStyledComponent = RenderStyledComponent as unknown as IStyledComponent<
      'native',
      any
    > &
      Statics;

    WrappedStyledComponent.attrs = finalAttrs;
    WrappedStyledComponent.nativeStyle = nativeStyleInstance;
    WrappedStyledComponent.displayName = displayName;
    WrappedStyledComponent.shouldForwardProp = shouldForwardProp;
    WrappedStyledComponent.hasPostAttrs = hasPostAttrsNative(finalAttrs);
    WrappedStyledComponent.postAttrsPlans = WrappedStyledComponent.hasPostAttrs
      ? buildPostAttrsPlans(finalAttrs, finalRules)
      : undefined;

    WrappedStyledComponent.styledComponentId = styledComponentId;

    // fold the underlying StyledComponent target up since we folded the styles
    WrappedStyledComponent.target = isTargetStyledComp ? styledComponentTarget.target : target;

    hoist<typeof WrappedStyledComponent, typeof target>(
      WrappedStyledComponent,
      target,
      HOIST_EXCLUDE as { [key in keyof OmitNever<IStyledStatics<'native', Target>>]: true }
    );

    return WrappedStyledComponent;
  };

  return createStyledNativeComponent;
};
