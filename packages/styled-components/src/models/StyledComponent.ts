import isPropValid from '@emotion/is-prop-valid';
import React, { createElement, PropsWithoutRef, Ref } from 'react';
import { IS_RSC, SC_ATTR, SC_VERSION } from '../constants';
import { getGroupForId } from '../sheet/GroupIDAllocator';
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
import ComponentStyle, { getCompiledCSSForName } from './ComponentStyle';
import { useStyleSheetContext } from './StyleSheetManager';
import { DefaultTheme, ThemeContext } from './ThemeProvider';

declare const __SERVER__: boolean;

const identifiers: { [key: string]: number } = {};

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

/**
 * Dev-only per-request count of inline <style> tags emitted per component, used
 * to warn when one component floods a server render with redundant tags (a very
 * large repeated list). Request-scoped via React.cache; over/under-counting
 * across a Suspense boundary is harmless for a heuristic warning.
 */
const getEmitCounts =
  process.env.NODE_ENV !== 'production' ? createRSCCache(() => new Map<string, number>()) : null;

/**
 * Warn once a single component emits this many inline <style> tags in one server
 * render. Set well above any hand-written page; only pathological generated
 * lists reach it, which is exactly the case that wants a shared className.
 */
const RSC_REDUNDANT_EMIT_WARN_THRESHOLD = 1000;

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

/** Wrap the given base-level class selectors in :where() for zero specificity
 *  (RSC inheritance). Only this render's base names are passed, never the base
 *  component's full accumulated variant set, so an extended component with a
 *  dynamic base stays O(chain) per instance instead of O(variants). */
function wrapBaseInWhere(levelCss: string, names: string[]): string {
  for (let i = 0; i < names.length; i++) {
    const re = getWhereRegExp(names[i]);
    re.lastIndex = 0;
    levelCss = levelCss.replace(re, ':where(.' + names[i] + ')');
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

  // Interpolations and attr functions run on every render. They are this
  // component's own user code and may call hooks or read inputs outside
  // (props + theme), so skipping their evaluation across renders breaks the
  // rules of hooks (a hook count that changes between renders) and serves stale
  // styles (#5788). The pure work downstream of the produced CSS string
  // (hashing, compile, injection) is already memoized inside ComponentStyle; a
  // props-equal re-render bailout belongs at the component boundary via
  // React.memo, which only the caller can key correctly.
  const context = resolveContext<Props>(componentAttrs, props, theme);
  const generatedClassName = componentStyle.generateAndInjectStyles(
    context,
    ssc.styleSheet,
    ssc.stylis
  );

  if (process.env.NODE_ENV !== 'production' && React.useDebugValue) {
    React.useDebugValue(generatedClassName);
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

  // RSC mode: emit exactly this render's own classes (the leaf plus its
  // :where()-wrapped base chain) and the keyframes it references as an inline
  // <style> sibling, once per instance. No request-scoped dedup ledger: a
  // ledger keyed on React.cache is request-wide and outlives a Suspense
  // fallback's DOM, so a rule emitted only inside a fallback would be dropped
  // for the resolved child and then removed with the fallback, leaving it
  // unstyled (#5808). React exposes no per-boundary scope to key a safe ledger
  // on. Styles stay inline rather than hoisted via `precedence` so cross-
  // boundary extensions keep winning by source order (#5672) and the child-
  // index selector plugin stays correct; byte-identical duplicates cost about a
  // byte each after gzip.
  if (IS_RSC && generatedClassName) {
    // generateAndInjectStyles returns this render's whole chain of class names,
    // base to leaf, so it names exactly the rules this instance needs.
    const renderNames = generatedClassName.split(' ');

    let css = '';
    let walk: ComponentStyle | null | undefined = componentStyle;
    while (walk) {
      const groupNames = ssc.styleSheet.names.get(walk.componentId);
      if (groupNames) {
        // This render's names at this level (one per level in the common case).
        const levelNames: string[] = [];
        for (let i = 0; i < renderNames.length; i++) {
          if (groupNames.has(renderNames[i])) levelNames.push(renderNames[i]);
        }

        if (levelNames.length) {
          // Every name reaching the sheet in RSC was compiled into the cache by
          // generateAndInjectStyles before it registered, so the lookup hits.
          let levelCss = '';
          for (let i = 0; i < levelNames.length; i++) {
            levelCss += getCompiledCSSForName(walk, levelNames[i]) || '';
          }

          if (levelCss) {
            if (walk !== componentStyle) {
              levelCss = wrapBaseInWhere(levelCss, levelNames);
            }
            css = levelCss + css;
          }
        }
      }

      walk = walk.baseStyle;
    }

    let kfCss = '';
    if (css && ssc.styleSheet.keyframeIds.size > 0) {
      const kfTag = ssc.styleSheet.getTag();
      for (const kfId of ssc.styleSheet.keyframeIds) {
        const kfNames = ssc.styleSheet.names.get(kfId);
        if (!kfNames) continue;
        // Substring match: a name that happens to be a substring of another
        // token only over-emits one gzip-cheap keyframe block, and a genuinely
        // referenced name always appears verbatim, so a reference is never missed.
        let referenced = false;
        for (const kfName of kfNames) {
          if (css.indexOf(kfName) !== -1) {
            referenced = true;
            break;
          }
        }
        if (referenced) {
          const kfRules = kfTag.getGroup(getGroupForId(kfId));
          if (kfRules) kfCss += kfRules;
        }
      }
    }

    const combined = stripSplitter(kfCss + css);
    if (combined) {
      if (process.env.NODE_ENV !== 'production' && getEmitCounts) {
        const counts = getEmitCounts();
        const count = (counts.get(componentStyle.componentId) || 0) + 1;
        counts.set(componentStyle.componentId, count);
        if (count === RSC_REDUNDANT_EMIT_WARN_THRESHOLD) {
          const name = forwardedComponent.displayName || styledComponentId;
          console.warn(
            `Over ${count} instances of the styled component ${name} were rendered on one server-rendered page, so its styles repeat that many times in the HTML.\n` +
              "This is fine at normal sizes. To trim a very large list, move each item's changing values into a style object with the attrs method so every item shares one class.\n" +
              'Example:\n' +
              '  const Component = styled.div.attrs(props => ({\n' +
              '    style: {\n' +
              '      background: props.background,\n' +
              '    },\n' +
              '  }))`width: 100%;`\n\n' +
              '  <Component />\n' +
              'If every item looks the same, style them from a parent element and render plain children instead.'
          );
        }
      }

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
