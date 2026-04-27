import React, { createElement, Ref, useContext } from 'react';
import {
  ContainerContext,
  ContainerContextValue,
  ContainerEntry,
  matchMedia,
  MediaQueryEnv,
  useContainerContext,
  useMediaEnv,
} from '../native/responsive';
import { applyResolvers, ResolveEnv } from '../native/transform/polyfills/resolvers';
import type {
  Attrs,
  BaseObject,
  Dict,
  ExecutionContext,
  ExecutionProps,
  IInlineStyleConstructor,
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
import generateDisplayName from '../utils/generateDisplayName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import type { CompiledNativeStyles, ConditionalStyle, PseudoState } from './nativeStyleCompiler';
import { DefaultTheme, ThemeContext } from './ThemeProvider';

const hasOwn = Object.prototype.hasOwnProperty;

function shallowEqualContext(prev: object, next: object, prevKeyCount: number): boolean {
  const a = prev as Record<string, unknown>;
  const b = next as Record<string, unknown>;
  let nextKeyCount = 0;
  for (const key in b) {
    if (hasOwn.call(b, key)) {
      nextKeyCount++;
      if (a[key] !== b[key]) return false;
    }
  }
  return nextKeyCount === prevKeyCount;
}

function resolveContext<Props extends object>(
  theme: DefaultTheme = EMPTY_OBJECT,
  props: Props,
  attrs: Attrs<Props>[]
): ExecutionContext & Props {
  const context: ExecutionContext & Props = { ...props, theme };

  for (let i = 0; i < attrs.length; i++) {
    const resolvedAttrDef = isFunction(attrs[i])
      ? (attrs[i] as Function)({ ...context })
      : attrs[i];

    for (const key in resolvedAttrDef) {
      // @ts-expect-error bad types
      context[key] = resolvedAttrDef[key];
    }
  }

  return context;
}

interface StyledComponentImplProps extends ExecutionProps {
  style?: any;
  $containerName?: string;
}

function buildPropsForElement(
  context: Record<string, any>,
  elementToBeCreated: NativeTarget,
  shouldForwardProp: ((prop: string, el: NativeTarget) => boolean) | undefined
): Dict<any> {
  const propsForElement: Dict<any> = {};
  for (const key in context) {
    if (key[0] === '$' || key === 'as' || key === 'theme' || key === 'ref') continue;
    else if (key === 'forwardedAs') {
      propsForElement.as = context[key];
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      propsForElement[key] = context[key];
    }
  }
  return propsForElement;
}

/**
 * Build the {@link ResolveEnv} consumed by render-time polyfills
 * (viewport / container units, `light-dark()`, `env()`, theme tokens).
 * Only called when `compiled.resolvers` is populated, so the per-render
 * cost is paid by components that actually use those features.
 *
 * Safe-area insets default to zero. When SafeAreaProvider is wired up,
 * upstream replaces this default at the call site.
 */
const EMPTY_INSETS = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
const DEFAULT_ROOT_FONT_SIZE = 16;

function buildResolveEnv(
  env: MediaQueryEnv,
  containerCtx: {
    nearest: { width: number; height: number } | null;
    named: Readonly<Record<string, { width: number; height: number }>>;
  },
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

/** Evaluate whether an at-rule bucket (media/container/supports) matches. */
function conditionMatches(
  entry: ConditionalStyle,
  env: MediaQueryEnv,
  containerCtx: { named: Readonly<Record<string, { width: number; height: number }>> }
): boolean {
  if (entry.type === 'media' || entry.type === 'supports') {
    return matchMedia(entry.condition, env);
  }
  if (entry.type === 'container') {
    const name = entry.containerName;
    const container = name ? containerCtx.named[name] : null;
    if (!container) return false;
    const containerEnv: MediaQueryEnv = {
      width: container.width,
      height: container.height,
      colorScheme: undefined,
      reduceMotion: false,
      fontScale: 1,
      pixelRatio: 1,
    };
    return matchMedia(entry.condition, containerEnv);
  }
  return false;
}

/**
 * Collect active unconditional-on-pseudo bucket styles under the given env +
 * container ctx. Buckets that ALSO gate on a pseudo (`&:hover` nested inside
 * a `@media`/`@container`) are skipped here and resolved by the state callback.
 */
function matchConditionals(
  conditional: ConditionalStyle[],
  env: MediaQueryEnv,
  containerCtx: { named: Readonly<Record<string, { width: number; height: number }>> }
): object[] {
  const out: object[] = [];
  for (let i = 0; i < conditional.length; i++) {
    const entry = conditional[i];
    if (entry.type === 'pseudo' || entry.pseudo) continue;
    if (conditionMatches(entry, env, containerCtx)) out.push(entry.styles);
  }
  return out;
}

/**
 * Map our compiler's pseudo-state names to the boolean field
 * Pressable/TextInput exposes on its `style` callback's `state` arg.
 */
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

/**
 * Resolve pseudo-gated buckets against a Pressable/TextInput state object.
 * Handles both root-level pseudo buckets (`&:hover { ... }`) and composite
 * buckets where a pseudo is nested inside an at-rule
 * (`@media (...) { &:hover { ... } }`). Composite buckets require BOTH the
 * outer at-rule AND the pseudo to be active.
 */
function pseudoStylesForState(
  conditional: ConditionalStyle[],
  state: { pressed?: boolean; hovered?: boolean; focused?: boolean; disabled?: boolean },
  env: MediaQueryEnv,
  containerCtx: { named: Readonly<Record<string, { width: number; height: number }>> }
): object[] {
  const out: object[] = [];
  for (let i = 0; i < conditional.length; i++) {
    const entry = conditional[i];
    if (entry.type === 'pseudo') {
      if (pseudoActive(entry.condition as PseudoState, state)) out.push(entry.styles);
      continue;
    }
    if (entry.pseudo && pseudoActive(entry.pseudo, state)) {
      if (conditionMatches(entry, env, containerCtx)) out.push(entry.styles);
    }
  }
  return out;
}

function hasPseudo(conditional: ConditionalStyle[]): boolean {
  for (let i = 0; i < conditional.length; i++) {
    if (conditional[i].type === 'pseudo' || conditional[i].pseudo) return true;
  }
  return false;
}

// Entries stable across renders are cached on the render-cache ref and
// reused on subsequent renders when their inputs are unchanged. The
// extended shape lets us skip the entire style-assembly block (and the
// fresh array allocation it implies) on parent re-renders where the
// child's props, theme, env, and ancestor container context are all
// reference-equal — so the underlying RN component receives the same
// `style` reference frame-over-frame and RN-web does not re-apply.
//
// [
//   prevProps,           // 0
//   prevTheme,           // 1
//   prevPropsKeyCount,   // 2
//   cachedContext,       // 3
//   cachedCompiled,      // 4
//   cachedEnv,           // 5  — MediaQueryEnv ref from useMediaEnv
//   cachedContainerCtx,  // 6  — ContainerContextValue from useContainerContext
//   cachedFinalStyle,    // 7  — assembled style passed to the RN element
// ]
type RenderCache = [
  object,
  DefaultTheme | undefined,
  number,
  object,
  CompiledNativeStyles,
  MediaQueryEnv,
  ContainerContextValue,
  any,
];

/**
 * Compose a static `base` style with the user-supplied `props.style`. RN's
 * `Pressable`/`TextInput` accept a function for `style` (state callback);
 * pass-through that shape by wrapping the function call.
 */
function composeWithBase(base: object, userStyle: any): any {
  if (userStyle === undefined || userStyle === null) return base;
  if (isFunction(userStyle)) {
    return (state: any) => {
      const u = userStyle(state);
      return Array.isArray(u) ? [base].concat(u) : [base, u];
    };
  }
  return Array.isArray(userStyle) ? [base as object].concat(userStyle) : [base, userStyle];
}

function createFastElement(
  elementToBeCreated: NativeTarget,
  propsForElement: Dict<any>,
  containerName: string | undefined
): React.ReactElement {
  if (containerName) {
    return createElement(FastContainerPublisher, {
      name: containerName,
      elementType: elementToBeCreated,
      elementProps: propsForElement,
    });
  }
  return createElement(elementToBeCreated, propsForElement);
}

/**
 * Fast render path for fully-static CSS — eligibility is frozen at construction
 * (see {@link IInlineStyle.fastEligible}) so hook ordering stays stable across
 * renders. Zero hooks: skips `useContext` (no resolvers means CSS never reads
 * theme), `useMediaEnv`, `useContainerContext`, and the render cache. Returns
 * the pre-registered StyleSheet ID directly.
 *
 * `props.$containerName` dispatches to {@link FastContainerPublisher} so the
 * publish-side hooks only fire when the feature is used.
 */
function useStaticImpl<Props extends StyledComponentImplProps>(
  forwardedComponent: IStyledComponent<'native', Props>,
  props: Props,
  forwardedRef: Ref<any>
): React.ReactElement {
  const { inlineStyle, target } = forwardedComponent;
  const base = inlineStyle.staticCompiled!.base;
  const elementToBeCreated: NativeTarget = (props.as as NativeTarget) || target;
  const propsForElement = buildPropsForElement(props, elementToBeCreated, undefined);
  propsForElement.style = composeWithBase(base, props.style);
  if (forwardedRef) propsForElement.ref = forwardedRef;
  return createFastElement(elementToBeCreated, propsForElement, props.$containerName);
}

// [prevProps, prevTheme, prevPropsKeyCount, composedStyle, propsForElement, elementToBeCreated]
type FastRenderCache = [object, DefaultTheme | undefined, number, any, Dict<any>, NativeTarget];

/**
 * Fast render impl for dynamic-CSS components whose source contains no
 * responsive features. Two hooks (`useContext` + `useRef`) versus the full
 * impl's four, plus a 6-slot prop-equal render cache mirroring the full
 * impl's hot path — on stable-prop renders we skip the compile, style
 * composition, AND the `buildPropsForElement` allocation.
 */
function useFastImpl<Props extends StyledComponentImplProps>(
  forwardedComponent: IStyledComponent<'native', Props>,
  props: Props,
  forwardedRef: Ref<any>
): React.ReactElement {
  const { inlineStyle, defaultProps, target } = forwardedComponent;
  const theme = useContext(ThemeContext);

  const renderCacheRef = React.useRef<FastRenderCache | null>(null);
  const prev = renderCacheRef.current;

  if (prev !== null && prev[1] === theme && shallowEqualContext(prev[0], props, prev[2])) {
    return createFastElement(prev[5], prev[4], props.$containerName);
  }

  const executionContext = {
    ...(defaultProps as any),
    ...props,
    theme: determineTheme(props, theme as DefaultTheme | undefined) ?? EMPTY_OBJECT,
  } as ExecutionContext & Props;

  const compiled = inlineStyle.compile(executionContext);

  if (process.env.NODE_ENV !== 'production') {
    verifyFastContract(forwardedComponent, compiled);
  }

  const composedStyle = composeWithBase(compiled.base, props.style);
  const elementToBeCreated: NativeTarget = (props.as as NativeTarget) || target;
  const propsForElement = buildPropsForElement(props, elementToBeCreated, undefined);
  propsForElement.style = composedStyle;
  if (forwardedRef) propsForElement.ref = forwardedRef;

  let propsKeyCount = 0;
  for (const key in props) {
    if (hasOwn.call(props, key)) propsKeyCount++;
  }
  renderCacheRef.current = [
    props,
    theme,
    propsKeyCount,
    composedStyle,
    propsForElement,
    elementToBeCreated,
  ];

  return createFastElement(elementToBeCreated, propsForElement, props.$containerName);
}

const fastContractWarned = new WeakSet<object>();
function verifyFastContract(
  forwardedComponent: IStyledComponent<'native', any>,
  compiled: CompiledNativeStyles
) {
  if (fastContractWarned.has(forwardedComponent)) return;
  if (
    compiled.conditional.length === 0 &&
    compiled.resolvers === undefined &&
    compiled.startingStyle === undefined
  ) {
    return;
  }
  fastContractWarned.add(forwardedComponent);
  // eslint-disable-next-line no-console
  console.warn(
    `styled-components: dynamic-CSS component routed to the fast render path produced responsive ` +
      `output (conditional buckets / resolvers / @starting-style). The fast path will not honor ` +
      `media/container queries or pseudo states for this component. Move the responsive part ` +
      `to a static-string segment of the template literal so it's detectable at construction.`
  );
}

interface FastContainerPublisherProps {
  name: string;
  elementType: NativeTarget;
  elementProps: Dict<any>;
}

/** Container-publish dispatch for the fast path; owns its own `useContainerContext` so the publish hook fires only when `$containerName` is set. */
function FastContainerPublisher({
  name,
  elementType,
  elementProps,
}: FastContainerPublisherProps): React.ReactElement {
  const parent = useContainerContext();
  return createElement(ContainerPublisher, {
    name,
    parent,
    elementType,
    elementProps,
  } as ContainerPublisherProps);
}

function useImpl<Props extends StyledComponentImplProps>(
  forwardedComponent: IStyledComponent<'native', Props>,
  props: Props,
  forwardedRef: Ref<any>
) {
  const { attrs: componentAttrs, inlineStyle, shouldForwardProp, target } = forwardedComponent;

  // Guard exists for RSC: useContext is undefined in server component environments
  const contextTheme = React.useContext ? React.useContext(ThemeContext) : undefined;
  const theme = determineTheme(props, contextTheme) || EMPTY_OBJECT;

  const env = useMediaEnv();
  const containerCtx = useContainerContext();

  const renderCacheRef = (
    React.useRef ? React.useRef<RenderCache | null>(null) : { current: null }
  ) as { current: RenderCache | null };
  const prev = renderCacheRef.current;

  let context: ExecutionContext & Props;
  let compiled: CompiledNativeStyles;
  let finalStyle: any;
  let propsKeyCount = prev !== null ? prev[2] : 0;

  const propsMatch =
    prev !== null && prev[1] === theme && shallowEqualContext(prev[0], props, prev[2]);

  if (propsMatch && prev![5] === env && prev![6] === containerCtx) {
    // Full hit: every input that influences finalStyle is reference-equal
    // with the prior render. Reuse the entire assembled output so React
    // (and RN-web) sees an identity-stable `style` prop and bails out.
    context = prev![3] as typeof context;
    compiled = prev![4];
    finalStyle = prev![7];
  } else {
    if (propsMatch) {
      // Compile-only hit: props/theme unchanged but env or ancestor
      // container context did change. Reuse the compile output but
      // re-run the assembly so any media/container query buckets and
      // viewport/container resolvers reflect the new env.
      context = prev![3] as typeof context;
      compiled = prev![4];
    } else {
      context = resolveContext<Props>(theme, props, componentAttrs);
      compiled = inlineStyle.compile(context);
      propsKeyCount = 0;
      for (const key in props) {
        if (hasOwn.call(props, key)) propsKeyCount++;
      }
    }
    finalStyle = assembleFinalStyle(compiled, env, containerCtx, theme, props.style);
    renderCacheRef.current = [
      props,
      theme,
      propsKeyCount,
      context,
      compiled,
      env,
      containerCtx,
      finalStyle,
    ];
  }

  const containerName = (context as any).$containerName as string | undefined;
  const elementToBeCreated: NativeTarget = (context as any).as || props.as || target;
  const propsForElement = buildPropsForElement(context, elementToBeCreated, shouldForwardProp);

  propsForElement.style = finalStyle;

  if (forwardedRef) {
    propsForElement.ref = forwardedRef;
  }

  // Container publishing is rare — the vast majority of styled components
  // never set `$containerName`. Hoisting the publish-side hooks (useState
  // + useRef + 2× useMemo) into a sub-component that only mounts when
  // `containerName` is set keeps the common-case render at 3 hooks
  // (useContext theme, useMediaEnv, useContainerContext) + 1 useRef cache
  // — close to v6's three-hook baseline despite the new modern-CSS plumbing.
  if (containerName) {
    return createElement(ContainerPublisher, {
      name: containerName,
      parent: containerCtx,
      elementType: elementToBeCreated,
      elementProps: propsForElement,
    } as ContainerPublisherProps);
  }

  return createElement(elementToBeCreated, propsForElement);
}

interface ContainerPublisherProps {
  name: string;
  parent: ContainerContextValue;
  elementType: NativeTarget;
  elementProps: Dict<any>;
}

/**
 * Mounted only for styled components that publish themselves as a named
 * container (`$containerName` set). Owns the layout-tracking state and
 * provides the updated `ContainerContext` value to descendants. Pulled
 * out of the main render path so the four extra hook slots only fire
 * when the feature is actually used.
 */
function ContainerPublisher({
  name,
  parent,
  elementType,
  elementProps,
}: ContainerPublisherProps): React.ReactElement {
  const [entry, setEntry] = React.useState<ContainerEntry | null>(null);
  const lastRef = React.useRef<ContainerEntry | null>(null);

  const onLayout = React.useMemo(
    () => (e: any) => {
      const { width, height } = e.nativeEvent.layout;
      const last = lastRef.current;
      if (last && last.width === width && last.height === height && last.name === name) return;
      const next: ContainerEntry = { name, width, height };
      lastRef.current = next;
      setEntry(next);
    },
    [name]
  );

  const value = React.useMemo<ContainerContextValue>(() => {
    if (!entry) return parent;
    const named = Object.freeze({ ...parent.named, [name]: entry });
    return { nearest: entry, named };
  }, [entry, name, parent]);

  // Compose with any user-supplied onLayout. Allocate the wrapped
  // listener exactly once per (onLayout, existingOnLayout) pair.
  const finalProps = elementProps;
  const existingOnLayout = finalProps.onLayout;
  finalProps.onLayout = existingOnLayout
    ? (e: any) => {
        onLayout(e);
        existingOnLayout(e);
      }
    : onLayout;

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
function assembleFinalStyle(
  compiled: CompiledNativeStyles,
  env: MediaQueryEnv,
  containerCtx: ContainerContextValue,
  theme: Record<string, any>,
  userStyle: any
): any {
  const hasConditional = compiled.conditional.length > 0;
  const hasPseudoState = hasConditional && hasPseudo(compiled.conditional);

  const activeConditional = hasConditional
    ? matchConditionals(compiled.conditional, env, containerCtx)
    : EMPTY_ARRAY;

  const base = compiled.resolvers
    ? applyResolvers(compiled.base, compiled.resolvers, buildResolveEnv(env, containerCtx, theme))
    : compiled.base;

  if (hasPseudoState) {
    const pseudoList = compiled.conditional;
    const preStateStyles: object[] =
      activeConditional.length > 0 ? [base as object].concat(activeConditional) : [base as object];
    return (state: any) => {
      const styles: any[] = preStateStyles.slice();
      const matched = pseudoStylesForState(pseudoList, state || EMPTY_OBJECT, env, containerCtx);
      for (let i = 0; i < matched.length; i++) styles.push(matched[i]);
      if (isFunction(userStyle)) {
        const userResolved = userStyle(state);
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
    return (state: any) => preStateStyles.concat(userStyle(state));
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

export default (InlineStyle: IInlineStyleConstructor<any>) => {
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

    const inlineStyleInstance = new InlineStyle(
      isTargetStyledComp ? styledComponentTarget.inlineStyle.rules.concat(rules) : rules
    ) as InstanceType<IInlineStyleConstructor<OuterProps>>;

    // Pick the render impl once, frozen at construction. Hook ordering stays stable
    // per component for the lifetime of the WrappedStyledComponent. Fast paths require
    // empty attrs + no custom shouldForwardProp (those gates do per-render prop
    // manipulation the fast bodies don't inline).
    const fastGatesPass = finalAttrs.length === 0 && shouldForwardProp === undefined;
    const impl =
      fastGatesPass && inlineStyleInstance.fastEligible
        ? inlineStyleInstance.staticCompiled !== null
          ? useStaticImpl
          : useFastImpl
        : useImpl;

    // React 19 ref-as-prop — no forwardRef wrapper.
    const RenderStyledComponent: {
      (props: ExecutionProps & OuterProps & { ref?: React.Ref<any> }): React.JSX.Element;
      displayName?: string;
    } = props =>
      impl<OuterProps>(
        WrappedStyledComponent,
        props as ExecutionProps & OuterProps,
        props.ref as React.Ref<any>
      );

    RenderStyledComponent.displayName = displayName;

    let WrappedStyledComponent = RenderStyledComponent as unknown as IStyledComponent<
      'native',
      any
    > &
      Statics;

    WrappedStyledComponent.attrs = finalAttrs;
    WrappedStyledComponent.inlineStyle = inlineStyleInstance;
    WrappedStyledComponent.displayName = displayName;
    WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

    // @ts-expect-error we don't actually need this for anything other than detection of a styled-component
    WrappedStyledComponent.styledComponentId = true;

    // fold the underlying StyledComponent target up since we folded the styles
    WrappedStyledComponent.target = isTargetStyledComp ? styledComponentTarget.target : target;

    hoist<typeof WrappedStyledComponent, typeof target>(WrappedStyledComponent, target, {
      // all SC-specific things should not be hoisted
      attrs: true,
      inlineStyle: true,
      displayName: true,
      shouldForwardProp: true,
      target: true,
    } as { [key in keyof OmitNever<IStyledStatics<'native', Target>>]: true });

    return WrappedStyledComponent;
  };

  return createStyledNativeComponent;
};
