import React, { createElement, Ref, useMemo } from 'react';
import type {
  Attrs,
  BaseObject,
  Dict,
  ExecutionContext,
  ExecutionProps,
  IInlineStyleConstructor,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledStatics,
  NativeTarget,
  OmitNever,
  RuleSet,
  StyledOptions,
} from '../types';
import determineTheme from '../utils/determineTheme';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import generateDisplayName from '../utils/generateDisplayName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import merge from '../utils/mixinDeep';
import { ThemeContext } from './ThemeProvider';

function useResolvedAttrs<Props extends object, Theme extends object>(
  theme: Theme,
  props: Props,
  attrs: Attrs<Props, Theme>[]
) {
  // NOTE: can't memoize this
  // returns [context, resolvedAttrs]
  // where resolvedAttrs is only the things injected by the attrs themselves
  const context: ExecutionContext<Theme> & Props = { ...props, theme };
  const resolvedAttrs: Dict<any> = {};

  attrs.forEach(attrDef => {
    let resolvedAttrDef = isFunction(attrDef) ? attrDef(context) : attrDef;
    let key;

    for (key in resolvedAttrDef) {
      // @ts-expect-error bad types
      context[key] = resolvedAttrs[key] = resolvedAttrDef[key];
    }
  });

  return [context, resolvedAttrs] as const;
}

interface StyledComponentImplProps<Theme extends object> extends ExecutionProps<Theme> {
  style?: any;
}

function useStyledComponentImpl<
  Theme extends object,
  Props extends StyledComponentImplProps<Theme>
>(
  forwardedComponent: IStyledComponent<'native', Theme, Props>,
  props: Props,
  forwardedRef: Ref<any>
) {
  const {
    attrs: componentAttrs,
    inlineStyle,
    defaultProps,
    shouldForwardProp,
    target,
  } = forwardedComponent;

  const contextTheme = React.useContext(ThemeContext);

  // NOTE: the non-hooks version only subscribes to this when !componentStyle.isStatic,
  // but that'd be against the rules-of-hooks. We could be naughty and do it anyway as it
  // should be an immutable value, but behave for now.
  const theme = determineTheme<Theme>(props, contextTheme as Theme, defaultProps);

  const [context, attrs] = useResolvedAttrs<Props, Theme>(
    theme || (EMPTY_OBJECT as Theme),
    props,
    componentAttrs
  );

  const generatedStyles = inlineStyle.generateStyleObject(context);

  const refToForward = forwardedRef;

  const elementToBeCreated: NativeTarget = attrs.as || props.as || target;

  const computedProps: Dict<any> = attrs !== props ? { ...props, ...attrs } : props;
  const propsForElement: Dict<any> = {};

  for (const key in computedProps) {
    if (key[0] === '$' || key === 'as') continue;
    else if (key === 'forwardedAs') {
      propsForElement.as = computedProps[key];
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      propsForElement[key] = computedProps[key];
    }
  }

  propsForElement.style = useMemo(
    () =>
      isFunction(props.style)
        ? (state: any) => [generatedStyles].concat(props.style(state))
        : props.style
        ? [generatedStyles].concat(props.style)
        : generatedStyles,
    [props.style, generatedStyles]
  );

  propsForElement.ref = refToForward;

  return createElement(elementToBeCreated, propsForElement);
}

export default <Theme extends object>(InlineStyle: IInlineStyleConstructor<any, Theme>) => {
  const createStyledNativeComponent = <
    Target extends NativeTarget,
    OuterProps extends ExecutionProps<Theme>,
    Statics extends object = BaseObject
  >(
    target: Target,
    options: StyledOptions<'native', OuterProps, Theme>,
    rules: RuleSet<OuterProps, Theme>
  ): ReturnType<IStyledComponentFactory<'native', Theme, Target, OuterProps, Statics>> => {
    const isTargetStyledComp = isStyledComponent(target);
    const styledComponentTarget = target as IStyledComponent<'native', Theme, OuterProps>;

    const { displayName = generateDisplayName(target), attrs = EMPTY_ARRAY } = options;

    // fold the underlying StyledComponent attrs up (implicit extend)
    const finalAttrs =
      isTargetStyledComp && styledComponentTarget.attrs
        ? styledComponentTarget.attrs.concat(attrs).filter(Boolean)
        : (attrs as Attrs<OuterProps, Theme>[]);

    let shouldForwardProp = options.shouldForwardProp;

    if (isTargetStyledComp && styledComponentTarget.shouldForwardProp) {
      const shouldForwardPropFn = styledComponentTarget.shouldForwardProp;

      if (options.shouldForwardProp) {
        const passedShouldForwardPropFn = options.shouldForwardProp;

        // compose nested shouldForwardProp calls
        shouldForwardProp = (prop, elementToBeCreated) =>
          shouldForwardPropFn(prop, elementToBeCreated) &&
          passedShouldForwardPropFn(prop, elementToBeCreated);
      } else {
        shouldForwardProp = shouldForwardPropFn;
      }
    }

    const forwardRefRender = (props: ExecutionProps<Theme> & OuterProps, ref: React.Ref<any>) =>
      useStyledComponentImpl<Theme, OuterProps>(WrappedStyledComponent, props, ref);

    if (process.env.NODE_ENV !== 'production') {
      forwardRefRender.displayName = displayName;
    }

    /**
     * forwardRef creates a new interim component, which we'll take advantage of
     * instead of extending ParentComponent to create _another_ interim class
     */
    let WrappedStyledComponent = React.forwardRef(forwardRefRender) as unknown as IStyledComponent<
      'native',
      Theme,
      any
    > &
      Statics;

    WrappedStyledComponent.attrs = finalAttrs;
    WrappedStyledComponent.inlineStyle = new InlineStyle(
      isTargetStyledComp ? styledComponentTarget.inlineStyle.rules.concat(rules) : rules
    ) as InstanceType<IInlineStyleConstructor<OuterProps, Theme>>;
    WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

    if (process.env.NODE_ENV !== 'production') {
      WrappedStyledComponent.displayName = displayName;
    }

    // @ts-expect-error we don't actually need this for anything other than detection of a styled-component
    WrappedStyledComponent.styledComponentId = true;

    // fold the underlying StyledComponent target up since we folded the styles
    WrappedStyledComponent.target = isTargetStyledComp ? styledComponentTarget.target : target;

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

    hoist<typeof WrappedStyledComponent, typeof target>(WrappedStyledComponent, target, {
      // all SC-specific things should not be hoisted
      attrs: true,
      inlineStyle: true,
      displayName: true,
      shouldForwardProp: true,
      target: true,
    } as { [key in keyof OmitNever<IStyledStatics<'native', Target, Theme>>]: true });

    return WrappedStyledComponent;
  };

  return createStyledNativeComponent;
};
