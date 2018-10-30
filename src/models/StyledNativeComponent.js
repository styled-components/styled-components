// @flow
import React, { createElement, Component } from 'react';
import determineTheme from '../utils/determineTheme';
import { EMPTY_OBJECT } from '../utils/empties';
import generateDisplayName from '../utils/generateDisplayName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isTag from '../utils/isTag';
import isDerivedReactComponent from '../utils/isDerivedReactComponent';
import isStyledComponent from '../utils/isStyledComponent';
import once from '../utils/once';
import { ThemeConsumer } from './ThemeProvider';

import type { Theme } from './ThemeProvider';
import type { RuleSet, Target } from '../types';

const warnInnerRef = once(() =>
  // eslint-disable-next-line no-console
  console.warn(
    'The "innerRef" API has been removed in styled-components v4 in favor of React 16 ref forwarding, use "ref" instead like a typical component.'
  )
);

// $FlowFixMe
class StyledNativeComponent extends Component<*, *> {
  root: ?Object;

  attrs = {};

  render() {
    return (
      <ThemeConsumer>
        {(theme?: Theme) => {
          const {
            as: renderAs,
            forwardedClass,
            forwardedRef,
            innerRef,
            style = [],
            ...props
          } = this.props;

          const { defaultProps, target } = forwardedClass;

          let generatedStyles;
          if (theme !== undefined) {
            const themeProp = determineTheme(this.props, theme, defaultProps);
            generatedStyles = this.generateAndInjectStyles(themeProp, this.props);
          } else {
            generatedStyles = this.generateAndInjectStyles(theme || EMPTY_OBJECT, this.props);
          }

          const propsForElement = {
            ...this.attrs,
            ...props,
            style: [generatedStyles].concat(style),
          };

          if (forwardedRef) propsForElement.ref = forwardedRef;
          if (process.env.NODE_ENV !== 'production' && innerRef) warnInnerRef();

          return createElement(renderAs || target, propsForElement);
        }}
      </ThemeConsumer>
    );
  }

  buildExecutionContext(theme: any, props: any, attrs: any) {
    const context = { ...props, theme };

    if (attrs === undefined) return context;

    this.attrs = {};

    let attr;
    let key;

    /* eslint-disable guard-for-in */
    for (key in attrs) {
      attr = attrs[key];

      if (isFunction(attr) && !isDerivedReactComponent(attr) && !isStyledComponent(attr)) {
        attr = attr(context);

        if (process.env.NODE_ENV !== 'production' && React.isValidElement(attr)) {
          // eslint-disable-next-line no-console
          console.warn(
            `It looks like you've used a component as value for the ${key} prop in the attrs constructor.\n` +
              "You'll need to wrap it in a function to make it available inside the styled component.\n" +
              `For example, { ${key}: () => InnerComponent } instead of { ${key}: InnerComponent }`
          );
        }
      }

      this.attrs[key] = attr;
    }
    /* eslint-enable */

    return { ...context, ...this.attrs };
  }

  generateAndInjectStyles(theme: any, props: any) {
    const { inlineStyle } = props.forwardedClass;

    const executionContext = this.buildExecutionContext(theme, props, props.forwardedClass.attrs);

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
      attrs,
      displayName = generateDisplayName(target),
      ParentComponent = StyledNativeComponent,
    } = options;

    const isClass = !isTag(target);
    const isTargetStyledComp = isStyledComponent(target);

    const WrappedStyledNativeComponent = React.forwardRef((props, ref) => (
      <ParentComponent
        {...props}
        forwardedClass={WrappedStyledNativeComponent}
        forwardedRef={ref}
      />
    ));

    const finalAttrs =
      // $FlowFixMe
      isTargetStyledComp && target.attrs ? { ...target.attrs, ...attrs } : attrs;

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
        styledComponentId: true,
        target: true,
        warnTooManyClasses: true,
        withComponent: true,
      });
    }

    return WrappedStyledNativeComponent;
  };

  return createStyledNativeComponent;
};
