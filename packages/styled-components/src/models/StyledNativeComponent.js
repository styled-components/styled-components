// @flow
import React, { createElement, Component } from 'react';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import generateDisplayName from '../utils/generateDisplayName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isTag from '../utils/isTag';
import isDerivedReactComponent from '../utils/isDerivedReactComponent';
import isStyledComponent from '../utils/isStyledComponent';
import once from '../utils/once';
import { ThemeConsumer } from './ThemeProvider';

import type { Theme } from './ThemeProvider';
import type { Attrs, RuleSet, Target } from '../types';

// $FlowFixMe
class StyledNativeComponent extends Component<*, *> {
  root: ?Object;

  warnInnerRef: Function;

  warnAttrsFnObjectKeyDeprecated: Function;

  warnNonStyledComponentAttrsObjectKey: Function;

  attrs = {};

  constructor(props) {
    super(props);

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
    return (
      <ThemeConsumer>
        {(theme?: Theme) => {
          const {
            as: renderAs,
            forwardedAs,
            forwardedComponent,
            forwardedRef,
            innerRef,
            style = [],
            ...props
          } = this.props;

          const { defaultProps, displayName, target } = forwardedComponent;

          const generatedStyles = this.generateAndInjectStyles(
            determineTheme(this.props, theme, defaultProps) || EMPTY_OBJECT,
            this.props
          );

          const propsForElement = {
            ...this.attrs,
            ...props,
            style: [generatedStyles].concat(style),
          };

          if (forwardedAs) propsForElement.as = forwardedAs;
          if (forwardedRef) propsForElement.ref = forwardedRef;

          if (process.env.NODE_ENV !== 'production' && innerRef) {
            this.warnInnerRef(displayName);
          }

          return createElement(renderAs || target, propsForElement);
        }}
      </ThemeConsumer>
    );
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
              this.warnAttrsFnObjectKeyDeprecated(key, this.props.forwardedComponent.displayName);
            }

            attr = attr(context);

            if (process.env.NODE_ENV !== 'production' && React.isValidElement(attr)) {
              this.warnNonStyledComponentAttrsObjectKey(
                key,
                this.props.forwardedComponent.displayName
              );
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
    const { inlineStyle } = props.forwardedComponent;

    const executionContext = this.buildExecutionContext(
      theme,
      props,
      props.forwardedComponent.attrs
    );

    return inlineStyle.generateStyleObject(executionContext);
  }

  setNativeProps(nativeProps: Object) {
    if (this.root !== undefined) {
      // $FlowFixMe
      this.root.setNativeProps(nativeProps);
    } else if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        'setNativeProps was called on a Styled Component wrapping a stateless functional component.'
      );
    }
  }
}

export default (InlineStyle: Function) => {
  const createStyledNativeComponent = (target: Target, options: Object, rules: RuleSet) => {
    const {
      attrs = EMPTY_ARRAY,
      displayName = generateDisplayName(target),
      ParentComponent = StyledNativeComponent,
    } = options;

    const isClass = !isTag(target);
    const isTargetStyledComp = isStyledComponent(target);

    const WrappedStyledNativeComponent = React.forwardRef((props, ref) => (
      <ParentComponent
        {...props}
        forwardedComponent={WrappedStyledNativeComponent}
        forwardedRef={ref}
      />
    ));

    const finalAttrs =
      // $FlowFixMe
      isTargetStyledComp && target.attrs
        ? Array.prototype.concat(target.attrs, attrs).filter(Boolean)
        : attrs;

    /**
     * forwardRef creates a new interim component, which we'll take advantage of
     * instead of extending ParentComponent to create _another_ interim class
     */

    // $FlowFixMe
    WrappedStyledNativeComponent.attrs = finalAttrs;

    WrappedStyledNativeComponent.displayName = displayName;

    // $FlowFixMe
    WrappedStyledNativeComponent.inlineStyle = new InlineStyle(
      // $FlowFixMe
      isTargetStyledComp ? target.inlineStyle.rules.concat(rules) : rules
    );

    // $FlowFixMe
    WrappedStyledNativeComponent.styledComponentId = 'StyledNativeComponent';
    // $FlowFixMe
    WrappedStyledNativeComponent.target = isTargetStyledComp
      ? // $FlowFixMe
        target.target
      : target;
    // $FlowFixMe
    WrappedStyledNativeComponent.withComponent = function withComponent(tag: Target) {
      const { displayName: _, componentId: __, ...optionsToCopy } = options;
      const newOptions = {
        ...optionsToCopy,
        attrs: finalAttrs,
        ParentComponent,
      };

      return createStyledNativeComponent(tag, newOptions, rules);
    };

    if (isClass) {
      // $FlowFixMe
      hoist(WrappedStyledNativeComponent, target, {
        // all SC-specific things should not be hoisted
        attrs: true,
        displayName: true,
        inlineStyle: true,
        self: true,
        styledComponentId: true,
        target: true,
        withComponent: true,
      });
    }

    // $FlowFixMe
    WrappedStyledNativeComponent.self = WrappedStyledNativeComponent;

    return WrappedStyledNativeComponent;
  };

  return createStyledNativeComponent;
};
