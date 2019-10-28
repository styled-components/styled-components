// @flow
import validAttr from '@emotion/is-prop-valid';
import merge from 'merge-anything';
import React, { createElement, Component } from 'react';
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
import { ThemeConsumer, type Theme } from './ThemeProvider';
import { StyleSheetConsumer } from './StyleSheetManager';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';

import type { Attrs, RuleSet, Target } from '../types';

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

// $FlowFixMe
class StyledComponent extends Component<*> {
  renderOuter: Function;

  renderInner: Function;

  styleSheet: ?StyleSheet;

  warnInnerRef: Function;

  warnAttrsFnObjectKeyDeprecated: Function;

  warnNonStyledComponentAttrsObjectKey: Function;

  attrs = {};

  constructor() {
    super();
    this.renderOuter = this.renderOuter.bind(this);
    this.renderInner = this.renderInner.bind(this);

    if (process.env.NODE_ENV !== 'production') {
      this.warnInnerRef = once(displayName =>
        // eslint-disable-next-line no-console
        console.warn(
          `The "innerRef" API has been removed in styled-components v4 in favor of React 16 ref forwarding, use "ref" instead like a typical component. "innerRef" was detected on component "${displayName}".`
        )
      );

      this.warnAttrsFnObjectKeyDeprecated = once(
        (key, displayName): void =>
          // eslint-disable-next-line no-console
          console.warn(
            `Functions as object-form attrs({}) keys are now deprecated and will be removed in a future version of styled-components. Switch to the new attrs(props => ({})) syntax instead for easier and more powerful composition. The attrs key in question is "${key}" on component "${displayName}".`,
            `\n ${new Error().stack}`
          )
      );

      this.warnNonStyledComponentAttrsObjectKey = once(
        (key, displayName): void =>
          // eslint-disable-next-line no-console
          console.warn(
            `It looks like you've used a non styled-component as the value for the "${key}" prop in an object-form attrs constructor of "${displayName}".\n` +
              'You should use the new function-form attrs constructor which avoids this issue: attrs(props => ({ yourStuff }))\n' +
              "To continue using the deprecated object syntax, you'll need to wrap your component prop in a function to make it available inside the styled component (you'll still get the deprecation warning though.)\n" +
              `For example, { ${key}: () => InnerComponent } instead of { ${key}: InnerComponent }`
          )
      );
    }
  }

  render() {
    return <StyleSheetConsumer>{this.renderOuter}</StyleSheetConsumer>;
  }

  renderOuter(styleSheet?: StyleSheet = StyleSheet.master) {
    this.styleSheet = styleSheet;

    // No need to subscribe a static component to theme changes, it won't change anything
    if (this.props.forwardedComponent.componentStyle.isStatic) return this.renderInner();

    return <ThemeConsumer>{this.renderInner}</ThemeConsumer>;
  }

  renderInner(theme?: Theme) {
    const {
      componentStyle,
      defaultProps,
      displayName,
      foldedComponentIds,
      styledComponentId,
      target,
    } = this.props.forwardedComponent;

    let generatedClassName;
    if (componentStyle.isStatic) {
      generatedClassName = this.generateAndInjectStyles(EMPTY_OBJECT, this.props);
    } else {
      generatedClassName = this.generateAndInjectStyles(
        determineTheme(this.props, theme, defaultProps) || EMPTY_OBJECT,
        this.props
      );
    }

    const elementToBeCreated = this.props.as || this.attrs.as || target;
    const isTargetTag = isTag(elementToBeCreated);

    const propsForElement = {};
    const computedProps = { ...this.props, ...this.attrs };

    let key;
    // eslint-disable-next-line guard-for-in
    for (key in computedProps) {
      if (process.env.NODE_ENV !== 'production' && key === 'innerRef' && isTargetTag) {
        this.warnInnerRef(displayName);
      }

      if (key === 'forwardedComponent' || key === 'as') {
        continue;
      } else if (key === 'forwardedRef') propsForElement.ref = computedProps[key];
      else if (key === 'forwardedAs') propsForElement.as = computedProps[key];
      else if (!isTargetTag || validAttr(key)) {
        // Don't pass through non HTML tags through to HTML elements
        propsForElement[key] = computedProps[key];
      }
    }

    if (this.props.style && this.attrs.style) {
      propsForElement.style = { ...this.attrs.style, ...this.props.style };
    }

    propsForElement.className = Array.prototype
      .concat(
        foldedComponentIds,
        styledComponentId,
        generatedClassName !== styledComponentId ? generatedClassName : null,
        this.props.className,
        this.attrs.className
      )
      .filter(Boolean)
      .join(' ');

    return createElement(elementToBeCreated, propsForElement);
  }

  buildExecutionContext(theme: ?Object, props: Object, attrs: Attrs) {
    const context = { ...props, theme };

    if (!attrs.length) return context;

    this.attrs = {};

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
              this.warnAttrsFnObjectKeyDeprecated(key, props.forwardedComponent.displayName);
            }

            attr = attr(context);

            if (process.env.NODE_ENV !== 'production' && React.isValidElement(attr)) {
              this.warnNonStyledComponentAttrsObjectKey(key, props.forwardedComponent.displayName);
            }
          }
        }

        this.attrs[key] = attr;
        context[key] = attr;
      }
      /* eslint-enable */
    });

    return context;
  }

  generateAndInjectStyles(theme: any, props: any) {
    const { attrs, componentStyle, warnTooManyClasses } = props.forwardedComponent;

    // statically styled-components don't need to build an execution context object,
    // and shouldn't be increasing the number of class names
    if (componentStyle.isStatic && !attrs.length) {
      return componentStyle.generateAndInjectStyles(EMPTY_OBJECT, this.styleSheet);
    }

    const className = componentStyle.generateAndInjectStyles(
      this.buildExecutionContext(theme, props, attrs),
      this.styleSheet
    );

    if (process.env.NODE_ENV !== 'production' && warnTooManyClasses) warnTooManyClasses(className);

    return className;
  }
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
  let WrappedStyledComponent;
  const forwardRef = (props, ref) => (
    <ParentComponent {...props} forwardedComponent={WrappedStyledComponent} forwardedRef={ref} />
  );
  forwardRef.displayName = displayName;
  WrappedStyledComponent = React.forwardRef(forwardRef);
  WrappedStyledComponent.displayName = displayName;

  // $FlowFixMe
  WrappedStyledComponent.attrs = finalAttrs;
  // $FlowFixMe
  WrappedStyledComponent.componentStyle = componentStyle;

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

  // $FlowFixMe
  Object.defineProperty(WrappedStyledComponent, 'defaultProps', {
    get() {
      return this._foldedDefaultProps;
    },

    set(obj) {
      // $FlowFixMe
      this._foldedDefaultProps = isTargetStyledComp ? merge(target.defaultProps, obj) : obj;
    },
  });

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
