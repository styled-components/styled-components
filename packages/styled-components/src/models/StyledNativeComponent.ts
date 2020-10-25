import hoist from 'hoist-non-react-statics';
import React, { createElement, Ref, useContext } from 'react';
import type {
  Attrs,
  ExtensibleObject,
  IInlineStyleConstructor,
  IStyledNativeComponent,
  IStyledNativeStatics,
  NativeTarget,
  RuleSet,
  ShouldForwardProp,
} from '../types';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import generateDisplayName from '../utils/generateDisplayName';
import getComponentName from '../utils/getComponentName';
import isStyledComponent from '../utils/isStyledComponent';
import merge from '../utils/mixinDeep';
import { Theme, ThemeContext } from './ThemeProvider';

function useResolvedAttrs<Config>(theme: Theme = EMPTY_OBJECT, props: Config, attrs: Attrs[]) {
  // NOTE: can't memoize this
  // returns [context, resolvedAttrs]
  // where resolvedAttrs is only the things injected by the attrs themselves
  const context: ExtensibleObject & { theme: Theme } = { ...props, theme };
  const resolvedAttrs: ExtensibleObject = {};

  attrs.forEach(attrDef => {
    let resolvedAttrDef: ExtensibleObject = attrDef;
    let key;

    if (typeof resolvedAttrDef === 'function') {
      resolvedAttrDef = resolvedAttrDef(context) as Extract<Attrs, Function>;
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
  props: ExtensibleObject,
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

  const elementToBeCreated: NativeTarget = attrs.$as || props.$as || attrs.as || props.as || target;

  const computedProps: ExtensibleObject = attrs !== props ? { ...props, ...attrs } : props;
  const propsForElement: ExtensibleObject = {};

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

export default (InlineStyle: IInlineStyleConstructor) => {
  const createStyledNativeComponent = (
    target: IStyledNativeComponent['target'],
    options: {
      attrs?: Attrs[];
      componentId: string;
      displayName?: string;
      parentComponentId?: string;
      shouldForwardProp?: ShouldForwardProp;
    },
    rules: RuleSet
  ) => {
    const isTargetStyledComp = isStyledComponent(target);
    const styledComponentTarget = target as IStyledNativeComponent;

    const { displayName = generateDisplayName(target), attrs = EMPTY_ARRAY } = options;

    // fold the underlying StyledComponent attrs up (implicit extend)
    const finalAttrs =
      isTargetStyledComp && styledComponentTarget.attrs
        ? styledComponentTarget.attrs.concat(attrs).filter(Boolean)
        : (attrs as Attrs[]);

    // eslint-disable-next-line prefer-destructuring
    let shouldForwardProp = options.shouldForwardProp;

    if (isTargetStyledComp && styledComponentTarget.shouldForwardProp) {
      const shouldForwardPropFn = styledComponentTarget.shouldForwardProp;

      if (options.shouldForwardProp) {
        // compose nested shouldForwardProp calls
        shouldForwardProp = (prop, filterFn) =>
          shouldForwardPropFn(prop, filterFn) &&
          (options.shouldForwardProp as ShouldForwardProp)(prop, filterFn);
      } else {
        // eslint-disable-next-line prefer-destructuring
        shouldForwardProp = shouldForwardPropFn;
      }
    }

    /**
     * forwardRef creates a new interim component, which we'll take advantage of
     * instead of extending ParentComponent to create _another_ interim class
     */
    let WrappedStyledComponent: IStyledNativeComponent;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const forwardRef = (props: ExtensibleObject, ref: React.Ref<any>) =>
      useStyledComponentImpl(WrappedStyledComponent, props, ref);

    forwardRef.displayName = displayName;

    WrappedStyledComponent = (React.forwardRef(forwardRef) as unknown) as IStyledNativeComponent;

    WrappedStyledComponent.attrs = finalAttrs;
    WrappedStyledComponent.inlineStyle = new InlineStyle(
      isTargetStyledComp ? styledComponentTarget.inlineStyle.rules.concat(rules) : rules
    );
    WrappedStyledComponent.displayName = displayName;
    WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

    // fold the underlying StyledComponent target up since we folded the styles
    WrappedStyledComponent.target = isTargetStyledComp ? styledComponentTarget.target : target;

    WrappedStyledComponent.withComponent = function withComponent(
      tag: IStyledNativeComponent['target']
    ) {
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
          ? merge({}, styledComponentTarget.defaultProps, obj)
          : obj;
      },
    });

    hoist<IStyledNativeComponent, typeof target>(WrappedStyledComponent, target, {
      // all SC-specific things should not be hoisted
      attrs: true,
      inlineStyle: true,
      displayName: true,
      shouldForwardProp: true,
      target: true,
      withComponent: true,
    } as { [key in keyof IStyledNativeStatics]: boolean });

    return WrappedStyledComponent;
  };

  return createStyledNativeComponent;
};
