// @flow
import hoist from 'hoist-non-react-statics';
import React, { createElement, useContext, type Ref } from 'react';
import type {
  Attrs,
  IInlineStyle,
  IStyledNativeComponent,
  IStyledNativeStatics,
  RuleSet,
  ShouldForwardProp,
  Target,
} from '../types';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import generateComponentId from '../utils/generateComponentId';
import generateDisplayName from '../utils/generateDisplayName';
import getComponentName from '../utils/getComponentName';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import merge from '../utils/mixinDeep';
import { ThemeContext } from './ThemeProvider';

const identifiers = {};

/* We depend on components having unique IDs */
function generateId(displayName?: string, parentComponentId?: string) {
  const name = typeof displayName !== 'string' ? 'sc' : escape(displayName);
  // Ensure that no displayName can lead to duplicate componentIds
  identifiers[name] = (identifiers[name] || 0) + 1;

  const componentId = `${name}-${generateComponentId(name + identifiers[name])}`;
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
      context[key] = resolvedAttrs[key] = resolvedAttrDef[key];
    }
    /* eslint-enable guard-for-in */
  });

  return [context, resolvedAttrs];
}

// Validator defaults to true if not in HTML/DOM env
const validAttr = () => true;

function useStyledComponentImpl(
  forwardedComponent: IStyledNativeComponent,
  props: Object,
  forwardedRef: Ref<any>
) {
  const {
    attrs: componentAttrs,
    inlineStyle,
    defaultProps,
    shouldForwardProp,
    target,
  } = forwardedComponent;

  // NOTE: the non-hooks version only subscribes to this when !componentStyle.isStatic,
  // but that'd be against the rules-of-hooks. We could be naughty and do it anyway as it
  // should be an immutable value, but behave for now.
  const theme = determineTheme(props, useContext(ThemeContext), defaultProps);

  const [context, attrs] = useResolvedAttrs(theme || EMPTY_OBJECT, props, componentAttrs);

  const generatedStyles = inlineStyle.generateStyleObject(context);

  const refToForward = forwardedRef;

  const elementToBeCreated: Target = attrs.$as || props.$as || attrs.as || props.as || target;

  const computedProps = attrs !== props ? { ...props, ...attrs } : props;
  const propsForElement = {};

  // eslint-disable-next-line guard-for-in
  for (const key in computedProps) {
    if (key[0] === '$' || key === 'as') continue;
    else if (key === 'forwardedAs') {
      propsForElement.as = computedProps[key];
    } else if (!shouldForwardProp || shouldForwardProp(key, validAttr)) {
      propsForElement[key] = computedProps[key];
    }
  }

  propsForElement.style = [generatedStyles].concat(props.style || []);

  propsForElement.ref = refToForward;

  return createElement(elementToBeCreated, propsForElement);
}

export default (InlineStyle: Class<IInlineStyle>) => {
  const createStyledNativeComponent = (
    target: $PropertyType<IStyledNativeComponent, 'target'>,
    options: {
      attrs?: Attrs,
      componentId: string,
      displayName?: string,
      parentComponentId?: string,
      shouldForwardProp?: ShouldForwardProp,
    },
    rules: RuleSet
  ) => {
    const isTargetStyledComp = isStyledComponent(target);

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
      isTargetStyledComp && ((target: any): IStyledNativeComponent).attrs
        ? ((target: any): IStyledNativeComponent).attrs.concat(attrs).filter(Boolean)
        : attrs;

    // eslint-disable-next-line prefer-destructuring
    let shouldForwardProp = options.shouldForwardProp;

    if (isTargetStyledComp && target.shouldForwardProp) {
      if (options.shouldForwardProp) {
        // compose nested shouldForwardProp calls
        shouldForwardProp = (prop, filterFn) =>
          ((((target: any): IStyledNativeComponent).shouldForwardProp: any): ShouldForwardProp)(
            prop,
            filterFn
          ) && ((options.shouldForwardProp: any): ShouldForwardProp)(prop, filterFn);
      } else {
        // eslint-disable-next-line prefer-destructuring
        shouldForwardProp = ((target: any): IStyledNativeComponent).shouldForwardProp;
      }
    }

    /**
     * forwardRef creates a new interim component, which we'll take advantage of
     * instead of extending ParentComponent to create _another_ interim class
     */
    let WrappedStyledComponent: IStyledNativeComponent;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const forwardRef = (props, ref) => useStyledComponentImpl(WrappedStyledComponent, props, ref);

    forwardRef.displayName = displayName;

    WrappedStyledComponent = ((React.forwardRef(forwardRef): any): IStyledNativeComponent);

    WrappedStyledComponent.attrs = finalAttrs;
    WrappedStyledComponent.inlineStyle = new InlineStyle(
      isTargetStyledComp
        ? ((target: any): IStyledNativeComponent).inlineStyle.rules.concat(rules)
        : rules
    );
    WrappedStyledComponent.displayName = displayName;
    WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

    WrappedStyledComponent.styledComponentId = styledComponentId;

    // fold the underlying StyledComponent target up since we folded the styles
    WrappedStyledComponent.target = isTargetStyledComp
      ? ((target: any): IStyledNativeComponent).target
      : target;

    WrappedStyledComponent.withComponent = function withComponent(tag: Target) {
      const { componentId: previousComponentId, ...optionsToCopy } = options;

      const newComponentId =
        previousComponentId && `${previousComponentId}-${escape(getComponentName(tag))}`;

      const newOptions = {
        ...optionsToCopy,
        attrs: finalAttrs,
        componentId: newComponentId,
      };

      return createStyledNativeComponent(tag, newOptions, rules);
    };

    Object.defineProperty(WrappedStyledComponent, 'defaultProps', {
      get() {
        return this._foldedDefaultProps;
      },

      set(obj) {
        this._foldedDefaultProps = isTargetStyledComp
          ? merge({}, ((target: any): IStyledNativeComponent).defaultProps, obj)
          : obj;
      },
    });

    hoist<
      IStyledNativeStatics,
      $PropertyType<IStyledNativeComponent, 'target'>,
      { [key: $Keys<IStyledNativeStatics>]: true }
    >(WrappedStyledComponent, ((target: any): $PropertyType<IStyledNativeComponent, 'target'>), {
      // all SC-specific things should not be hoisted
      attrs: true,
      inlineStyle: true,
      displayName: true,
      shouldForwardProp: true,
      styledComponentId: true,
      target: true,
      withComponent: true,
    });

    return WrappedStyledComponent;
  };

  return createStyledNativeComponent;
};
