// @flow
import validAttr from '@emotion/is-prop-valid';
import React, {
  createElement,
  useContext,
  useState,
  useDebugValue,
  type AbstractComponent,
  type Ref,
} from 'react';
import ComponentStyle from './ComponentStyle';
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses';
import determineTheme from '../utils/determineTheme';
import escape from '../utils/escape';
import generateDisplayName from '../utils/generateDisplayName';
import getComponentName from '../utils/getComponentName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isTag from '../utils/isTag';
import isDerivedReactComponent from '../utils/isDerivedReactComponent';
import isStyledComponent from '../utils/isStyledComponent';
import once from '../utils/once';
import hasher from '../utils/hasher';
import { ThemeContext } from './ThemeProvider';
import { useStyleSheet } from './StyleSheetManager';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';

import type { Attrs, RuleSet, Target } from '../types';

/* global $Call */

const identifiers = {};

/* We depend on components having unique IDs */
function generateId(displayName: string, parentComponentId: string) {
  const name = typeof displayName !== 'string' ? 'sc' : escape(displayName);
  // Ensure that no displayName can lead to duplicate componentIds
  const nr = (identifiers[name] || 0) + 1;
  identifiers[name] = nr;
  const componentId = `${name}-${hasher(name + nr)}`;
  return parentComponentId ? `${parentComponentId}-${componentId}` : componentId;
}

function useResolvedAttrs<Config>(theme: any = EMPTY_OBJECT, props: Config, attrs: Attrs, utils) {
  // NOTE: can't memoize this
  // returns [context, resolvedAttrs]
  // where resolvedAttrs is only the things injected by the attrs themselves
  const context = { ...props, theme };
  const resolvedAttrs = {};
  attrs.forEach(attrDef => {
    let resolvedAttrDef = attrDef;
    let attrDefWasFn = false;
    let attr;
    let key;

    if (isFunction(resolvedAttrDef)) {
      resolvedAttrDef = resolvedAttrDef(context);
      attrDefWasFn = true;
    }

    /* eslint-disable guard-for-in */
    for (key in resolvedAttrDef) {
      attr = resolvedAttrDef[key];

      if (!attrDefWasFn) {
        if (isFunction(attr) && !isDerivedReactComponent(attr) && !isStyledComponent(attr)) {
          if (process.env.NODE_ENV !== 'production') {
            utils.warnAttrsFnObjectKeyDeprecated(key);
          }

          attr = attr(context);

          if (process.env.NODE_ENV !== 'production' && React.isValidElement(attr)) {
            utils.warnNonStyledComponentAttrsObjectKey(key);
          }
        }
      }

      resolvedAttrs[key] = attr;
      context[key] = attr;
    }
    /* eslint-enable */
  });

  return [context, resolvedAttrs];
}

interface StyledComponentWrapperProperties {
  attrs: Attrs;
  componentStyle: ComponentStyle;
  foldedComponentIds: Array<string>;
  target: Target;
  styledComponentId: string;
  warnTooManyClasses: $Call<typeof createWarnTooManyClasses, string>;
}

type StyledComponentWrapper<Config, Instance> = AbstractComponent<Config, Instance> &
  StyledComponentWrapperProperties;

function useInjectedStyle<T>(
  componentStyle: ComponentStyle,
  hasAttrs: boolean,
  resolvedAttrs: T,
  utils,
  warnTooManyClasses: $Call<typeof createWarnTooManyClasses, string>
) {
  const styleSheet = useStyleSheet();

  // statically styled-components don't need to build an execution context object,
  // and shouldn't be increasing the number of class names
  const isStatic = componentStyle.isStatic && !hasAttrs;

  const className = isStatic
    ? componentStyle.generateAndInjectStyles(EMPTY_OBJECT, styleSheet)
    : componentStyle.generateAndInjectStyles(resolvedAttrs, styleSheet);

  if (process.env.NODE_ENV !== 'production' && !isStatic && warnTooManyClasses) {
    warnTooManyClasses(className);
  }

  useDebugValue(className);

  return className;
}

// TODO: convert these all to individual hooks, if possible
function developmentDeprecationWarningsFactory(displayNameArg: ?string) {
  const displayName = displayNameArg || 'Unknown';
  return {
    warnInnerRef: once(() =>
      // eslint-disable-next-line no-console
      console.warn(
        `The "innerRef" API has been removed in styled-components v4 in favor of React 16 ref forwarding, use "ref" instead like a typical component. "innerRef" was detected on component "${displayName}".`
      )
    ),
    warnAttrsFnObjectKeyDeprecated: once(
      (key: string): void =>
        // eslint-disable-next-line no-console
        console.warn(
          `Functions as object-form attrs({}) keys are now deprecated and will be removed in a future version of styled-components. Switch to the new attrs(props => ({})) syntax instead for easier and more powerful composition. The attrs key in question is "${key}" on component "${displayName}".`
        )
    ),
    warnNonStyledComponentAttrsObjectKey: once(
      (key: string): void =>
        // eslint-disable-next-line no-console
        console.warn(
          `It looks like you've used a non styled-component as the value for the "${key}" prop in an object-form attrs constructor of "${displayName}".\n` +
            'You should use the new function-form attrs constructor which avoids this issue: attrs(props => ({ yourStuff }))\n' +
            "To continue using the deprecated object syntax, you'll need to wrap your component prop in a function to make it available inside the styled component (you'll still get the deprecation warning though.)\n" +
            `For example, { ${key}: () => InnerComponent } instead of { ${key}: InnerComponent }`
        )
    ),
  };
}

function useDevelopmentDeprecationWarnings(
  displayName: ?string
): $Call<typeof developmentDeprecationWarningsFactory, string> {
  return useState(() => developmentDeprecationWarningsFactory(displayName))[0];
}

const useDeprecationWarnings =
  process.env.NODE_ENV !== 'production'
    ? useDevelopmentDeprecationWarnings
    : // NOTE: return value must only be accessed in non-production, of course
      // $FlowFixMe
      (() => {}: typeof useDevelopmentDeprecationWarnings);

function useStyledComponentImpl<Config: {}, Instance>(
  forwardedComponent: StyledComponentWrapper<Config, Instance>,
  props: Object,
  forwardedRef: Ref<any>
) {
  const {
    attrs: componentAttrs,
    componentStyle,
    // $FlowFixMe
    defaultProps,
    displayName,
    foldedComponentIds,
    styledComponentId,
    target,
  } = forwardedComponent;

  // NOTE: the non-hooks version only subscribes to this when !componentStyle.isStatic,
  // but that'd be against the rules-of-hooks. We could be naughty and do it anyway as it
  // should be an immutable value, but behave for now.
  const theme =
    determineTheme((props: any), useContext(ThemeContext), defaultProps) || EMPTY_OBJECT;

  const utils = useDeprecationWarnings(displayName);
  const [context, attrs] = useResolvedAttrs(theme, props, componentAttrs, utils);

  const generatedClassName = useInjectedStyle(
    componentStyle,
    componentAttrs.length > 0,
    context,
    utils,
    process.env.NODE_ENV !== 'production' ? forwardedComponent.warnTooManyClasses : (undefined: any)
  );

  const refToForward = forwardedRef;

  const elementToBeCreated: Target =
    props.as || // eslint-disable-line react/prop-types
    attrs.as ||
    target;

  const isTargetTag = isTag(elementToBeCreated);
  const computedProps = attrs !== props ? { ...attrs, ...props } : props;
  const shouldFilterProps = 'as' in computedProps || isTargetTag;
  const propsForElement = shouldFilterProps ? {} : { ...computedProps };

  if (process.env.NODE_ENV !== 'production' && 'innerRef' in computedProps && isTargetTag) {
    utils.warnInnerRef();
  }

  if (shouldFilterProps) {
    // eslint-disable-next-line guard-for-in
    for (const key in computedProps) {
      if (key !== 'as' && (!isTargetTag || validAttr(key))) {
        // Don't pass through non HTML tags through to HTML elements
        propsForElement[key] = computedProps[key];
      }
    }
  }

  if (
    props.style && // eslint-disable-line react/prop-types
    attrs.style !== props.style // eslint-disable-line react/prop-types
  ) {
    propsForElement.style = { ...attrs.style, ...props.style }; // eslint-disable-line react/prop-types
  }

  propsForElement.className = Array.prototype
    .concat(
      foldedComponentIds,
      props.className, // eslint-disable-line react/prop-types
      styledComponentId,
      attrs.className,
      generatedClassName !== styledComponentId ? generatedClassName : null
    )
    .filter(Boolean)
    .join(' ');

  propsForElement.ref = refToForward;

  useDebugValue(styledComponentId);

  return createElement(elementToBeCreated, propsForElement);
}

export default function createStyledComponent(
  target: Target | StyledComponentWrapper<*, *>,
  options: Object,
  rules: RuleSet
) {
  const isTargetStyledComp = isStyledComponent(target);
  const isCompositeComponent = !isTag(target);

  const {
    displayName = generateDisplayName(target),
    componentId = generateId(options.displayName, options.parentComponentId),
    attrs = EMPTY_ARRAY,
  } = options;

  const styledComponentId =
    options.displayName && options.componentId
      ? `${escape(options.displayName)}-${options.componentId}`
      : options.componentId || componentId;

  // fold the underlying StyledComponent attrs up (implicit extend)
  const finalAttrs =
    // $FlowFixMe
    isTargetStyledComp && target.attrs
      ? Array.prototype.concat(target.attrs, attrs).filter(Boolean)
      : attrs;

  const componentStyle = new ComponentStyle(
    isTargetStyledComp
      ? // fold the underlying StyledComponent rules up (implicit extend)
        // $FlowFixMe
        target.componentStyle.rules.concat(rules)
      : rules,
    finalAttrs,
    styledComponentId
  );

  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */
  let WrappedStyledComponent;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const forwardRef = (props, ref) => useStyledComponentImpl(WrappedStyledComponent, props, ref);

  forwardRef.displayName = displayName;

  // $FlowFixMe this is a forced cast to merge it StyledComponentWrapperProperties
  WrappedStyledComponent = (React.forwardRef(forwardRef): StyledComponentWrapper<*, *>);

  WrappedStyledComponent.attrs = finalAttrs;
  WrappedStyledComponent.componentStyle = componentStyle;
  WrappedStyledComponent.displayName = displayName;

  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp
    ? // $FlowFixMe
      Array.prototype.concat(target.foldedComponentIds, target.styledComponentId)
    : EMPTY_ARRAY;

  WrappedStyledComponent.styledComponentId = styledComponentId;

  // fold the underlying StyledComponent target up since we folded the styles
  WrappedStyledComponent.target = isTargetStyledComp
    ? // $FlowFixMe
      target.target
    : target;

  // $FlowFixMe
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

  if (process.env.NODE_ENV !== 'production') {
    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(displayName);
  }

  // $FlowFixMe
  WrappedStyledComponent.toString = () => `.${WrappedStyledComponent.styledComponentId}`;

  if (isCompositeComponent) {
    hoist(WrappedStyledComponent, target, {
      // all SC-specific things should not be hoisted
      attrs: true,
      componentStyle: true,
      displayName: true,
      foldedComponentIds: true,
      styledComponentId: true,
      target: true,
      withComponent: true,
    });
  }

  return WrappedStyledComponent;
}
