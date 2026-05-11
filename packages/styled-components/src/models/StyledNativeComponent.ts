import React, { createElement, Ref } from 'react';
import {
  ContainerContext,
  ContainerContextValue,
  ContainerEntry,
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
import type { NativeStyles, ConditionalStyle, PseudoState } from './compileNative';
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
    if (!(k in elementProps)) {
      elementProps[k] = specialCases[k];
    }
    if (__DEV__) {
      const meta = SPECIAL_CASE_PROPS[k];
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
const DEFAULT_ROOT_FONT_SIZE = 16;

function buildResolveEnv(
  env: MediaQueryEnv,
  containerCtx: ContainerContextValue,
  theme: Record<string, any>
): ResolveEnv {
  return {
    media: env,
    container: containerCtx.nearest,
    theme: theme ?? EMPTY_OBJECT,
    insets: EMPTY_INSETS,
    rootFontSize: DEFAULT_ROOT_FONT_SIZE,
  };
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

// Pseudo-gated buckets are skipped here and resolved by the state callback.
function matchConditionals(
  conditional: ConditionalStyle[],
  env: MediaQueryEnv,
  containerCtx: Pick<ContainerContextValue, 'named' | 'nearest'>,
  props: Record<string, unknown>,
  resolveEnv: ResolveEnv
): object[] {
  const out: object[] = [];
  for (let i = 0; i < conditional.length; i++) {
    const entry = conditional[i];
    // Buckets with a pseudo gate are owned by the state callback.
    if (entry.type === 'pseudo' || entry.pseudo) continue;
    if (entry.type === 'attr') {
      if (attrMatches(entry, props)) out.push(resolveBucket(entry, resolveEnv));
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
      if (stringified !== attr.value) return false;
    }
  }
  return true;
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
  conditional: ConditionalStyle[],
  state: { pressed?: boolean; hovered?: boolean; focused?: boolean; disabled?: boolean },
  env: MediaQueryEnv,
  containerCtx: Pick<ContainerContextValue, 'named' | 'nearest'>,
  props: Record<string, unknown>,
  resolveEnv: ResolveEnv
): object[] {
  const out: object[] = [];
  for (let i = 0; i < conditional.length; i++) {
    const entry = conditional[i];
    if (entry.type === 'pseudo') {
      if (pseudoActive(entry.condition as PseudoState, state))
        out.push(resolveBucket(entry, resolveEnv));
      continue;
    }
    if (!entry.pseudo || !pseudoActive(entry.pseudo, state)) continue;
    // For attr+pseudo and media+attr+pseudo compounds, also evaluate
    // the attrs AND-gate. Pure media+pseudo (no attrs) skips this.
    if (entry.attrs && !attrMatches(entry, props)) continue;
    // Pure attr-type buckets have no environmental condition; for
    // media/container/supports types, the condition still must match.
    if (entry.type !== 'attr' && !conditionMatches(entry, env, containerCtx)) continue;
    out.push(resolveBucket(entry, resolveEnv));
  }
  return out;
}

function hasPseudo(conditional: ConditionalStyle[]): boolean {
  for (let i = 0; i < conditional.length; i++) {
    if (conditional[i].type === 'pseudo' || conditional[i].pseudo) return true;
  }
  return false;
}

// [props, theme, propsKeyCount, context, compiled, env, containerCtx,
//  composedStyle, elementToBeCreated, elementProps, resolveEnv, effectiveBase]
type RenderCache = [
  object,
  DefaultTheme | undefined,
  number,
  object,
  NativeStyles,
  MediaQueryEnv,
  ContainerContextValue,
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
 * Container-publish dispatch for the static path. The static render path
 * uses zero hooks; reading `useContainerContext` only when the rendered
 * component declares `container-type` in its CSS keeps that property
 * intact for the common case of non-container components.
 */
function StaticContainerPublisherDispatch({
  name,
  elementType,
  elementProps,
}: StaticContainerPublisherDispatchProps): React.ReactElement {
  const parent = useContainerContext();
  return createElement(ContainerPublisher, {
    name,
    parent,
    elementType,
    elementProps,
  } as ContainerPublisherProps);
}

// Eligibility is frozen at construction (INativeStyle.staticEligible) so hook
// ordering stays stable; this path uses zero hooks.
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
  return createFastElement(
    elementToBeCreated,
    applyStylePolyfills(elementProps as Record<string, unknown>) as Dict<any>,
    containerName
  );
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
 * animations) bypass this path entirely and use `useStaticImpl` for a
 * zero-hook render.
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
  const containerCtx = useContainerContext();

  const renderCacheRef = (!IS_RSC ? React.useRef<RenderCache | null>(null) : { current: null }) as {
    current: RenderCache | null;
  };
  const prev = renderCacheRef.current;

  let context: ExecutionContext & Props;
  let compiled: NativeStyles;
  let composedStyle: any;
  let elementToBeCreated: NativeTarget;
  let resolveEnv: ResolveEnv;
  let effectiveBase: Dict<any>;
  let propsKeyCount = prev !== null ? prev[2] : 0;

  const propsMatch = prev !== null && prev[1] === theme && shallowEqual(prev[0], props, prev[2]);
  const fullHit = propsMatch && prev![5] === env && prev![6] === containerCtx;

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
    resolveEnv = buildResolveEnv(env, containerCtx, theme as Record<string, any>);
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
          baseOverride
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
      containerCtx,
      composedStyle,
      elementToBeCreated,
      elementProps,
      resolveEnv,
      effectiveBase,
    ];
  }

  const containerName = resolveContainerName(
    compiled.containerInfo,
    forwardedComponent.styledComponentId
  );
  if (containerName !== undefined) {
    return createElement(ContainerPublisher, {
      name: containerName,
      parent: containerCtx,
      elementType: animOut.elementType,
      elementProps,
    } as ContainerPublisherProps);
  }

  const el = createElement(animOut.elementType, elementProps);
  if (animOut.isolate3d) {
    return createElement(get3dIsolationView(), { collapsable: false }, el);
  }
  return el;
}

interface ContainerPublisherProps {
  name: string;
  parent: ContainerContextValue;
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

  const value = React.useMemo<ContainerContextValue>(() => {
    // Pre-measurement we publish a width=0 "pending" entry so the
    // calc(%) resolver can distinguish "no container ancestor"
    // (top-level — fall back to viewport) from "ancestor pending
    // measurement" (defer one frame). Inheriting `parent` here
    // over-sized descendants and Android Yoga didn't always reflow
    // on the second render.
    if (!entry) {
      const pending: ContainerEntry = { name, width: 0, height: 0 };
      const named = name ? Object.freeze({ ...parent.named, [name]: pending }) : parent.named;
      return { nearest: pending, named };
    }
    const named = Object.freeze({ ...parent.named, [name]: entry });
    return { nearest: entry, named };
  }, [entry, name, parent]);

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
    ContainerContext.Provider,
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
  baseOverride?: Dict<any>
): any {
  // Patch around rn-web translation gaps before merging (no-op on native).
  // Function-form userStyle is normalized at call time inside the closures
  // below, since the result depends on the runtime state argument.
  if (!isFunction(userStyle)) userStyle = normalizeStyleForWeb(userStyle);
  const hasConditional = compiled.conditional.length > 0;
  const hasPseudoState = hasConditional && hasPseudo(compiled.conditional);
  const resolveEnv = buildResolveEnv(env, containerCtx, theme);

  const activeConditional = hasConditional
    ? matchConditionals(compiled.conditional, env, containerCtx, props, resolveEnv)
    : EMPTY_ARRAY;

  // Use post-attrs `effectiveBase` (clone with pops applied) when supplied;
  // otherwise the canonical compiled base.
  const sourceBase = baseOverride !== undefined ? baseOverride : compiled.base;
  const base = compiled.resolvers
    ? applyResolvers(sourceBase, compiled.resolvers, resolveEnv)
    : sourceBase;

  if (hasPseudoState) {
    const pseudoList = compiled.conditional;
    const preStateStyles: object[] =
      activeConditional.length > 0 ? [base as object].concat(activeConditional) : [base as object];
    return (state: any) => {
      const styles: any[] = preStateStyles.slice();
      const matched = pseudoStylesForState(
        pseudoList,
        state || EMPTY_OBJECT,
        env,
        containerCtx,
        props,
        resolveEnv
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
