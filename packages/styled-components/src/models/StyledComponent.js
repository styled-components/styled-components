// @flow
import validAttr from '@emotion/is-prop-valid';
import hoist from 'hoist-non-react-statics';
import React, { createElement, type Ref, useContext, useDebugValue } from 'react';
import { SC_VERSION } from '../constants';
import type {
  Attrs,
  IStyledComponent,
  IStyledStatics,
  RuleSet,
  ShouldForwardProp,
  Target,
} from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import generateDisplayName from '../utils/generateDisplayName';
import getComponentName from '../utils/getComponentName';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import isTag from '../utils/isTag';
import joinStrings from '../utils/joinStrings';
import merge from '../utils/mixinDeep';
import ComponentStyle from './ComponentStyle';
import { useStyleSheet, useStylis } from './StyleSheetManager';
import { ThemeContext } from './ThemeProvider';

const identifiers = {};

/* We depend on components having unique IDs */
function generateId(displayName?: string, parentComponentId?: string) {
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

function useResolvedAttrs<Config>(theme: any = EMPTY_OBJECT, props: Config, attrs: Attrs) {
  // NOTE: can't memoize this
  // returns [context, resolvedAttrs]
  // where resolvedAttrs is only the things injected by the attrs themselves
  const context = { ...props, theme };
  const resolvedAttrs = {};

  attrs.forEach(attrDef => {
    let resolvedAttrDef = attrDef;
    let key;

    if (isFunction(resolvedAttrDef)) {
      resolvedAttrDef = resolvedAttrDef(context);
    }

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
  warnTooManyClasses?: $Call<typeof createWarnTooManyClasses, string, string>
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
  props: Object,
  forwardedRef: Ref<any>,
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

  const elementToBeCreated: Target = attrs.$as || props.$as || attrs.as || props.as || target;

  const isTargetTag = isTag(elementToBeCreated);
  const computedProps = attrs !== props ? { ...props, ...attrs } : props;
  const propsForElement = {};

  // eslint-disable-next-line guard-for-in
  for (const key in computedProps) {
    if (key[0] === '$' || key === 'as') continue;
    else if (key === 'forwardedAs') {
      propsForElement.as = computedProps[key];
    } else if (
      shouldForwardProp
        ? shouldForwardProp(key, validAttr, elementToBeCreated)
        : isTargetTag
        ? validAttr(key)
        : true
    ) {
      // Don't pass through non HTML tags through to HTML elements
      propsForElement[key] = computedProps[key];
    }
  }

  if (props.style && attrs.style !== props.style) {
    propsForElement.style = { ...props.style, ...attrs.style };
  }

  propsForElement.className = Array.prototype
    .concat(
      foldedComponentIds,
      styledComponentId,
      generatedClassName !== styledComponentId ? generatedClassName : null,
      props.className,
      attrs.className
    )
    .filter(Boolean)
    .join(' ');

  propsForElement.ref = refToForward;

  return createElement(elementToBeCreated, propsForElement);
}

export default function createStyledComponent(
  target: $PropertyType<IStyledComponent, 'target'>,
  options: {
    attrs?: Attrs,
    componentId: string,
    displayName?: string,
    parentComponentId?: string,
    shouldForwardProp?: ShouldForwardProp,
  },
  rules: RuleSet
) {
  const isTargetStyledComp = isStyledComponent(target);
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
    isTargetStyledComp && ((target: any): IStyledComponent).attrs
      ? Array.prototype.concat(((target: any): IStyledComponent).attrs, attrs).filter(Boolean)
      : attrs;

  // eslint-disable-next-line prefer-destructuring
  let shouldForwardProp = options.shouldForwardProp;

  if (isTargetStyledComp && target.shouldForwardProp) {
    if (options.shouldForwardProp) {
      // compose nested shouldForwardProp calls
      shouldForwardProp = (prop, filterFn, elementToBeCreated) =>
        ((((target: any): IStyledComponent).shouldForwardProp: any): ShouldForwardProp)(
          prop,
          filterFn,
          elementToBeCreated
        ) &&
        ((options.shouldForwardProp: any): ShouldForwardProp)(prop, filterFn, elementToBeCreated);
    } else {
      // eslint-disable-next-line prefer-destructuring
      shouldForwardProp = ((target: any): IStyledComponent).shouldForwardProp;
    }
  }

  const componentStyle = new ComponentStyle(
    rules,
    styledComponentId,
    isTargetStyledComp ? ((target: Object).componentStyle: ComponentStyle) : undefined
  );

  // statically styled-components don't need to build an execution context object,
  // and shouldn't be increasing the number of class names
  const isStatic = componentStyle.isStatic && attrs.length === 0;

  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */
  let WrappedStyledComponent: IStyledComponent;

  const forwardRef = (props, ref) =>
    // eslint-disable-next-line
    useStyledComponentImpl(WrappedStyledComponent, props, ref, isStatic);

  forwardRef.displayName = displayName;

  WrappedStyledComponent = ((React.forwardRef(forwardRef): any): IStyledComponent);
  WrappedStyledComponent.attrs = finalAttrs;
  WrappedStyledComponent.componentStyle = componentStyle;
  WrappedStyledComponent.displayName = displayName;
  WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

  // this static is used to preserve the cascade of static classes for component selector
  // purposes; this is especially important with usage of the css prop
  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp
    ? Array.prototype.concat(
        ((target: any): IStyledComponent).foldedComponentIds,
        ((target: any): IStyledComponent).styledComponentId
      )
    : EMPTY_ARRAY;

  WrappedStyledComponent.styledComponentId = styledComponentId;

  // fold the underlying StyledComponent target up since we folded the styles
  WrappedStyledComponent.target = isTargetStyledComp
    ? ((target: any): IStyledComponent).target
    : target;

  WrappedStyledComponent.withComponent = function withComponent(tag: Target) {
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
        ? merge({}, ((target: any): IStyledComponent).defaultProps, obj)
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
    hoist<
      IStyledStatics,
      $PropertyType<IStyledComponent, 'target'>,
      { [key: $Keys<IStyledStatics>]: true }
    >(WrappedStyledComponent, ((target: any): $PropertyType<IStyledComponent, 'target'>), {
      // all SC-specific things should not be hoisted
      attrs: true,
      componentStyle: true,
      displayName: true,
      foldedComponentIds: true,
      shouldForwardProp: true,
      styledComponentId: true,
      target: true,
      withComponent: true,
    });
  }

  return WrappedStyledComponent;
}
