// @flow
import React, { createElement, Component } from 'react';
import hoist from 'hoist-non-react-statics';
import merge from '../utils/mixinDeep';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import generateDisplayName from '../utils/generateDisplayName';
import isFunction from '../utils/isFunction';
import isTag from '../utils/isTag';
import isStyledComponent from '../utils/isStyledComponent';
import { ThemeConsumer } from './ThemeProvider';

import type { Theme } from './ThemeProvider';
import type { Attrs, RuleSet, Target } from '../types';

// NOTE: no hooks available for react-native yet;
// if the user makes use of ThemeProvider or StyleSheetManager things will break.

// Validator defaults to true if not in HTML/DOM env
const validAttr = () => true;

class StyledNativeComponent extends Component<*, *> {
  root: ?Object;

  attrs = {};

  render() {
    return (
      <ThemeConsumer>
        {(theme?: Theme) => {
          const {
            $as: transientAsProp,
            as: renderAs,
            forwardedComponent,
            forwardedAs,
            forwardedRef,
            style = [],
            ...props
          } = this.props;

          const { defaultProps, target, shouldForwardProp } = forwardedComponent;
          const elementToBeRendered =
            this.attrs.$as || this.attrs.as || transientAsProp || renderAs || target;

          const generatedStyles = this.generateAndInjectStyles(
            determineTheme(this.props, theme, defaultProps) || EMPTY_OBJECT,
            this.props
          );

          const isTargetTag = isTag(elementToBeRendered);
          const computedProps = this.attrs !== props ? { ...props, ...this.attrs } : props;
          const propFilterFn = shouldForwardProp || (isTargetTag && validAttr);
          const propsForElement = {};
          let key;

          for (key in computedProps) {
            if (key[0] === '$' || key === 'as') continue;
            else if (key === 'forwardedAs') {
              propsForElement.as = props[key];
            } else if (!propFilterFn || propFilterFn(key, validAttr)) {
              // Don't pass through filtered tags through to native elements
              propsForElement[key] = computedProps[key];
            }
          }

          propsForElement.style = [generatedStyles].concat(style);

          if (forwardedRef) propsForElement.ref = forwardedRef;
          if (forwardedAs) propsForElement.as = forwardedAs;

          return createElement(elementToBeRendered, propsForElement);
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
      let attr;
      let key;

      if (isFunction(resolvedAttrDef)) {
        resolvedAttrDef = resolvedAttrDef(context);
      }

      /* eslint-disable guard-for-in */
      for (key in resolvedAttrDef) {
        attr = resolvedAttrDef[key];
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

    // $FlowFixMe
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

    // eslint-disable-next-line prefer-destructuring
    let shouldForwardProp = options.shouldForwardProp;

    // $FlowFixMe
    if (isTargetStyledComp && target.shouldForwardProp) {
      if (shouldForwardProp) {
        // compose nested shouldForwardProp calls
        shouldForwardProp = (prop, filterFn) =>
          // $FlowFixMe
          target.shouldForwardProp(prop, filterFn) && options.shouldForwardProp(prop, filterFn);
      } else {
        // eslint-disable-next-line prefer-destructuring
        shouldForwardProp = target.shouldForwardProp;
      }
    }

    /**
     * forwardRef creates a new interim component, which we'll take advantage of
     * instead of extending ParentComponent to create _another_ interim class
     */

    // $FlowFixMe
    WrappedStyledNativeComponent.attrs = finalAttrs;

    WrappedStyledNativeComponent.displayName = displayName;

    // $FlowFixMe
    WrappedStyledNativeComponent.shouldForwardProp = shouldForwardProp;

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

    // $FlowFixMe
    Object.defineProperty(WrappedStyledNativeComponent, 'defaultProps', {
      get() {
        return this._foldedDefaultProps;
      },

      set(obj) {
        // $FlowFixMe
        this._foldedDefaultProps = isTargetStyledComp ? merge({}, target.defaultProps, obj) : obj;
      },
    });

    if (isClass) {
      hoist(WrappedStyledNativeComponent, (target: any), {
        // all SC-specific things should not be hoisted
        attrs: true,
        displayName: true,
        shouldForwardProp: true,
        inlineStyle: true,
        styledComponentId: true,
        target: true,
        withComponent: true,
      });
    }

    return WrappedStyledNativeComponent;
  };

  return createStyledNativeComponent;
};
