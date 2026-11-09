import React, { createElement, Ref } from 'react';
import isPropValid from '../utils/isPropValid';

/** React.memo's `$$typeof` symbol; constructed in-place to skip the
 *  `React.memo()` call's allocation + the per-static property transition
 *  that mutating its result would force. Pre-shaping the wrapper as a
 *  single object literal keeps every styled component on a single hidden
 *  class. */
const REACT_MEMO_TYPE = Symbol.for('react.memo');
import { ScStyle } from 'styled-components/server-styles';
import { SC_VERSION } from '../constants';
import { IS_RSC } from '../utils/isRsc';
import type StyleSheet from '../sheet';
import { getRegisterVersion, registerLabel } from '../sheet/GroupIDAllocator';
import { hasUnadoptedServerTags } from '../sheet/Rehydration';
import type {
  AnyComponent,
  Attrs,
  BaseObject,
  Dict,
  ExecutionContext,
  ExecutionProps,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledStatics,
  OmitNever,
  RuleSet,
  StyledOptions,
  WebTarget,
} from '../types';
import { evaluateForFastPath, type FastPathFragment } from '../parser/compile';
import { getSource, Source } from '../parser/source';
import { themeValue } from '../utils/themePath';
import {
  applyPostAttrs,
  buildPostAttrsPlans,
  camelizeProp,
  findBaseDecl,
  hasPostAttrs as chainHasPostAttrs,
  isPostAttr,
  type PostAttrsPlan,
} from '../utils/postAttrs';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import getComponentName from '../utils/getComponentName';
import hoist from '../utils/hoist';
import hyphenateStyleName from '../utils/hyphenateStyleName';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import isTag from '../utils/isTag';
import { joinStrings } from '../utils/joinStrings';
import { registeredIdsIn } from '../utils/registeredIds';
import { getRscRequestState } from '../utils/rscCache';
import { warnOnce } from '../utils/warnOnce';
import { rscChain, rscFlush, rscKeyframes } from './rscStyle';
import WebStyle, { GeneratedStyle } from './WebStyle';
import { type IStyleSheetContext, useStyleSheetContext } from './StyleSheetManager';
import { DefaultTheme, ThemeContext } from './ThemeProvider';

declare const __SERVER__: boolean;

const identifiers: { [key: string]: number } = {};

/** What `generatedStyle` holds outside a server component, where nothing reads it. */
const NO_GENERATED_STYLE: GeneratedStyle = { className: '', keyframes: [], levels: [] };

const subscribeNoop = (): (() => void) => () => {};
const getFalse = (): boolean => false;
const getTrue = (): boolean => true;

/**
 * Writes one render's generated CSS into the sheet, and teaches it which components wrap this
 * one, from an insertion effect, so a committed render's rules land before paint and a discarded
 * render writes nothing. Mounted only when a render still has unwritten rules or an unlearned
 * outer.
 */
function StyleInjector({
  generated,
  outers,
  sheet,
  webStyle,
}: {
  generated: GeneratedStyle | null;
  outers: readonly string[] | null;
  sheet: StyleSheet;
  webStyle: WebStyle;
}): null {
  if (__DEV__) {
    // getServerSnapshot runs under renderToString and while hydrating; getSnapshot under
    // createRoot. A sheet that adopted no server tags and finds none waiting marks the
    // jsdom-without-ServerStyleSheet footgun (buffered path, insertion effects never fire), which a
    // hydration of server-rendered styles is not, and a post-render microtask probe would raise
    // false positives on discarded concurrent renders.
    // biome-ignore lint/correctness/useHookAtTopLevel: __DEV__ is a build-time constant, so a given bundle always runs this hook or never does
    const isServerRender = React.useSyncExternalStore(subscribeNoop, getFalse, getTrue);
    if (isServerRender && sheet.names.size === 0 && !hasUnadoptedServerTags(sheet)) {
      warnOnce(
        'buffered-ssr-without-sheet',
        'this tree is rendered with renderToString / renderToStaticMarkup without ServerStyleSheet, so its styles are missing from the output. Wrap the tree in ServerStyleSheet#collectStyles.'
      );
    }
  }
  React.useInsertionEffect(() => {
    if (generated !== null) webStyle.inject(sheet, generated);
    if (outers !== null) learnOuters(sheet, outers, webStyle.componentId);
  });
  return null;
}

/** Teaches `sheet` that each of `outers` wraps the component `id`. */
function learnOuters(sheet: StyleSheet, outers: readonly string[], id: string): void {
  for (let i = 0; i < outers.length; i++) sheet.learn(outers[i], id);
}

/**
 * The registered ids in `className` outside the component's own chain: the styled components up
 * the tree that passed their classes down.
 */
function outersIn(className: string, webStyle: WebStyle): readonly string[] {
  const hits = registeredIdsIn(className);
  if (hits.length === 0) return hits;

  let outers: string[] | null = null;
  for (let i = 0; i < hits.length; i++) {
    let own = false;
    for (let w: WebStyle | null | undefined = webStyle; w; w = w.baseStyle) {
      if (w.componentId === hits[i]) own = true;
    }

    if (own) outers ??= hits.slice(0, i);
    else if (outers !== null) outers.push(hits[i]);
  }

  return outers ?? hits;
}

/**
 * An instance's last scan: the `className` it scanned, the register version it ran against, and
 * the outers found.
 */
type RememberedScan = { className: string; outers: readonly string[]; version: number };

/**
 * `outersIn`, skipped when this instance already scanned the same `className` against the same
 * register (a new id since then can turn a miss into a hit). The sheet is not part of the memo: the
 * caller still asks the current sheet which outers it has settled.
 */
function rememberedOutersIn(
  memo: { current: RememberedScan | null },
  className: string,
  webStyle: WebStyle
): readonly string[] {
  const version = getRegisterVersion();
  const last = memo.current;
  if (last !== null && last.version === version && last.className === className) {
    return last.outers;
  }

  const outers = outersIn(className, webStyle);
  memo.current = { className, outers, version };

  return outers;
}

/** The outers the sheet has not settled against the component `id`, or null when it knows them all. */
function unsettledOuters(
  sheet: StyleSheet,
  outers: readonly string[],
  id: string
): readonly string[] | null {
  let unsettled: string[] | null = null;
  for (let i = 0; i < outers.length; i++) {
    if (sheet.isSettled(outers[i], id)) continue;

    if (unsettled === null) unsettled = [outers[i]];
    else unsettled.push(outers[i]);
  }

  return unsettled;
}

/** True when `generated` carries rules or keyframes the sheet has not emitted. */
function generatedNeedsSheetWrite(generated: GeneratedStyle, sheet: StyleSheet): boolean {
  if (generated.keyframes.length > 0) {
    for (let i = 0; i < generated.keyframes.length; i++) {
      const kf = generated.keyframes[i];
      if (!sheet.hasNameForId(kf.id, kf.name)) return true;
    }
  }
  const levels = generated.levels;
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (level.rules.length > 0 && !sheet.hasNameForId(level.componentId, level.name)) {
      return true;
    }
  }
  return false;
}

/**
 * Shared `toString` for styled components: returns `.styledComponentId` so
 * `${StyledFoo}` interpolation resolves to the class selector.
 */
function styledToString(this: { styledComponentId: string }): string {
  return '.' + this.styledComponentId;
}

/**
 * SC-specific statics are copied explicitly into the wrapper, so the
 * hoist pass must skip them or it would stomp the wrapper's own values.
 */
const HOIST_EXCLUDE = {
  attrs: true,
  webStyle: true,
  displayName: true,
  foldedComponentIds: true,
  postAttrsPlans: true,
  shouldForwardProp: true,
  styledComponentId: true,
  target: true,
} as const;

/** Test-only: clear the per-displayName counter so component IDs stay stable
 *  across tests. Not for production use. */
export const resetIdentifiers = (): void => {
  for (const k in identifiers) delete identifiers[k];
};

function generateId(
  displayName?: string | undefined,
  parentComponentId?: string | undefined
): string {
  const name = typeof displayName !== 'string' ? 'sc' : escape(displayName);
  identifiers[name] = (identifiers[name] || 0) + 1;

  const componentId =
    name +
    '-' +
    generateComponentId(
      // Isolate multiple styled-components runtimes on one page, and the server component graph
      // from the server-rendering and browser graphs, which count the same names apart.
      SC_VERSION + (IS_RSC ? 'rsc' : '') + name + identifiers[name]
    );

  return parentComponentId ? parentComponentId + '-' + componentId : componentId;
}

function resolveContext<Props extends BaseObject>(
  attrs: Attrs<React.HTMLAttributes<Element> & Props>[],
  props: ExecutionProps & Props,
  theme: DefaultTheme | undefined
): React.HTMLAttributes<Element> & ExecutionContext & Props {
  const context: React.HTMLAttributes<Element> & ExecutionContext & Props = {
    ...props,
    // unset, add `props.className` back at the end so props always "wins"
    className: undefined,
    theme,
  } as React.HTMLAttributes<Element> & ExecutionContext & Props;

  const needsCopy = attrs.length > 1;
  for (let i = 0; i < attrs.length; i++) {
    const attrDef = attrs[i];
    // Arity-2 attrs are post-compile (need access to resolved decls); they
    // run later in `applyPostAttrsWeb`, not here.
    if (isPostAttr(attrDef)) continue;
    const resolvedAttrDef = isFunction(attrDef)
      ? (attrDef as unknown as (p: typeof context) => ExecutionProps & Partial<Props>)(
          needsCopy ? { ...context } : context
        )
      : attrDef;

    mergeAttrDict(context, resolvedAttrDef as Dict<unknown>);
  }

  if ('className' in props && typeof props.className === 'string') {
    context.className = joinStrings(context.className, props.className);
  }

  return context;
}

let seenUnknownProps: Set<string> | undefined;

/**
 * Merge an attrs-resolved dict into the execution context: `className` joins,
 * `style` shallow-merges, and every other key overwrites, so attrs always wins
 * (docs/attrs.md). An `undefined` value deletes the key when context held a
 * defined value; context already holding the caller's explicit `undefined`
 * (an identity-spread attrs function echoes it back) keeps it, so a component
 * target still receives it. A key context never held stays absent. Only a
 * render where attrs clears a key pays the `delete` slow-object cost.
 */
function mergeAttrDict<Props extends BaseObject>(
  context: React.HTMLAttributes<Element> & ExecutionContext & Props,
  resolved: Dict<unknown>
): void {
  const target = context as unknown as Dict<unknown>;

  for (const key in resolved) {
    if (key === 'className') {
      context.className = joinStrings(context.className, resolved[key] as string);
    } else if (key === 'style') {
      context.style = {
        ...context.style,
        ...(resolved[key] as React.CSSProperties),
      };
    } else if (resolved[key] !== undefined) {
      target[key] = resolved[key];
    } else if (target[key] !== undefined) {
      delete target[key];
    }
  }
}

/** Evaluated interpolations of one chain level, or `null` when unavailable. */
type FilledOf = (style: WebStyle, source: Source) => ReadonlyArray<string> | null;

const noFilled: FilledOf = () => null;

/**
 * Resolve a declaration key across the extension chain, innermost template
 * first: each level emits its own class after its base's, so the innermost
 * match is the cascade winner. A camelCase key reads its kebab-case
 * declaration, so omniplatform code written against the native spelling
 * resolves on web too. Returns {@link findBaseDecl}'s tri-state.
 */
function findChainDecl(
  style: WebStyle | null | undefined,
  prop: string,
  filledOf: FilledOf
): string | undefined | null {
  const key = prop.indexOf('-') === -1 ? hyphenateStyleName(prop) : prop;
  for (let w = style; w; w = w.baseStyle) {
    const source = getSource(w.rules);
    if (source === undefined) continue;
    const v = findBaseDecl(source.ast, key, filledOf(w, source));
    if (v !== undefined) return v;
  }
  return undefined;
}

/**
 * Post-compile attrs phase for the web runtime. Pop calls collect keys into
 * `popOverrides` so the caller applies inline-style overrides (CSS `unset`)
 * to the rendered element; best-effort removal because the emitted class is
 * hash-derived from the full decl set. Native removes the decl from the
 * compiled style object instead.
 */
function applyPostAttrsWeb<Props extends BaseObject>(
  context: React.HTMLAttributes<Element> & ExecutionContext & Props,
  attrs: Attrs<React.HTMLAttributes<Element> & Props>[],
  plans: ReadonlyArray<PostAttrsPlan | null>,
  webStyle: WebStyle
): Dict<string> | null {
  let popOverrides: Dict<string> | null = null;
  // Per-render evaluated interpolations by level, built on the first read
  // of a templated declaration.
  let filledByLevel: Map<WebStyle, ReadonlyArray<string> | null> | null = null;
  const filledOf: FilledOf = (style, source) => {
    if (filledByLevel === null) filledByLevel = new Map();
    let filled = filledByLevel.get(style);
    if (filled === undefined) {
      // Push-fill to keep these PACKED_ELEMENTS; `new Array(n)` stays
      // HOLEY_ELEMENTS and infects the IC for `evaluateForFastPath`.
      const n = source.interpolations.length;
      const buf: string[] = [];
      const fragBuf: (FastPathFragment | null)[] = [];
      for (let i = 0; i < n; i++) {
        buf.push('');
        fragBuf.push(null);
      }
      filled = evaluateForFastPath(source, context, buf, undefined, fragBuf);
      filledByLevel.set(style, filled);
    }
    return filled;
  };
  applyPostAttrs(context, attrs, plans, {
    lookup: keyOrPath => {
      if (keyOrPath.indexOf('.') !== -1) return themeValue(context.theme, keyOrPath);
      const v = findChainDecl(webStyle, keyOrPath, filledOf);
      return v === null ? undefined : v;
    },
    merge: mergeAttrDict,
    onPop: key => {
      if (popOverrides === null) popOverrides = {};
      popOverrides[camelizeProp(key)] = 'unset';
    },
  });
  return popOverrides;
}

function buildPropsForElement<Context extends ExecutionContext>(
  context: Context,
  elementToBeCreated: WebTarget,
  theme: DefaultTheme | undefined,
  shouldForwardProp: ((prop: string, el: WebTarget) => boolean) | undefined,
  isDOMTarget: boolean
): Dict<unknown> {
  const out: Dict<unknown> = {};

  for (const key in context) {
    // Attrs delete the keys they clear, so an `undefined` left here is the caller's
    // explicit one: it takes the normal filters to a component target so that
    // component can fall back to its own default, and never reaches a DOM tag.
    // `className` is assigned after the loop, so it must not claim key order here.
    if (
      context[key] === undefined &&
      (isDOMTarget || key === 'className' || key === 'forwardedAs')
    ) {
      continue;
    }
    if (
      key[0] === '$' ||
      key === 'as' ||
      key === 'ref' || // React 19 ref-as-prop: the ref is re-attached explicitly below.
      (key === 'theme' && context.theme === theme)
    ) {
      continue;
    }
    if (key === 'forwardedAs') {
      out.as = context.forwardedAs;
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      out[key] = context[key];

      if (
        __DEV__ &&
        !shouldForwardProp &&
        !isPropValid(key) &&
        !(seenUnknownProps || (seenUnknownProps = new Set())).has(key) &&
        isTag(elementToBeCreated) &&
        !elementToBeCreated.includes('-')
      ) {
        seenUnknownProps.add(key);
        warnOnce(
          'unknown-prop',
          `unknown prop "${key}" is being sent to the DOM, which will likely trigger a React console error. Use transient props (\`$\` prefix) to keep the prop in the component, or set a \`<StyleSheetManager shouldForwardProp={...}>\` filter.`,
          key
        );
      }
    }
  }

  return out;
}

function useImpl<Props extends BaseObject>(
  forwardedComponent: IStyledComponent<'web', Props>,
  props: ExecutionProps & Props,
  forwardedRef: Ref<Element> | undefined
) {
  const {
    attrs: componentAttrs,
    webStyle,
    foldedComponentIds,
    styledComponentId,
    target,
  } = forwardedComponent;

  // biome-ignore lint/correctness/useHookAtTopLevel: IS_RSC is a load-time constant, so this branch is fixed for the whole bundle rather than varying per render
  const contextTheme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
  const ssc = useStyleSheetContext();
  const shouldForwardProp = forwardedComponent.shouldForwardProp || ssc.shouldForwardProp;

  // Skipped in server components, where it does nothing and Flight can render with no hook dispatcher (items of an async iterable).
  if (__DEV__ && !IS_RSC) {
    // biome-ignore lint/correctness/useHookAtTopLevel: __DEV__ and IS_RSC are build and load-time constants, and useDebugValue allocates no hook slot in any case
    React.useDebugValue(styledComponentId);
  }

  const theme = determineTheme(props, contextTheme) || (IS_RSC ? undefined : EMPTY_OBJECT);

  let generatedClassName: string;
  let generatedStyle = NO_GENERATED_STYLE;
  let popOverrides: Dict<string> | null = null;
  const postAttrsPlans = forwardedComponent.postAttrsPlans;
  /** The CSSOM write to schedule in the insertion effect (buffered path only). */
  let pendingInject: GeneratedStyle | null = null;
  /** The outers the sheet has yet to learn, for the insertion effect (buffered path only). */
  let pendingOuters: readonly string[] | null = null;

  // Interpolations and arity-2 attrs are the component's own render-body user
  // code: they run every render so a hook called inside one keeps a stable hook
  // count, and a value read inside one (a context, ref, or module state outside
  // props and theme) always reflects its current state (#5788). Cross-render
  // bailout on equal props is the wrapping React.memo's job, not this path's;
  // `webStyle`'s content-addressed caches keep a repeat render that yields the
  // same CSS cheap.
  const context = resolveContext<Props>(componentAttrs, props, theme);
  if (postAttrsPlans !== undefined) {
    popOverrides = applyPostAttrsWeb<Props>(context, componentAttrs, postAttrsPlans, webStyle);
  }

  // A styled component up the tree passes its classes down in `className`; its id in them makes it
  // an outer of this component (docs/react.md "Server component styles").
  const incomingClassName = context.className;
  // biome-ignore lint/correctness/useHookAtTopLevel: __SERVER__ and IS_RSC are build and load-time constants, so this branch is fixed for the whole bundle
  const scanMemo = !__SERVER__ && !IS_RSC ? React.useRef<RememberedScan | null>(null) : null;
  const outers = !incomingClassName
    ? EMPTY_ARRAY
    : scanMemo === null
      ? outersIn(incomingClassName, webStyle)
      : rememberedOutersIn(scanMemo, incomingClassName, webStyle);

  if (IS_RSC) {
    generatedStyle = rscFlush(webStyle, context, ssc.styleSheet, ssc.compiler);
    generatedClassName = generatedStyle.className;
  } else if (__SERVER__ || ssc.styleSheet.server) {
    // ServerStyleSheet SSR (in either a server or a browser build) never runs
    // insertion effects, so the CSSOM write must stay synchronous.
    generatedClassName = webStyle.flush(context, ssc.styleSheet, ssc.compiler);
    learnOuters(ssc.styleSheet, outers, styledComponentId);
  } else {
    // Browser path: generate during render and inject via StyleInjector.
    const generated = webStyle.generate(context, ssc.styleSheet, ssc.compiler);
    generatedClassName = generated.className;
    pendingInject = generatedNeedsSheetWrite(generated, ssc.styleSheet) ? generated : null;
    if (outers.length > 0) {
      pendingOuters = unsettledOuters(ssc.styleSheet, outers, styledComponentId);
    }
  }

  if (__DEV__ && !IS_RSC) {
    // biome-ignore lint/correctness/useHookAtTopLevel: __DEV__ and IS_RSC are build and load-time constants, and useDebugValue allocates no hook slot in any case
    React.useDebugValue(generatedClassName);
  }

  if (__DEV__ && forwardedComponent.warnTooManyClasses) {
    forwardedComponent.warnTooManyClasses(generatedClassName);
  }

  const elementToBeCreated: WebTarget = context.as || target;
  const isDOMTarget = isTag(elementToBeCreated);

  const elementProps = buildPropsForElement(
    context,
    elementToBeCreated,
    theme,
    shouldForwardProp,
    isDOMTarget
  );

  // Apply popped declarations as inline-style overrides; user-passed
  // `style` keys win so explicit overrides aren't clobbered by the reset.
  if (popOverrides !== null) {
    elementProps.style = { ...popOverrides, ...(elementProps.style as object | undefined) };
  }

  let classString = joinStrings(foldedComponentIds, styledComponentId);
  if (generatedClassName) {
    classString += ' ' + generatedClassName;
  }
  if (incomingClassName) {
    classString += ' ' + incomingClassName;
  }

  elementProps[isDOMTarget && elementToBeCreated.includes('-') ? 'class' : 'className'] =
    classString;

  if (forwardedRef) {
    elementProps.ref = forwardedRef;
  }

  // Client path: stable Fragment shape so the host element keeps identity
  // when the injector mounts or unmounts across commits. Only instances that
  // still need a CSSOM write or an outer learned mount StyleInjector.
  const injectsAfterCommit = !__SERVER__ && !IS_RSC && !ssc.styleSheet.server;

  if (injectsAfterCommit) {
    elementProps.key = 'sc-el';
  }

  const element = createElement(elementToBeCreated, elementProps);

  if (injectsAfterCommit) {
    return createElement(
      React.Fragment,
      null,
      pendingInject !== null || pendingOuters !== null
        ? createElement(StyleInjector, {
            key: 'sc-inject',
            generated: pendingInject,
            outers: pendingOuters,
            sheet: ssc.styleSheet,
            webStyle,
          })
        : null,
      element
    );
  }

  // RSC: `ScStyle` carries the instance's rules into the registry sheet; see docs/react.md "Server component styles".
  if (IS_RSC) {
    const styleElement = rscStyleElement(webStyle, generatedStyle, outers, context, ssc);

    if (styleElement !== null) return createElement(React.Fragment, null, styleElement, element);
  }

  return element;
}

/**
 * The `ScStyle` element for one server instance, shared per request with every instance of the
 * same component, class names and outers so the payload writes its props once. Null when the
 * instance has no rules and no keyframes.
 */
function rscStyleElement(
  webStyle: WebStyle,
  generated: GeneratedStyle,
  outerIds: readonly string[],
  context: ExecutionContext,
  ssc: IStyleSheetContext
): React.ReactElement | null {
  if (generated.levels.length === 0 && generated.keyframes.length === 0) return null;

  const state = getRscRequestState ? getRscRequestState() : null;
  const sharedKey =
    webStyle.componentId +
    ' ' +
    generated.className +
    (outerIds.length > 0 ? ' ' + outerIds.join(',') : '');
  const shared = state !== null ? state.styleElements.get(sharedKey) : undefined;
  if (shared !== undefined) return shared;

  const chain = rscChain({ context, generated, ssc, webStyle });
  const keyframes = rscKeyframes(generated.keyframes);
  if (chain.length === 0 && keyframes.length === 0) return null;

  const styleElement = createElement(ScStyle, {
    chain,
    key: 'sc-' + webStyle.componentId,
    keyframes,
    // A fresh empty array: Flight sends a shared one as a reference longer than `[]`.
    outers: outerIds.length > 0 ? outerIds : [],
  });
  if (state !== null) state.styleElements.set(sharedKey, styleElement);

  return styleElement;
}

function createStyledComponent<
  Target extends WebTarget,
  OuterProps extends BaseObject,
  Statics extends BaseObject = BaseObject,
>(
  target: Target,
  options: StyledOptions<'web', OuterProps>,
  rules: RuleSet<OuterProps>
): ReturnType<IStyledComponentFactory<'web', Target, OuterProps, Statics>> {
  const isTargetStyledComp = isStyledComponent(target);
  const styledComponentTarget = target as IStyledComponent<'web', OuterProps>;
  const targetIsTag = isTag(target);
  const isCompositeComponent = !targetIsTag;

  const {
    attrs = EMPTY_ARRAY,
    componentId = generateId(options.displayName, options.parentComponentId),
    displayName = targetIsTag
      ? `styled.${target as string}`
      : `Styled(${getComponentName(target as AnyComponent)})`,
  } = options;

  const styledComponentId =
    options.displayName && options.componentId
      ? escape(options.displayName) + '-' + options.componentId
      : options.componentId || componentId;

  const finalAttrs =
    isTargetStyledComp && styledComponentTarget.attrs
      ? styledComponentTarget.attrs.concat(attrs as unknown as Attrs<OuterProps>[]).filter(Boolean)
      : (attrs as Attrs<OuterProps>[]);

  let { shouldForwardProp } = options;

  if (isTargetStyledComp && styledComponentTarget.shouldForwardProp) {
    const shouldForwardPropFn = styledComponentTarget.shouldForwardProp;

    if (options.shouldForwardProp) {
      const passedShouldForwardPropFn = options.shouldForwardProp;

      shouldForwardProp = (prop, elementToBeCreated) =>
        shouldForwardPropFn(prop, elementToBeCreated) &&
        passedShouldForwardPropFn(prop, elementToBeCreated);
    } else {
      shouldForwardProp = shouldForwardPropFn;
    }
  }

  const webStyle = new WebStyle(
    rules,
    styledComponentId,
    isTargetStyledComp ? styledComponentTarget.webStyle : undefined
  );

  /**
   * React 19 ref-as-prop; no `React.forwardRef` wrapper. We shape the
   * wrapper as a `React.memo` object directly (`{$$typeof, type, compare,
   * …}`) rather than calling `React.memo(...)` and then mutating ten
   * statics onto the result. The single object literal lets V8 use one
   * hidden class for every styled component instead of walking a fresh
   * transition chain per construction. `React.memo` lets the parent's
   * re-render skip this component when props are shallow-equal, which is
   * the sound place to bail out: only the caller knows the full set of
   * inputs its interpolations depend on. `webStyle`'s content-addressed
   * caches keep the per-render work cheap when memo does re-run.
   */
  const RenderInner: {
    (props: ExecutionProps & OuterProps & { ref?: Ref<Element> }): React.JSX.Element;
    displayName?: string;
  } = props => useImpl<OuterProps>(WrappedStyledComponent, props, props.ref);
  RenderInner.displayName = displayName;

  const foldedComponentIds = isTargetStyledComp
    ? joinStrings(styledComponentTarget.foldedComponentIds, styledComponentTarget.styledComponentId)
    : '';
  const resolvedTarget: WebTarget = isTargetStyledComp ? styledComponentTarget.target : target;

  let WrappedStyledComponent = {
    $$typeof: REACT_MEMO_TYPE,
    type: RenderInner,
    compare: null,
    // styled-component statics laid out in a fixed order. Same shape for
    // every component → one hidden class for the whole population.
    attrs: finalAttrs,
    webStyle,
    displayName,
    shouldForwardProp,
    // Static plan where possible; null slots fall back to runtime invocation.
    // `undefined` when the chain has no arity-2 attrs.
    postAttrsPlans: chainHasPostAttrs(finalAttrs)
      ? buildPostAttrsPlans(finalAttrs, prop => findChainDecl(webStyle, prop, noFilled))
      : undefined,
    foldedComponentIds,
    target: resolvedTarget,
    styledComponentId,
    // Shared toString: reads `this.styledComponentId` so a single function
    // serves every styled component instead of allocating a per-component
    // closure. ${StyledFoo} interpolation calls toString() with the styled
    // component as `this`, so the lookup binds correctly.
    toString: styledToString,
  } as unknown as IStyledComponent<'web', OuterProps> & Statics;

  if (__DEV__) {
    if (options.displayName) registerLabel(styledComponentId, options.displayName);

    checkDynamicCreation(displayName, styledComponentId);

    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(
      displayName,
      styledComponentId
    );
  }

  if (isCompositeComponent) {
    const compositeComponentTarget = target as AnyComponent;

    hoist<typeof WrappedStyledComponent, typeof compositeComponentTarget>(
      WrappedStyledComponent,
      compositeComponentTarget,
      HOIST_EXCLUDE as { [key in keyof OmitNever<IStyledStatics<'web', OuterProps>>]: true }
    );
  }

  return WrappedStyledComponent;
}

export default createStyledComponent;
