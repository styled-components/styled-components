import isPropValid from '@emotion/is-prop-valid';
import React, { createElement, PropsWithoutRef, Ref } from 'react';
import { IS_RSC, SC_ATTR, SC_VERSION, SPLITTER } from '../constants';
import { getGroupForId } from '../sheet/GroupIDAllocator';
import type StyleSheet from '../sheet';
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
  Stringifier,
  StyledOptions,
  WebTarget,
} from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import generateDisplayName from '../utils/generateDisplayName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import isTag from '../utils/isTag';
import { joinStrings, stripSplitter } from '../utils/joinStrings';
import merge from '../utils/mixinDeep';
import { createRSCCache } from '../utils/rscCache';
import { setToString } from '../utils/setToString';
import ComponentStyle, { getCompiledCSS } from './ComponentStyle';
import { useStyleSheetContext } from './StyleSheetManager';
import { DefaultTheme, ThemeContext } from './ThemeProvider';

declare const __SERVER__: boolean;

const hasOwn = Object.prototype.hasOwnProperty;

const identifiers: { [key: string]: number } = {};

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

/**
 * Shallow-compare two context objects using a stored key count to avoid
 * a second iteration pass. Returns true if all own-property values match.
 */
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

function useInjectedStyle<T extends ExecutionContext>(
  componentStyle: ComponentStyle,
  resolvedAttrs: T,
  styleSheet: StyleSheet,
  stylis: Stringifier
): string {
  const className = componentStyle.generateAndInjectStyles(resolvedAttrs, styleSheet, stylis);

  if (process.env.NODE_ENV !== 'production' && React.useDebugValue) {
    React.useDebugValue(className);
  }

  return className;
}

// Cached render inputs + style result: [prevProps, prevTheme, prevStyleSheet, prevStylis,
// prevPropsKeyCount, cachedContext, cachedClassName]
type RenderCache = [
  object, // prevProps
  DefaultTheme | undefined, // prevTheme
  StyleSheet, // prevStyleSheet
  Stringifier, // prevStylis
  number, // prevPropsKeyCount
  object, // cachedContext
  string, // cachedClassName
  ComponentStyle, // prevComponentStyle (for HMR invalidation)
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
        // Apply attr value unless the user explicitly passed undefined for this prop,
        // which signals intent to reset the value.
        // @ts-expect-error attrs can dynamically add arbitrary properties
        context[key] = resolvedAttrDef[key];
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

/** Cache RegExp objects for :where() wrapping to avoid recompilation per render */
const whereRegExpCache = new Map<string, RegExp>();
function getWhereRegExp(name: string): RegExp {
  let re = whereRegExpCache.get(name);
  if (!re) {
    re = new RegExp('\\.' + name + '(?![a-zA-Z0-9_-])', 'g');
    whereRegExpCache.set(name, re);
  }
  return re;
}

/** Wrap base-level CSS class selectors in :where() for zero specificity (RSC inheritance). */
function wrapBaseInWhere(levelCss: string, componentId: string, styleSheet: StyleSheet): string {
  const names = styleSheet.names.get(componentId);
  if (names) {
    for (const name of names) {
      const re = getWhereRegExp(name);
      re.lastIndex = 0;
      levelCss = levelCss.replace(re, ':where(.' + name + ')');
    }
  }
  return levelCss;
}

function buildPropsForElement(
  context: Record<string, any>,
  elementToBeCreated: WebTarget,
  theme: DefaultTheme | undefined,
  shouldForwardProp: ((prop: string, el: WebTarget) => boolean) | undefined
): Dict<any> {
  const propsForElement: Dict<any> = {};

  for (const key in context) {
    if (context[key] === undefined) {
      // Omit undefined values from props passed to wrapped element.
    } else if (key[0] === '$' || key === 'as' || (key === 'theme' && context.theme === theme)) {
      // Omit transient props and execution props.
    } else if (key === 'forwardedAs') {
      propsForElement.as = context.forwardedAs;
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      propsForElement[key] = context[key];

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

  return propsForElement;
}

function useStyledComponentImpl<Props extends BaseObject>(
  forwardedComponent: IStyledComponent<'web', Props>,
  props: ExecutionProps & Props,
  forwardedRef: Ref<Element>
) {
  const {
    attrs: componentAttrs,
    componentStyle,
    defaultProps,
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

  // NOTE: the non-hooks version only subscribes to this when !componentStyle.isStatic,
  // but that'd be against the rules-of-hooks. We could be naughty and do it anyway as it
  // should be an immutable value, but behave for now.
  const theme =
    determineTheme(props, contextTheme, defaultProps) || (IS_RSC ? undefined : EMPTY_OBJECT);

  let context: React.HTMLAttributes<Element> & ExecutionContext & Props;
  let generatedClassName: string;

  // Client-only render cache: skip resolveContext and generateAndInjectStyles
  // when props+theme haven't changed. propsForElement is always rebuilt since
  // it's mutated with className/ref after construction.
  // __SERVER__ and IS_RSC are build/module-level constants for dead-code elimination.
  if (!__SERVER__ && !IS_RSC) {
    const renderCacheRef = React.useRef<RenderCache | null>(null);
    const prev = renderCacheRef.current;

    if (
      prev !== null &&
      prev[1] === theme &&
      prev[2] === ssc.styleSheet &&
      prev[3] === ssc.stylis &&
      prev[7] === componentStyle &&
      shallowEqualContext(prev[0], props, prev[4])
    ) {
      context = prev[5] as typeof context;
      generatedClassName = prev[6];
    } else {
      context = resolveContext<Props>(componentAttrs, props, theme);
      generatedClassName = useInjectedStyle(componentStyle, context, ssc.styleSheet, ssc.stylis);

      let propsKeyCount = 0;
      for (const key in props) {
        if (hasOwn.call(props, key)) propsKeyCount++;
      }
      renderCacheRef.current = [
        props,
        theme,
        ssc.styleSheet,
        ssc.stylis,
        propsKeyCount,
        context,
        generatedClassName,
        componentStyle,
      ];
    }
  } else {
    context = resolveContext<Props>(componentAttrs, props, theme);
    generatedClassName = useInjectedStyle(componentStyle, context, ssc.styleSheet, ssc.stylis);
  }

  if (process.env.NODE_ENV !== 'production' && forwardedComponent.warnTooManyClasses) {
    forwardedComponent.warnTooManyClasses(generatedClassName);
  }

  const elementToBeCreated: WebTarget = context.as || target;
  const propsForElement = buildPropsForElement(
    context,
    elementToBeCreated,
    theme,
    shouldForwardProp
  );

  let classString = joinStrings(foldedComponentIds, styledComponentId);
  if (generatedClassName) {
    classString += ' ' + generatedClassName;
  }
  if (context.className) {
    classString += ' ' + context.className;
  }

  propsForElement[
    isTag(elementToBeCreated) && elementToBeCreated.includes('-') ? 'class' : 'className'
  ] = classString;

  if (forwardedRef) {
    propsForElement.ref = forwardedRef;
  }

  const element = createElement(elementToBeCreated, propsForElement);

  // RSC mode: emit this component's CSS (and its inheritance chain + keyframes)
  // as an inline <style> tag. No `precedence` — server component output isn't
  // hydrated, so no mismatch. Inline body styles come after the registry's
  // <head> styles in source order, so extensions naturally win (#5672).
  if (IS_RSC) {
    const emitted = getEmittedNames ? getEmittedNames() : null;

    let newNames: string[] | null = null;
    let totalNames = 0;
    let css = '';
    let usedCache = true;

    let walk: ComponentStyle | null | undefined = componentStyle;
    while (walk) {
      const names = ssc.styleSheet.names.get(walk.componentId);
      if (names) {
        totalNames += names.size;
        for (const name of names) {
          if (!emitted || !emitted.has(name)) {
            if (!newNames) newNames = [];
            newNames.push(name);
            if (emitted) emitted.add(name);
          }
        }
      }

      if (newNames && usedCache) {
        let levelCss = getCompiledCSS(walk, ssc.styleSheet);
        if (levelCss === null) {
          usedCache = false;
        } else {
          if (walk !== componentStyle) {
            levelCss = wrapBaseInWhere(levelCss, walk.componentId, ssc.styleSheet);
          }
          css = levelCss + css;
        }
      }

      walk = walk.baseStyle;
    }

    if (newNames && !usedCache) {
      css = '';
      const tag = ssc.styleSheet.getTag();
      let cs: ComponentStyle | null | undefined = componentStyle;
      while (cs) {
        let levelCss = tag.getGroup(getGroupForId(cs.componentId));
        if (levelCss && cs !== componentStyle) {
          levelCss = wrapBaseInWhere(levelCss, cs.componentId, ssc.styleSheet);
        }
        css = levelCss + css;
        cs = cs.baseStyle;
      }
    }

    let kfCss = '';
    if (ssc.styleSheet.keyframeIds.size > 0) {
      const kfTag = ssc.styleSheet.getTag();
      for (const kfId of ssc.styleSheet.keyframeIds) {
        if (emitted && emitted.has(kfId)) continue;
        const kfRules = kfTag.getGroup(getGroupForId(kfId));
        if (kfRules) {
          kfCss += kfRules;
          if (emitted) emitted.add(kfId);
        }
      }
    }

    if (css && emitted && newNames && newNames.length < totalNames) {
      const rules = css.split(SPLITTER);
      let filtered = '';
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (!rule) continue;
        for (let j = 0; j < newNames.length; j++) {
          const re = getWhereRegExp(newNames[j]);
          re.lastIndex = 0;
          if (re.test(rule)) {
            filtered += rule + SPLITTER;
            break;
          }
        }
      }
      css = filtered;
    }

    const combined = stripSplitter(kfCss + css);
    if (combined) {
      const styleElement = React.createElement('style', {
        [SC_ATTR]: '',
        key: 'sc-' + componentStyle.componentId,
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

  const componentStyle = new ComponentStyle(
    rules,
    styledComponentId,
    isTargetStyledComp ? (styledComponentTarget.componentStyle as ComponentStyle) : undefined
  );

  function forwardRefRender(
    props: PropsWithoutRef<ExecutionProps & OuterProps>,
    ref: Ref<Element>
  ) {
    return useStyledComponentImpl<OuterProps>(
      WrappedStyledComponent,
      props as ExecutionProps & OuterProps,
      ref
    );
  }

  forwardRefRender.displayName = displayName;

  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */
  let WrappedStyledComponent = React.forwardRef(forwardRefRender) as unknown as IStyledComponent<
    'web',
    any
  > &
    Statics;
  WrappedStyledComponent.attrs = finalAttrs;
  WrappedStyledComponent.componentStyle = componentStyle;
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

  Object.defineProperty(WrappedStyledComponent, 'defaultProps', {
    get() {
      return this._foldedDefaultProps;
    },

    set(obj) {
      this._foldedDefaultProps = isTargetStyledComp
        ? merge({}, styledComponentTarget.defaultProps, obj)
        : obj;
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    checkDynamicCreation(displayName, styledComponentId);

    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(
      displayName,
      styledComponentId
    );
  }

  setToString(WrappedStyledComponent, () => `.${WrappedStyledComponent.styledComponentId}`);

  if (isCompositeComponent) {
    const compositeComponentTarget = target as AnyComponent;

    hoist<typeof WrappedStyledComponent, typeof compositeComponentTarget>(
      WrappedStyledComponent,
      compositeComponentTarget,
      {
        // all SC-specific things should not be hoisted
        attrs: true,
        componentStyle: true,
        displayName: true,
        foldedComponentIds: true,
        shouldForwardProp: true,
        styledComponentId: true,
        target: true,
      } as { [key in keyof OmitNever<IStyledStatics<'web', OuterProps>>]: true }
    );
  }

  return WrappedStyledComponent;
}

export default createStyledComponent;
