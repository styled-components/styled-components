import isPropValid from '@emotion/is-prop-valid';
import React, { createElement, PropsWithoutRef, Ref } from 'react';
import { SC_ATTR, SC_VERSION } from '../constants';
import { IS_RSC } from '../utils/isRsc';
import { groupForId } from '../sheet/GroupIDAllocator';
import type StyleSheet from '../sheet';
import type {
  AnyComponent,
  Attrs,
  BaseObject,
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
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import createWarnTooManyClasses, {
  LIMIT as TOO_MANY_CLASSES_LIMIT,
} from '../utils/createWarnTooManyClasses';
import { fifoSet } from '../utils/fifoMap';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import generateDisplayName from '../utils/generateDisplayName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import isTag from '../utils/isTag';
import { joinRules, joinStrings, stripSplitter } from '../utils/joinStrings';
import { createRSCCache } from '../utils/rscCache';
import { setToString } from '../utils/setToString';
import shallowEqualContext from '../utils/shallowEqualContext';
import WebStyle, { GeneratedStyle } from './WebStyle';
import { useStyleSheetContext } from './StyleSheetManager';
import { DefaultTheme, ThemeContext } from './ThemeProvider';

declare const __SERVER__: boolean;

const hasOwn = Object.prototype.hasOwnProperty;

const identifiers: { [key: string]: number } = {};

/**
 * Hoist excludelist: SC-specific statics are already copied explicitly
 * above, so hoisting them again would stomp the wrapper's own values.
 * Hoisted to module scope so we don't allocate a fresh `{...}` literal on
 * every styled-component construction.
 */
/**
 * Shared `toString` for styled components: returns `.styledComponentId` so
 * `${StyledFoo}` interpolation resolves to the class selector. Defined at
 * module scope so every styled component shares one function reference
 * instead of allocating a fresh closure per construction.
 */
function styledToString(this: { styledComponentId: string }): string {
  return '.' + this.styledComponentId;
}

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

/* We depend on components having unique IDs */
function generateId(
  displayName?: string | undefined,
  parentComponentId?: string | undefined
): string {
  const name = typeof displayName !== 'string' ? 'sc' : escape(displayName);
  // Ensure that no displayName can lead to duplicate componentIds
  identifiers[name] = (identifiers[name] || 0) + 1;

  const componentId =
    name +
    '-' +
    generateComponentId(
      // SC_VERSION gives us isolation between multiple runtimes on the page at once
      // this is improved further with use of the babel plugin "namespace" feature
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
  const className = webStyle.flush(resolvedAttrs, styleSheet, compiler);

  if (process.env.NODE_ENV !== 'production' && React.useDebugValue) {
    React.useDebugValue(className);
  }

  return className;
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
// prevPropsKeyCount, cachedContext, cachedClassName]
type RenderCache = [
  object, // prevProps
  DefaultTheme | undefined, // prevTheme
  StyleSheet, // prevStyleSheet
  Compiler, // prevCompiler
  number, // prevPropsKeyCount
  object, // cachedContext
  string, // cachedClassName
  WebStyle, // prevWebStyle (for HMR invalidation)
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
    const resolvedAttrDef = isFunction(attrDef)
      ? attrDef(needsCopy ? { ...context } : context)
      : attrDef;

    for (const key in resolvedAttrDef) {
      if (key === 'className') {
        context.className = joinStrings(context.className, resolvedAttrDef[key] as string);
      } else if (key === 'style') {
        context.style = { ...context.style, ...(resolvedAttrDef[key] as React.CSSProperties) };
      } else if (!(key in props && (props as any)[key] === undefined)) {
        // Apply attr value unless the user explicitly passed undefined for this
        // prop, which signals intent to reset the value. Cast at the
        // assignment site since attrs intentionally add arbitrary keys to
        // the resolved context.
        (context as unknown as Dict<unknown>)[key] = (resolvedAttrDef as Dict<unknown>)[key];
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

/** Wrap a single level's class selector in :where() for zero specificity (RSC inheritance). */
function wrapLevelInWhere(levelCss: string, name: string): string {
  const re = getWhereRegExp(name);
  re.lastIndex = 0;
  return levelCss.replace(re, ':where(.' + name + ')');
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
      // Omit undefined values from props passed to wrapped element.
    } else if (
      key[0] === '$' ||
      key === 'as' ||
      key === 'ref' || // React 19 ref-as-prop: the ref is re-attached explicitly below.
      (key === 'theme' && context.theme === theme)
    ) {
      // Omit transient props and execution props.
    } else if (key === 'forwardedAs') {
      out.as = context.forwardedAs;
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      out[key] = context[key];

      if (
        !shouldForwardProp &&
        process.env.NODE_ENV === 'development' &&
        !isPropValid(key) &&
        !(seenUnknownProps || (seenUnknownProps = new Set())).has(key) &&
        isTag(elementToBeCreated) &&
        !elementToBeCreated.includes('-')
      ) {
        seenUnknownProps.add(key);
        console.warn(
          `styled-components: it looks like an unknown prop "${key}" is being sent through to the DOM, which will likely trigger a React console error. If you would like automatic filtering of unknown props, you can opt-into that behavior via \`<StyleSheetManager shouldForwardProp={...}>\` (connect an API like \`@emotion/is-prop-valid\`) or consider using transient props (\`$\` prefix for automatic filtering.)`
        );
      }
    }
  }

  return out;
}

function useImpl<Props extends BaseObject>(
  forwardedComponent: IStyledComponent<'web', Props>,
  props: ExecutionProps & Props,
  forwardedRef: Ref<Element>
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

  if (process.env.NODE_ENV !== 'production' && React.useDebugValue) {
    React.useDebugValue(styledComponentId);
  }

  const theme = determineTheme(props, contextTheme) || (IS_RSC ? undefined : EMPTY_OBJECT);

  let context: React.HTMLAttributes<Element> & ExecutionContext & Props;
  let generatedClassName: string;
  let generatedStyle: GeneratedStyle | null = null;

  if (!__SERVER__ && !IS_RSC) {
    const renderCacheRef = React.useRef<RenderCache | null>(null);
    const prev = renderCacheRef.current;

    if (
      prev !== null &&
      prev[1] === theme &&
      prev[2] === ssc.styleSheet &&
      prev[3] === ssc.compiler &&
      prev[7] === webStyle &&
      shallowEqualContext(prev[0], props, prev[4])
    ) {
      context = prev[5] as typeof context;
      generatedClassName = prev[6];
    } else {
      context = resolveContext<Props>(componentAttrs, props, theme);
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
      ];
    }
  } else {
    context = resolveContext<Props>(componentAttrs, props, theme);
    if (IS_RSC) {
      generatedStyle = rscFlush(webStyle, context, ssc.styleSheet, ssc.compiler);
      generatedClassName = generatedStyle.className;
      if (process.env.NODE_ENV !== 'production' && React.useDebugValue) {
        React.useDebugValue(generatedClassName);
      }
    } else {
      generatedClassName = useInjectedStyle(webStyle, context, ssc.styleSheet, ssc.compiler);
    }
  }

  if (process.env.NODE_ENV !== 'production' && forwardedComponent.warnTooManyClasses) {
    forwardedComponent.warnTooManyClasses(generatedClassName);
  }

  const elementToBeCreated: WebTarget = context.as || target;
  const elementProps = buildPropsForElement(context, elementToBeCreated, theme, shouldForwardProp);

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

    // Keyframes are tag-resident: flatten()'s keyframes.inject() writes them
    // during generate(); read compiled CSS out of the group here.
    let kfCss = '';
    if (ssc.styleSheet.keyframeIds.size > 0) {
      const kfTag = ssc.styleSheet.getTag();
      for (const kfId of ssc.styleSheet.keyframeIds) {
        if (emitted && emitted.has(kfId)) continue;
        const kfRules = kfTag.getGroup(groupForId(kfId));
        if (kfRules) {
          kfCss += kfRules;
          if (emitted) emitted.add(kfId);
        }
      }
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
  const isCompositeComponent = !isTag(target);

  const {
    attrs = EMPTY_ARRAY,
    componentId = generateId(options.displayName, options.parentComponentId),
    displayName = generateDisplayName(target),
  } = options;

  const styledComponentId =
    options.displayName && options.componentId
      ? escape(options.displayName) + '-' + options.componentId
      : options.componentId || componentId;

  // fold the underlying StyledComponent attrs up (implicit extend)
  const finalAttrs =
    isTargetStyledComp && styledComponentTarget.attrs
      ? styledComponentTarget.attrs.concat(attrs as unknown as Attrs<OuterProps>[]).filter(Boolean)
      : (attrs as Attrs<OuterProps>[]);

  let { shouldForwardProp } = options;

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

  const webStyle = new WebStyle(
    rules,
    styledComponentId,
    isTargetStyledComp ? styledComponentTarget.webStyle : undefined
  );

  /**
   * React 19 ref-as-prop; no `React.forwardRef` wrapper. Wrapping in
   * `React.memo` lets the parent's re-render skip this component entirely
   * when its props are shallow-equal to the previous render — the hook
   * calls, the per-instance render cache check, and React's reconciliation
   * for the child subtree all sit out. The internal render-cache inside
   * `useImpl` remains as a layered fallback for harder cases (different
   * prop references with same values, theme/sheet shifts) that memo doesn't
   * catch, and for components that always re-evaluate (e.g. dynamic-only).
   */
  const RenderInner: {
    (props: ExecutionProps & OuterProps & { ref?: Ref<Element> }): React.JSX.Element;
    displayName?: string;
  } = props =>
    useImpl<OuterProps>(
      WrappedStyledComponent,
      props as ExecutionProps & OuterProps,
      (props as { ref?: Ref<Element> }).ref as Ref<Element>
    );
  RenderInner.displayName = displayName;
  const RenderStyledComponent = React.memo(RenderInner) as unknown as typeof RenderInner;
  RenderStyledComponent.displayName = displayName;

  let WrappedStyledComponent = RenderStyledComponent as unknown as IStyledComponent<'web', any> &
    Statics;
  WrappedStyledComponent.attrs = finalAttrs;
  WrappedStyledComponent.webStyle = webStyle;
  WrappedStyledComponent.displayName = displayName;
  WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

  // this static is used to preserve the cascade of static classes for component selector
  // purposes; this is especially important with usage of the css prop
  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp
    ? joinStrings(styledComponentTarget.foldedComponentIds, styledComponentTarget.styledComponentId)
    : '';

  WrappedStyledComponent.styledComponentId = styledComponentId;

  // fold the underlying StyledComponent target up since we folded the styles
  WrappedStyledComponent.target = isTargetStyledComp ? styledComponentTarget.target : target;

  if (process.env.NODE_ENV !== 'production') {
    checkDynamicCreation(displayName, styledComponentId);

    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(
      displayName,
      styledComponentId
    );
  }

  // Shared toString: reads `this.styledComponentId` so a single function
  // serves every styled component instead of allocating a per-component
  // closure. ${StyledFoo} interpolation calls toString() with the styled
  // component as `this`, so the lookup binds correctly.
  setToString(WrappedStyledComponent, styledToString);

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
