// @flow
import validAttr from '@emotion/is-prop-valid';
import React, { createElement, useRef, useContext } from 'react';
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
import StyleSheet from './StyleSheet';
import { ThemeContext } from './ThemeProvider';
import { StyleSheetContext } from './StyleSheetManager';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import classNameUsageCheckInjector from '../utils/classNameUsageCheckInjector';

import type { Attrs, RuleSet, Target } from '../types';
import { IS_BROWSER } from '../constants';

const identifiers = {};

/* We depend on components having unique IDs */
function generateId(_ComponentStyle: Function, _displayName: string, parentComponentId: string) {
  const displayName = typeof _displayName !== 'string' ? 'sc' : escape(_displayName);

  /**
   * This ensures uniqueness if two components happen to share
   * the same displayName.
   */
  const nr = (identifiers[displayName] || 0) + 1;
  identifiers[displayName] = nr;

  const componentId = `${displayName}-${_ComponentStyle.generateName(displayName + nr)}`;

  return parentComponentId ? `${parentComponentId}-${componentId}` : componentId;
}

// TODO: Right now these warnings will only fire once in the whole app. Previously
// these fired once per component.
const warnInnerRef = once(displayName =>
  // eslint-disable-next-line no-console
  console.warn(
    `The "innerRef" API has been removed in styled-components v4 in favor of React 16 ref forwarding, use "ref" instead like a typical component. "innerRef" was detected on component "${displayName}".`
  )
);

const warnAttrsFnObjectKeyDeprecated = once(
  (key, displayName): void =>
    // eslint-disable-next-line no-console
    console.warn(
      `Functions as object-form attrs({}) keys are now deprecated and will be removed in a future version of styled-components. Switch to the new attrs(props => ({})) syntax instead for easier and more powerful composition. The attrs key in question is "${key}" on component "${displayName}".`
    )
);

const warnNonStyledComponentAttrsObjectKey = once(
  (key, displayName): void =>
    // eslint-disable-next-line no-console
    console.warn(
      `It looks like you've used a non styled-component as the value for the "${key}" prop in an object-form attrs constructor of "${displayName}".\n` +
        'You should use the new function-form attrs constructor which avoids this issue: attrs(props => ({ yourStuff }))\n' +
        "To continue using the deprecated object syntax, you'll need to wrap your component prop in a function to make it available inside the styled component (you'll still get the deprecation warning though.)\n" +
        `For example, { ${key}: () => InnerComponent } instead of { ${key}: InnerComponent }`
    )
);

function buildExecutionContext(theme: ?Object, props: Object, attrs: Attrs, styledAttrs) {
  const context = { ...props, theme };

  if (!attrs.length) return context;

  styledAttrs.current = {};

  attrs.forEach(attrDef => {
    let resolvedAttrDef = attrDef;
    let attrDefWasFn = false;
    let attr;
    let key;

    if (isFunction(resolvedAttrDef)) {
      // $FlowFixMe
      resolvedAttrDef = resolvedAttrDef(context);
      attrDefWasFn = true;
    }

    /* eslint-disable guard-for-in */
    // $FlowFixMe
    for (key in resolvedAttrDef) {
      attr = resolvedAttrDef[key];

      if (!attrDefWasFn) {
        if (isFunction(attr) && !isDerivedReactComponent(attr) && !isStyledComponent(attr)) {
          if (process.env.NODE_ENV !== 'production') {
            warnAttrsFnObjectKeyDeprecated(key, props.forwardedComponent.displayName);
          }

          attr = attr(context);

          if (process.env.NODE_ENV !== 'production' && React.isValidElement(attr)) {
            warnNonStyledComponentAttrsObjectKey(key, props.forwardedComponent.displayName);
          }
        }
      }

      styledAttrs.current[key] = attr;
      context[key] = attr;
    }
    /* eslint-enable */
  });

  return context;
}

function generateAndInjectStyles(theme: any, props: any, styleSheet: StyleSheet, styledAttrs) {
  const { attrs, componentStyle, warnTooManyClasses } = props.forwardedComponent;

  // statically styled-components don't need to build an execution context object,
  // and shouldn't be increasing the number of class names
  if (componentStyle.isStatic && !attrs.length) {
    return componentStyle.generateAndInjectStyles(EMPTY_OBJECT, styleSheet);
  }

  const className = componentStyle.generateAndInjectStyles(
    buildExecutionContext(theme, props, attrs, styledAttrs),
    styleSheet
  );

  if (process.env.NODE_ENV !== 'production' && warnTooManyClasses) warnTooManyClasses(className);

  return className;
}

function StyledComponent(props) {
  const attrs = useRef({});
  const styleSheet = useContext(StyleSheetContext) || StyleSheet.master;
  const theme = useContext(ThemeContext);

  // @TODO: maybe convert this into a hook?
  // if (process.env.NODE_ENV !== 'production' && IS_BROWSER) {
  //   classNameUsageCheckInjector(this);
  // }

  const {
    componentStyle,
    defaultProps,
    displayName,
    foldedComponentIds,
    styledComponentId,
    target,
  } = props.forwardedComponent;

  let generatedClassName;
  if (componentStyle.isStatic) {
    generatedClassName = generateAndInjectStyles(EMPTY_OBJECT, props, styleSheet, attrs);
  } else if (theme !== undefined) {
    generatedClassName = generateAndInjectStyles(
      determineTheme(props, theme, defaultProps),
      props,
      styleSheet,
      attrs
    );
  } else {
    generatedClassName = generateAndInjectStyles(
      props.theme || EMPTY_OBJECT,
      props,
      styleSheet,
      attrs
    );
  }

  const elementToBeCreated = props.as || attrs.current.as || target;
  const isTargetTag = isTag(elementToBeCreated);

  const propsForElement = {};
  const computedProps = { ...attrs.current, ...props };

  let key;
  // eslint-disable-next-line guard-for-in
  for (key in computedProps) {
    if (process.env.NODE_ENV !== 'production' && key === 'innerRef' && isTargetTag) {
      warnInnerRef(displayName);
    }

    if (key === 'forwardedComponent' || key === 'as') continue;
    else if (key === 'forwardedRef') propsForElement.ref = computedProps[key];
    else if (!isTargetTag || validAttr(key)) {
      // Don't pass through non HTML tags through to HTML elements
      propsForElement[key] = computedProps[key];
    }
  }

  if (props.style && attrs.current.style) {
    propsForElement.style = { ...attrs.current.style, ...props.style };
  }

  propsForElement.className = Array.prototype
    .concat(
      foldedComponentIds,
      props.className,
      styledComponentId,
      attrs.current.className,
      generatedClassName
    )
    .filter(Boolean)
    .join(' ');

  return createElement(elementToBeCreated, propsForElement);
}

export default function createStyledComponent(target: Target, options: Object, rules: RuleSet) {
  const isTargetStyledComp = isStyledComponent(target);
  const isClass = !isTag(target);

  const {
    displayName = generateDisplayName(target),
    componentId = generateId(ComponentStyle, options.displayName, options.parentComponentId),
    ParentComponent = StyledComponent,
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
  const WrappedStyledComponent = React.forwardRef((props, ref) => (
    <ParentComponent {...props} forwardedComponent={WrappedStyledComponent} forwardedRef={ref} />
  ));

  // $FlowFixMe
  WrappedStyledComponent.attrs = finalAttrs;
  // $FlowFixMe
  WrappedStyledComponent.componentStyle = componentStyle;
  WrappedStyledComponent.displayName = displayName;

  // $FlowFixMe
  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp
    ? // $FlowFixMe
      Array.prototype.concat(target.foldedComponentIds, target.styledComponentId)
    : EMPTY_ARRAY;

  // $FlowFixMe
  WrappedStyledComponent.styledComponentId = styledComponentId;

  // fold the underlying StyledComponent target up since we folded the styles
  // $FlowFixMe
  WrappedStyledComponent.target = isTargetStyledComp ? target.target : target;

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
      ParentComponent,
    };

    return createStyledComponent(tag, newOptions, rules);
  };

  if (process.env.NODE_ENV !== 'production') {
    // $FlowFixMe
    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(displayName);
  }

  // $FlowFixMe
  WrappedStyledComponent.toString = () => `.${WrappedStyledComponent.styledComponentId}`;

  if (isClass) {
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
