import React, { createElement, Ref } from 'react';
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
import { DefaultTheme, ThemeContext } from './ThemeProvider';

const hasOwn = Object.prototype.hasOwnProperty;

function shallowEqualContext(prev: object, next: object, prevKeyCount: number): boolean {
  const a = prev as Record<string, unknown>;
  const b = next as Record<string, unknown>;
  let nextKeyCount = 0;
  for (const key in b) {
    if (hasOwn.call(b, key)) {
      nextKeyCount++;
      if (a[key] !== b[key]) return false;
    }
  }
  return nextKeyCount === prevKeyCount;
}

function resolveContext<Props extends object>(
  theme: DefaultTheme = EMPTY_OBJECT,
  props: Props,
  attrs: Attrs<Props>[]
): ExecutionContext & Props {
  const context: ExecutionContext & Props = { ...props, theme };

  for (let i = 0; i < attrs.length; i++) {
    const resolvedAttrDef = isFunction(attrs[i])
      ? (attrs[i] as Function)({ ...context })
      : attrs[i];

    for (const key in resolvedAttrDef) {
      // @ts-expect-error bad types
      context[key] = resolvedAttrDef[key];
    }
  }

  return context;
}

interface StyledComponentImplProps extends ExecutionProps {
  style?: any;
}

function buildPropsForElement(
  context: Record<string, any>,
  elementToBeCreated: NativeTarget,
  shouldForwardProp: ((prop: string, el: NativeTarget) => boolean) | undefined
): Dict<any> {
  const propsForElement: Dict<any> = {};
  for (const key in context) {
    if (key[0] === '$' || key === 'as' || key === 'theme') continue;
    else if (key === 'forwardedAs') {
      propsForElement.as = context[key];
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      propsForElement[key] = context[key];
    }
  }
  return propsForElement;
}

// [prevProps, prevTheme, prevPropsKeyCount, cachedContext, cachedStyles]
type RenderCache = [object, DefaultTheme | undefined, number, object, any];

function useStyledComponentImpl<Props extends StyledComponentImplProps>(
  forwardedComponent: IStyledComponent<'native', Props>,
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

  // Guard exists for RSC: useContext is undefined in server component environments
  const contextTheme = React.useContext ? React.useContext(ThemeContext) : undefined;
  const theme = determineTheme(props, contextTheme, defaultProps) || EMPTY_OBJECT;

  let context: ExecutionContext & Props;
  let generatedStyles: any;

  const renderCacheRef = React.useRef ? React.useRef<RenderCache | null>(null) : { current: null };
  const prev = renderCacheRef.current;

  if (prev !== null && prev[1] === theme && shallowEqualContext(prev[0], props, prev[2])) {
    context = prev[3] as typeof context;
    generatedStyles = prev[4];
  } else {
    context = resolveContext<Props>(theme, props, componentAttrs);
    generatedStyles = inlineStyle.generateStyleObject(context);

    let propsKeyCount = 0;
    for (const key in props) {
      if (hasOwn.call(props, key)) propsKeyCount++;
    }
    renderCacheRef.current = [props, theme, propsKeyCount, context, generatedStyles];
  }

  const elementToBeCreated: NativeTarget = (context as any).as || props.as || target;
  const propsForElement = buildPropsForElement(context, elementToBeCreated, shouldForwardProp);

  // Guard exists for RSC: useMemo is undefined in server component environments
  propsForElement.style = React.useMemo
    ? React.useMemo(
        () =>
          isFunction(props.style)
            ? (state: any) => [generatedStyles].concat(props.style(state))
            : props.style
              ? [generatedStyles].concat(props.style)
              : generatedStyles,
        [props.style, generatedStyles]
      )
    : isFunction(props.style)
      ? (state: any) => [generatedStyles].concat(props.style(state))
      : props.style
        ? [generatedStyles].concat(props.style)
        : generatedStyles;

  if (forwardedRef) {
    propsForElement.ref = forwardedRef;
  }

  return createElement(elementToBeCreated, propsForElement);
}

export default (InlineStyle: IInlineStyleConstructor<any>) => {
  const createStyledNativeComponent = <
    Target extends NativeTarget,
    OuterProps extends ExecutionProps,
    Statics extends object = BaseObject,
  >(
    target: Target,
    options: StyledOptions<'native', OuterProps>,
    rules: RuleSet<OuterProps>
  ): ReturnType<IStyledComponentFactory<'native', Target, OuterProps, Statics>> => {
    const isTargetStyledComp = isStyledComponent(target);
    const styledComponentTarget = target as IStyledComponent<'native', OuterProps>;

    const { displayName = generateDisplayName(target), attrs = EMPTY_ARRAY } = options;

    // fold the underlying StyledComponent attrs up (implicit extend)
    const finalAttrs =
      isTargetStyledComp && styledComponentTarget.attrs
        ? styledComponentTarget.attrs.concat(attrs).filter(Boolean)
        : (attrs as Attrs<OuterProps>[]);

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

    const forwardRefRender = (
      props: React.PropsWithoutRef<ExecutionProps & OuterProps>,
      ref: React.Ref<any>
    ) =>
      useStyledComponentImpl<OuterProps>(
        WrappedStyledComponent,
        props as ExecutionProps & OuterProps,
        ref
      );

    forwardRefRender.displayName = displayName;

    /**
     * forwardRef creates a new interim component, which we'll take advantage of
     * instead of extending ParentComponent to create _another_ interim class
     */
    let WrappedStyledComponent = React.forwardRef(forwardRefRender) as unknown as IStyledComponent<
      'native',
      any
    > &
      Statics;

    WrappedStyledComponent.attrs = finalAttrs;
    WrappedStyledComponent.inlineStyle = new InlineStyle(
      isTargetStyledComp ? styledComponentTarget.inlineStyle.rules.concat(rules) : rules
    ) as InstanceType<IInlineStyleConstructor<OuterProps>>;
    WrappedStyledComponent.displayName = displayName;
    WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

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
    } as { [key in keyof OmitNever<IStyledStatics<'native', Target>>]: true });

    return WrappedStyledComponent;
  };

  return createStyledNativeComponent;
};
