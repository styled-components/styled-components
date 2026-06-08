import React, { createElement, Ref } from 'react';
import isPropValid from '../utils/isPropValid';

/** React.memo's `$$typeof` symbol; constructed in-place to skip the
 *  `React.memo()` call's allocation + the per-static property transition
 *  that mutating its result would force. Pre-shaping the wrapper as a
 *  single object literal keeps every styled component on a single hidden
 *  class. */
const REACT_MEMO_TYPE = Symbol.for('react.memo');
import { SC_ATTR, SC_VERSION } from '../constants';
import { IS_RSC } from '../utils/isRsc';
import type StyleSheet from '../sheet';
import type {
  AnyComponent,
  Attrs,
  BaseObject,
  CompiledAst,
  Dict,
  ExecutionContext,
  ExecutionProps,
  IStyledComponent,
  Compiler,
  IStyledComponentFactory,
  IStyledStatics,
  OmitNever,
  RuleSet,
  StyledOptions,
  WebTarget,
} from '../types';
import { NodeKind, type Root, type TemplateValue } from '../parser/ast';
import { evaluateForFastPath, type FastPathFragment } from '../parser/compile';
import { getSource } from '../parser/source';
import { themeValue } from '../utils/themePath';
import { tracePostAttr, type PostAttrsPlan } from '../utils/tracePostAttrs';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import createWarnTooManyClasses, {
  LIMIT as TOO_MANY_CLASSES_LIMIT,
} from '../utils/createWarnTooManyClasses';
import { fifoSet } from '../utils/fifoMap';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import getComponentName from '../utils/getComponentName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import isTag from '../utils/isTag';
import { joinRules, joinStrings, stripSplitter } from '../utils/joinStrings';
import { createRSCCache } from '../utils/rscCache';
import { setToString } from '../utils/setToString';
import shallowEqual from '../utils/shallowEqual';
import { warnOnce } from '../utils/warnOnce';
import WebStyle, { GeneratedStyle } from './WebStyle';
import { useStyleSheetContext } from './StyleSheetManager';
import { DefaultTheme, ThemeContext } from './ThemeProvider';

declare const __SERVER__: boolean;

const hasOwn = Object.prototype.hasOwnProperty;

const identifiers: { [key: string]: number } = {};

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
      // Isolate multiple styled-components runtimes on one page.
      SC_VERSION + name + identifiers[name]
    );

  return parentComponentId ? parentComponentId + '-' + componentId : componentId;
}

function useInjectedStyle<T extends ExecutionContext>(
  webStyle: WebStyle,
  resolvedAttrs: T,
  styleSheet: StyleSheet,
  compiler: Compiler
): string {
  return webStyle.flush(resolvedAttrs, styleSheet, compiler);
}

/**
 * RSC counterpart to `useInjectedStyle`. Runs `generate()` to produce the
 * inheritance chain's compiled CSS without writing to the tag; registers
 * each new class name so repeat renders of the same component/props skip
 * compilation. Returns both the class name (for the element) and the
 * generated levels (consumed by the inline <style> emission).
 */
function rscFlush<T extends ExecutionContext>(
  webStyle: WebStyle,
  resolvedAttrs: T,
  styleSheet: StyleSheet,
  compiler: Compiler
): GeneratedStyle {
  const generated = webStyle.generate(resolvedAttrs, styleSheet, compiler);
  for (let i = 0; i < generated.levels.length; i++) {
    const level = generated.levels[i];
    if (level.isNew) styleSheet.registerName(level.componentId, level.name);
  }
  return generated;
}

// Cached render inputs + style result: [prevProps, prevTheme, prevStyleSheet, prevCompiler,
// prevPropsKeyCount, cachedContext, cachedClassName, prevWebStyle, popOverrides]
type RenderCache = [
  object, // prevProps
  DefaultTheme | undefined, // prevTheme
  StyleSheet, // prevStyleSheet
  Compiler, // prevCompiler
  number, // prevPropsKeyCount
  object, // cachedContext
  string, // cachedClassName
  WebStyle, // prevWebStyle (for HMR invalidation)
  Dict<string> | null, // popOverrides (post-compile attrs inline-style override)
];

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
    if (isFunction(attrDef) && (attrDef as Function).length >= 2) continue;
    const resolvedAttrDef = isFunction(attrDef)
      ? (attrDef as unknown as (p: typeof context) => ExecutionProps & Partial<Props>)(
          needsCopy ? { ...context } : context
        )
      : attrDef;

    const resolvedDict = resolvedAttrDef as Dict<unknown>;
    for (const key in resolvedDict) {
      if (key === 'className') {
        context.className = joinStrings(context.className, resolvedDict[key] as string);
      } else if (key === 'style') {
        context.style = { ...context.style, ...(resolvedDict[key] as React.CSSProperties) };
      } else if (!(key in props && (props as Dict<unknown>)[key] === undefined)) {
        // Apply attr value unless the user explicitly passed undefined for this
        // prop, which signals intent to reset the value. Cast at the
        // assignment site since attrs intentionally add arbitrary keys to
        // the resolved context.
        (context as unknown as Dict<unknown>)[key] = resolvedDict[key];
      }
    }
  }

  if ('className' in props && typeof props.className === 'string') {
    context.className = joinStrings(context.className, props.className);
  }

  return context;
}

let seenUnknownProps: Set<string> | undefined;

/** Per-render tracking of emitted class names and keyframe IDs for RSC dedup. */
const getEmittedNames = createRSCCache(() => new Set<string>());

/**
 * Cache RegExp objects for :where() wrapping to avoid recompilation per
 * render. Bounded with FIFO eviction at the same threshold the
 * warn-too-many-classes machinery uses; without the cap, RSC SSR with
 * unbounded class-name variation would leak a regex per unique class.
 */
const whereRegExpCache = new Map<string, RegExp>();
function getWhereRegExp(name: string): RegExp {
  let re = whereRegExpCache.get(name);
  if (!re) {
    re = new RegExp('\\.' + name + '(?![a-zA-Z0-9_-])', 'g');
    fifoSet(whereRegExpCache, name, re, TOO_MANY_CLASSES_LIMIT);
  }
  return re;
}

function wrapLevelInWhere(levelCss: string, name: string): string {
  const re = getWhereRegExp(name);
  re.lastIndex = 0;
  return levelCss.replace(re, ':where(.' + name + ')');
}

/**
 * Resolve a `TemplateValue` (interleaved chunks + slot indices) against the
 * already-evaluated `filled[]` array. Mirrors the `chunks[0] + filled[s] +
 * chunks[1] + ...` join the parser produces, without allocating an
 * intermediate array.
 */
function resolveTemplateValue(tv: TemplateValue, filled: ReadonlyArray<string>): string {
  let s = tv.chunks[0];
  for (let i = 0; i < tv.slots.length; i++) {
    s += filled[tv.slots[i]] + tv.chunks[i + 1];
  }
  return s;
}

/**
 * Linear scan of the source AST for a top-level (non-nested) declaration
 * matching `prop`. Used by `ast.peek` / `ast.pop` to surface a CSS-style
 * value into the post-compile attrs callback without building a full Map
 * upfront. `filled` is the per-render evaluated interpolation array
 * (lazy;only requested when an attrs callback actually reads).
 */
function findBaseDecl(
  ast: Root,
  filled: ReadonlyArray<string> | null,
  prop: string
): string | undefined {
  for (let i = 0; i < ast.length; i++) {
    const node = ast[i];
    if (node.kind !== NodeKind.Decl) continue;
    if (typeof node.prop !== 'string' || node.prop !== prop) continue;
    const v = node.value;
    if (typeof v === 'string') return v;
    // Templated value: resolve interpolations against `filled`. If the
    // fast-path evaluator bailed (`filled === null`), the value is
    // unresolvable for this render; treat as absent.
    if (filled === null) return undefined;
    return resolveTemplateValue(v, filled);
  }
  return undefined;
}

/**
 * Post-compile attrs phase for the web runtime. Mirrors the native
 * counterpart: arity-2 attrs run after `resolveContext`, with an `ast`
 * accessor backed by a lazy walk over the source AST. Pop calls collect
 * keys into `popOverrides` so the caller can apply inline-style overrides
 * (CSS `unset`) to the rendered element;best-effort removal because the
 * emitted CSS class is hash-derived from the full decl set and cannot be
 * filtered per render without exploding the cache.
 *
 * Native fully removes the decl from the compiled style object; web
 * relies on the inline-style override. Documented asymmetry.
 */
function mergePostAttrsResult<Props extends BaseObject>(
  context: React.HTMLAttributes<Element> & ExecutionContext & Props,
  props: ExecutionProps & Props,
  resolved: Dict<unknown>
): void {
  for (const key in resolved) {
    if (key === 'className') {
      context.className = joinStrings(context.className, resolved[key] as string);
    } else if (key === 'style') {
      context.style = {
        ...context.style,
        ...(resolved[key] as React.CSSProperties),
      };
    } else if (!(key in props && (props as Dict<unknown>)[key] === undefined)) {
      (context as unknown as Dict<unknown>)[key] = resolved[key];
    }
  }
}

function applyPostAttrsWeb<Props extends BaseObject>(
  context: React.HTMLAttributes<Element> & ExecutionContext & Props,
  props: ExecutionProps & Props,
  attrs: Attrs<React.HTMLAttributes<Element> & Props>[],
  plans: ReadonlyArray<PostAttrsPlan | null> | undefined,
  webStyle: WebStyle
): Dict<string> | null {
  let popOverrides: Dict<string> | null = null;
  let planIdx = 0;
  // Lazy: only built when an attr without a static plan needs to invoke
  // its callback at runtime (the fallback path).
  let lazyState:
    | {
        source: ReturnType<typeof getSource>;
        ast: Root;
        filled: ReadonlyArray<string> | null | undefined;
      }
    | null
    | undefined = undefined;
  let astAccessor: CompiledAst | null = null;

  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (!isFunction(attr) || (attr as Function).length < 2) continue;

    const plan = plans !== undefined ? plans[planIdx] : null;
    planIdx++;

    if (plan !== null && plan !== undefined) {
      mergePostAttrsResult(context, props, plan.output);
      if (plan.popped !== null) {
        if (popOverrides === null) popOverrides = {};
        plan.popped.forEach(key => {
          (popOverrides as Dict<string>)[key] = 'unset';
        });
      }
      continue;
    }

    // Runtime fallback for traces that bailed (props read, derived values,
    // templated decls, etc.). Build the AST + filled state lazily;only
    // pay this cost when we actually need to invoke the user's callback.
    if (lazyState === undefined) {
      const source = getSource(webStyle.rules);
      lazyState = source ? { source, ast: source.ast, filled: undefined } : null;
    }
    if (lazyState === null) continue;
    const state = lazyState;

    if (astAccessor === null) {
      const ensureFilled = (): ReadonlyArray<string> | null => {
        if (state.filled !== undefined) return state.filled as ReadonlyArray<string> | null;
        const src = state.source!;
        const buf: string[] = new Array(src.interpolations.length);
        const fragBuf: (FastPathFragment | null)[] = new Array(src.interpolations.length);
        state.filled = evaluateForFastPath(
          src,
          context as ExecutionContext,
          buf,
          undefined,
          fragBuf
        );
        return state.filled;
      };
      const theme = (context as { theme?: unknown }).theme;
      // Per-render lookup cache: same key resolved once. Theme-path walks
      // and AST decl scans alike skip on a cache hit. Pop's inline-style
      // override is idempotent;the override is set on the first lookup
      // and subsequent pops on the same key are cheap.
      const cache = new Map<string, unknown>();
      const lookup = (keyOrPath: string): unknown => {
        let v: unknown = cache.get(keyOrPath);
        if (v !== undefined || cache.has(keyOrPath)) return v;
        if (keyOrPath.indexOf('.') !== -1) {
          v = themeValue(theme, keyOrPath);
        } else {
          v = findBaseDecl(state.ast, ensureFilled(), keyOrPath);
        }
        cache.set(keyOrPath, v);
        return v;
      };
      astAccessor = {
        pop(keyOrPath: string, fallback?: unknown): unknown {
          const v = lookup(keyOrPath);
          if (keyOrPath.indexOf('.') === -1 && v !== undefined) {
            if (popOverrides === null) popOverrides = {};
            (popOverrides as Dict<string>)[keyOrPath] = 'unset';
          }
          return v !== undefined ? v : fallback;
        },
        peek(keyOrPath: string, fallback?: unknown): unknown {
          const v = lookup(keyOrPath);
          return v !== undefined ? v : fallback;
        },
      } as CompiledAst;
    }

    const resolved = (
      attr as (p: ExecutionContext & Props, a: CompiledAst) => ExecutionProps & Partial<Props>
    )({ ...context }, astAccessor);
    mergePostAttrsResult(context, props, resolved as Dict<unknown>);
  }

  return popOverrides;
}

function hasPostAttrsWeb<Props extends BaseObject>(
  attrs: Attrs<React.HTMLAttributes<Element> & Props>[]
): boolean {
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i];
    if (typeof a === 'function' && (a as Function).length >= 2) return true;
  }
  return false;
}

/**
 * Walk the final attrs chain and trace each arity-2 callback against the
 * component's rules. Output is parallel-indexed with the arity-2 entries
 * in iteration order (filter out arity-1 / object attrs). A `null` slot
 * means the callback couldn't be statically traced; the render path will
 * invoke the original function for that slot.
 */
function buildPostAttrsPlans<Props extends BaseObject>(
  attrs: Attrs<React.HTMLAttributes<Element> & Props>[],
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

function buildPropsForElement(
  context: Record<string, any>,
  elementToBeCreated: WebTarget,
  theme: DefaultTheme | undefined,
  shouldForwardProp: ((prop: string, el: WebTarget) => boolean) | undefined
): Dict<any> {
  const out: Dict<any> = {};

  for (const key in context) {
    if (context[key] === undefined) {
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

  const contextTheme = !IS_RSC ? React.useContext(ThemeContext) : undefined;
  const ssc = useStyleSheetContext();
  const shouldForwardProp = forwardedComponent.shouldForwardProp || ssc.shouldForwardProp;

  if (__DEV__ && React.useDebugValue) {
    React.useDebugValue(styledComponentId);
  }

  const theme = determineTheme(props, contextTheme) || (IS_RSC ? undefined : EMPTY_OBJECT);

  let context: React.HTMLAttributes<Element> & ExecutionContext & Props;
  let generatedClassName: string;
  let generatedStyle: GeneratedStyle | null = null;
  let popOverrides: Dict<string> | null = null;
  const wantsPostAttrs = forwardedComponent.hasPostAttrs === true;

  if (!__SERVER__ && !IS_RSC) {
    const renderCacheRef = React.useRef<RenderCache | null>(null);
    const prev = renderCacheRef.current;

    if (
      prev !== null &&
      prev[1] === theme &&
      prev[2] === ssc.styleSheet &&
      prev[3] === ssc.compiler &&
      prev[7] === webStyle &&
      shallowEqual(prev[0], props, prev[4])
    ) {
      context = prev[5] as typeof context;
      generatedClassName = prev[6];
      popOverrides = prev[8];
    } else {
      context = resolveContext<Props>(componentAttrs, props, theme);
      if (wantsPostAttrs) {
        popOverrides = applyPostAttrsWeb<Props>(
          context,
          props,
          componentAttrs,
          forwardedComponent.postAttrsPlans,
          webStyle
        );
      }
      generatedClassName = useInjectedStyle(webStyle, context, ssc.styleSheet, ssc.compiler);

      let propsKeyCount = 0;
      for (const key in props) {
        if (hasOwn.call(props, key)) propsKeyCount++;
      }
      renderCacheRef.current = [
        props,
        theme,
        ssc.styleSheet,
        ssc.compiler,
        propsKeyCount,
        context,
        generatedClassName,
        webStyle,
        popOverrides,
      ];
    }
  } else {
    context = resolveContext<Props>(componentAttrs, props, theme);
    if (wantsPostAttrs) {
      popOverrides = applyPostAttrsWeb<Props>(
        context,
        props,
        componentAttrs,
        forwardedComponent.postAttrsPlans,
        webStyle
      );
    }
    if (IS_RSC) {
      generatedStyle = rscFlush(webStyle, context, ssc.styleSheet, ssc.compiler);
      generatedClassName = generatedStyle.className;
    } else {
      generatedClassName = useInjectedStyle(webStyle, context, ssc.styleSheet, ssc.compiler);
    }
  }

  if (__DEV__ && React.useDebugValue) {
    React.useDebugValue(generatedClassName);
  }

  if (__DEV__ && forwardedComponent.warnTooManyClasses) {
    forwardedComponent.warnTooManyClasses(generatedClassName);
  }

  const elementToBeCreated: WebTarget = context.as || target;
  const elementProps = buildPropsForElement(context, elementToBeCreated, theme, shouldForwardProp);

  // Apply popped declarations as inline-style overrides; user-passed
  // `style` keys win so explicit overrides aren't clobbered by the reset.
  if (popOverrides !== null) {
    elementProps.style = { ...popOverrides, ...(elementProps.style as object | undefined) };
  }

  let classString = joinStrings(foldedComponentIds, styledComponentId);
  if (generatedClassName) {
    classString += ' ' + generatedClassName;
  }
  if (context.className) {
    classString += ' ' + context.className;
  }

  elementProps[
    isTag(elementToBeCreated) && elementToBeCreated.includes('-') ? 'class' : 'className'
  ] = classString;

  if (forwardedRef) {
    elementProps.ref = forwardedRef;
  }

  const element = createElement(elementToBeCreated, elementProps);

  // RSC mode: emit this component's CSS (and its inheritance chain + keyframes)
  // as an inline <style> tag. No `precedence`; server component output isn't
  // hydrated, so no mismatch. Inline body styles come after the registry's
  // <head> styles in source order, so extensions naturally win (#5672).
  if (IS_RSC && generatedStyle) {
    const emitted = getEmittedNames ? getEmittedNames() : null;
    const levels = generatedStyle.levels;
    const lastIdx = levels.length - 1;
    let css = '';

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (emitted && emitted.has(level.name)) continue;
      if (level.rules.length === 0) continue;

      let levelCss = joinRules(level.rules);
      if (i !== lastIdx) {
        // Base levels in an inheritance chain are wrapped in :where() so their
        // specificity is zero, letting any extension override without !important.
        levelCss = wrapLevelInWhere(levelCss, level.name);
      }
      css += levelCss;
      if (emitted) emitted.add(level.name);
    }

    // Keyframes carried as pure data on `generatedStyle.keyframes`. Each entry
    // already holds the compiled `@keyframes` rules; the per-render `emitted`
    // set dedups by resolved name so duplicate refs across siblings collapse.
    let kfCss = '';
    const kfList = generatedStyle.keyframes;
    for (let i = 0; i < kfList.length; i++) {
      const compiled = kfList[i];
      if (emitted && emitted.has(compiled.name)) continue;
      kfCss += joinRules(compiled.rules);
      if (emitted) emitted.add(compiled.name);
    }

    const combined = stripSplitter(kfCss + css);
    if (combined) {
      const styleElement = React.createElement('style', {
        [SC_ATTR]: '',
        key: 'sc-' + webStyle.componentId,
        children: combined,
      });
      return React.createElement(React.Fragment, null, styleElement, element);
    }
  }

  return element;
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
   * re-render skip this component when props are shallow-equal; the
   * internal render-cache inside `useImpl` is a layered fallback for
   * cases memo doesn't catch (different prop refs with same values,
   * theme/sheet shifts, dynamic-only components).
   */
  const RenderInner: {
    (props: ExecutionProps & OuterProps & { ref?: Ref<Element> }): React.JSX.Element;
    displayName?: string;
  } = props => useImpl<OuterProps>(WrappedStyledComponent, props, props.ref);
  RenderInner.displayName = displayName;

  const hasPostAttrs = hasPostAttrsWeb(finalAttrs);
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
    hasPostAttrs,
    // Static plan where possible; null slots fall back to runtime invocation.
    postAttrsPlans: hasPostAttrs ? buildPostAttrsPlans(finalAttrs, rules) : undefined,
    foldedComponentIds,
    target: resolvedTarget,
    styledComponentId,
    // Shared toString: reads `this.styledComponentId` so a single function
    // serves every styled component instead of allocating a per-component
    // closure. ${StyledFoo} interpolation calls toString() with the styled
    // component as `this`, so the lookup binds correctly.
    toString: styledToString,
  } as unknown as IStyledComponent<'web', any> & Statics;

  if (__DEV__) {
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
