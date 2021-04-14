import validAttr from '@emotion/is-prop-valid';
import hoist from 'hoist-non-react-statics';
import React, { createElement, Ref, useContext, useDebugValue } from 'react';
import { SC_VERSION } from '../constants';
import type {
  Attrs,
  ExtensibleObject,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledStatics,
  WebTarget,
} from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses';
import determineTheme from '../utils/determineTheme';
import domElements from '../utils/domElements';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import generateDisplayName from '../utils/generateDisplayName';
import getComponentName from '../utils/getComponentName';
import isStyledComponent from '../utils/isStyledComponent';
import isTag from '../utils/isTag';
import joinStrings from '../utils/joinStrings';
import merge from '../utils/mixinDeep';
import ComponentStyle from './ComponentStyle';
import { useStyleSheet, useStylis } from './StyleSheetManager';
import { Theme, ThemeContext } from './ThemeProvider';

const identifiers: { [key: string]: number } = {};

/* We depend on components having unique IDs */
function generateId(displayName?: string, parentComponentId?: string): string {
  const name = typeof displayName !== 'string' ? 'sc' : escape(displayName);
  // Ensure that no displayName can lead to duplicate componentIds
  identifiers[name] = (identifiers[name] || 0) + 1;

  const componentId = `${name}-${generateComponentId(
    // SC_VERSION gives us isolation between multiple runtimes on the page at once
    // this is improved further with use of the babel plugin "namespace" feature
    SC_VERSION + name + identifiers[name]
  )}`;

  return parentComponentId ? `${parentComponentId}-${componentId}` : componentId;
}

function useResolvedAttrs(theme: Theme = EMPTY_OBJECT, props: ExtensibleObject, attrs: Attrs[]) {
  // NOTE: can't memoize this
  // returns [context, resolvedAttrs]
  // where resolvedAttrs is only the things injected by the attrs themselves
  const context: ExtensibleObject & { theme: Theme } = { ...props, theme };
  const resolvedAttrs: ExtensibleObject = {};

  attrs.forEach(attrDef => {
    const resolvedAttrDef = typeof attrDef === 'function' ? attrDef(context) : attrDef;
    let key;

    /* eslint-disable guard-for-in */
    for (key in resolvedAttrDef) {
      context[key] = resolvedAttrs[key] =
        key === 'className'
          ? joinStrings(resolvedAttrs[key], resolvedAttrDef[key])
          : resolvedAttrDef[key];
    }
    /* eslint-enable guard-for-in */
  });

  return [context, resolvedAttrs];
}

function useInjectedStyle<T>(
  componentStyle: ComponentStyle,
  isStatic: boolean,
  resolvedAttrs: T,
  warnTooManyClasses?: ReturnType<typeof createWarnTooManyClasses>
) {
  const styleSheet = useStyleSheet();
  const stylis = useStylis();

  const className = isStatic
    ? componentStyle.generateAndInjectStyles(EMPTY_OBJECT, styleSheet, stylis)
    : componentStyle.generateAndInjectStyles(resolvedAttrs, styleSheet, stylis);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (process.env.NODE_ENV !== 'production') useDebugValue(className);

  if (process.env.NODE_ENV !== 'production' && !isStatic && warnTooManyClasses) {
    warnTooManyClasses(className);
  }

  return className;
}

function useStyledComponentImpl(
  forwardedComponent: IStyledComponent,
  props: ExtensibleObject,
  forwardedRef: Ref<Element>,
  isStatic: boolean
) {
  const {
    attrs: componentAttrs,
    componentStyle,
    defaultProps,
    foldedComponentIds,
    shouldForwardProp,
    styledComponentId,
    target,
  } = forwardedComponent;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (process.env.NODE_ENV !== 'production') useDebugValue(styledComponentId);

  // NOTE: the non-hooks version only subscribes to this when !componentStyle.isStatic,
  // but that'd be against the rules-of-hooks. We could be naughty and do it anyway as it
  // should be an immutable value, but behave for now.
  const theme = determineTheme(props, useContext(ThemeContext), defaultProps);

  const [context, attrs] = useResolvedAttrs(theme || EMPTY_OBJECT, props, componentAttrs);

  const generatedClassName = useInjectedStyle(
    componentStyle,
    isStatic,
    context,
    process.env.NODE_ENV !== 'production' ? forwardedComponent.warnTooManyClasses : undefined
  );

  const refToForward = forwardedRef;

  const elementToBeCreated: WebTarget = attrs.$as || props.$as || attrs.as || props.as || target;

  const isTargetTag = isTag(elementToBeCreated);
  const computedProps: ExtensibleObject = attrs !== props ? { ...props, ...attrs } : props;
  const propsForElement: ExtensibleObject = {};

  // eslint-disable-next-line guard-for-in
  for (const key in computedProps) {
    if (key[0] === '$' || key === 'as') continue;
    else if (key === 'forwardedAs') {
      propsForElement.as = computedProps[key];
    } else if (
      shouldForwardProp ? shouldForwardProp(key, validAttr) : isTargetTag ? validAttr(key) : true
    ) {
      // Don't pass through non HTML tags through to HTML elements
      propsForElement[key] = computedProps[key];
    }
  }

  if (props.style && attrs.style !== props.style) {
    propsForElement.style = { ...props.style, ...attrs.style };
  }

  propsForElement[
    // handle custom elements which React doesn't properly alias
    isTargetTag &&
    domElements.indexOf((elementToBeCreated as unknown) as Extract<typeof domElements, string>) ===
      -1
      ? 'class'
      : 'className'
  ] = (foldedComponentIds as string[])
    .concat(
      styledComponentId,
      (generatedClassName !== styledComponentId ? generatedClassName : null) as string,
      props.className,
      attrs.className
    )
    .filter(Boolean)
    .join(' ');

  propsForElement.ref = refToForward;

  return createElement(elementToBeCreated, propsForElement);
}

const createStyledComponent: IStyledComponentFactory = (target, options, rules) => {
  const isTargetStyledComp = isStyledComponent(target);
  const styledComponentTarget = target as IStyledComponent;
  const isCompositeComponent = !isTag(target);

  const {
    attrs = EMPTY_ARRAY,
    componentId = generateId(options.displayName, options.parentComponentId),
    displayName = generateDisplayName(target),
  } = options;

  const styledComponentId =
    options.displayName && options.componentId
      ? `${escape(options.displayName)}-${options.componentId}`
      : options.componentId || componentId;

  // fold the underlying StyledComponent attrs up (implicit extend)
  const finalAttrs =
    isTargetStyledComp && styledComponentTarget.attrs
      ? styledComponentTarget.attrs.concat((attrs as unknown) as Attrs[]).filter(Boolean)
      : (attrs as Attrs[]);

  let { shouldForwardProp } = options;

  if (isTargetStyledComp && styledComponentTarget.shouldForwardProp) {
    const shouldForwardPropFn = styledComponentTarget.shouldForwardProp;

    if (options.shouldForwardProp) {
      const passedShouldForwardPropFn = options.shouldForwardProp;

      // compose nested shouldForwardProp calls
      shouldForwardProp = (prop, filterFn) =>
        shouldForwardPropFn(prop, filterFn) && passedShouldForwardPropFn(prop, filterFn);
    } else {
      shouldForwardProp = shouldForwardPropFn;
    }
  }

  const componentStyle = new ComponentStyle(
    rules,
    styledComponentId,
    isTargetStyledComp ? (styledComponentTarget.componentStyle as ComponentStyle) : undefined
  );

  // statically styled-components don't need to build an execution context object,
  // and shouldn't be increasing the number of class names
  const isStatic = componentStyle.isStatic && attrs.length === 0;

  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */
  let WrappedStyledComponent: IStyledComponent;

  function forwardRef(props: ExtensibleObject, ref: Ref<Element>) {
    // eslint-disable-next-line
    return useStyledComponentImpl(WrappedStyledComponent, props, ref, isStatic);
  }

  forwardRef.displayName = displayName;

  WrappedStyledComponent = (React.forwardRef(forwardRef) as unknown) as IStyledComponent;
  WrappedStyledComponent.attrs = finalAttrs;
  WrappedStyledComponent.componentStyle = componentStyle;
  WrappedStyledComponent.displayName = displayName;
  WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

  // this static is used to preserve the cascade of static classes for component selector
  // purposes; this is especially important with usage of the css prop
  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp
    ? styledComponentTarget.foldedComponentIds.concat(styledComponentTarget.styledComponentId)
    : (EMPTY_ARRAY as string[]);

  WrappedStyledComponent.styledComponentId = styledComponentId;

  // fold the underlying StyledComponent target up since we folded the styles
  WrappedStyledComponent.target = isTargetStyledComp ? styledComponentTarget.target : target;

  WrappedStyledComponent.withComponent = function withComponent(tag: WebTarget) {
    const { componentId: previousComponentId, ...optionsToCopy } = options;

    const newComponentId =
      previousComponentId &&
      `${previousComponentId}-${isTag(tag) ? tag : escape(getComponentName(tag))}`;

    const newOptions = {
      ...optionsToCopy,
      attrs: finalAttrs,
      componentId: newComponentId,
    };

    return createStyledComponent(tag, newOptions, rules);
  };

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

  WrappedStyledComponent.toString = () => `.${WrappedStyledComponent.styledComponentId}`;

  if (isCompositeComponent) {
    const compositeComponentTarget = target as React.ComponentType<any>;

    hoist<IStyledComponent, typeof compositeComponentTarget>(
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
        withComponent: true,
      } as { [key in keyof IStyledStatics]: boolean }
    );
  }

  return WrappedStyledComponent;
};

export default createStyledComponent;
