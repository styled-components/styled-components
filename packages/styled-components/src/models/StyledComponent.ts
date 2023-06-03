import React, { createElement, Ref, useDebugValue } from 'react';
import { SC_VERSION } from '../constants';
import type {
  AnyComponent,
  Attrs,
  Dict,
  ExecutionContext,
  ExecutionProps,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledStatics,
  OmitNever,
  RuleSet,
  StyledComponentProps,
  StyledOptions,
  WebTarget,
} from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses';
import determineTheme from '../utils/determineTheme';
import domElements from '../utils/domElements';
import { EMPTY_OBJECT } from '../utils/empties';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import generateDisplayName from '../utils/generateDisplayName';
import hoist from '../utils/hoist';
import isFunction from '../utils/isFunction';
import isStyledComponent from '../utils/isStyledComponent';
import isTag from '../utils/isTag';
import { joinStrings } from '../utils/joinStrings';
import merge from '../utils/mixinDeep';
import ComponentStyle from './ComponentStyle';
import { useStyleSheetContext } from './StyleSheetManager';
import { DefaultTheme, useTheme } from './ThemeProvider';

const identifiers: { [key: string]: number } = {};

/* We depend on components having unique IDs */
function generateId(displayName?: string, parentComponentId?: string): string {
  const name = typeof displayName !== 'string' ? 'sc' : escape(displayName);
  // Ensure that no displayName can lead to duplicate componentIds
  identifiers[name] = (identifiers[name] || 0) + 1;

  const componentId = `${name}-${generateComponentId(
    // SC_VERSION gives us isolation between multiple runtimes on the page at once
    // this is improved further with use of the babel plugin "namespace" feature
    SC_VERSION + name + identifiers[name]
  )}`;

  return parentComponentId ? `${parentComponentId}-${componentId}` : componentId;
}

function useInjectedStyle<T extends object>(
  componentStyle: ComponentStyle,
  isStatic: boolean,
  resolvedAttrs: T
) {
  const ssc = useStyleSheetContext();

  const className = componentStyle.generateAndInjectStyles(
    isStatic ? EMPTY_OBJECT : resolvedAttrs,
    ssc.styleSheet,
    ssc.stylis
  );

  if (process.env.NODE_ENV !== 'production') useDebugValue(className);

  return className;
}

function resolveContext<Props extends object>(
  attrs: Attrs<unknown>[],
  props: React.HTMLAttributes<Element> & Props,
  theme: DefaultTheme
) {
  const context: ExecutionContext &
    Props & { class?: string; className?: string; ref?: React.Ref<any>; style?: any } = {
    ...props,
    // unset, add `props.className` back at the end so props always "wins"
    className: undefined,
    theme,
  };
  let attrDef;

  for (let i = 0; i < attrs.length; i += 1) {
    attrDef = attrs[i];
    const resolvedAttrDef = isFunction(attrDef) ? attrDef(context) : attrDef;

    for (const key in resolvedAttrDef) {
      // @ts-expect-error bad types
      context[key] =
        key === 'className'
          ? joinStrings(context[key] as string | undefined, resolvedAttrDef[key] as string)
          : key === 'style'
          ? { ...context[key], ...resolvedAttrDef[key] }
          : resolvedAttrDef[key];
    }
  }

  if (props.className) {
    context.className = joinStrings(context.className, props.className);
  }

  return context;
}

function useStyledComponentImpl<Target extends WebTarget, Props extends ExecutionProps>(
  forwardedComponent: IStyledComponent<'web', Target, Props>,
  props: Props,
  forwardedRef: Ref<Element>,
  isStatic: boolean
) {
  const {
    attrs: componentAttrs,
    componentStyle,
    defaultProps,
    foldedComponentIds,
    styledComponentId,
    target,
  } = forwardedComponent;

  const contextTheme = useTheme();
  const ssc = useStyleSheetContext();
  const shouldForwardProp = forwardedComponent.shouldForwardProp || ssc.shouldForwardProp;

  if (process.env.NODE_ENV !== 'production') useDebugValue(styledComponentId);

  // NOTE: the non-hooks version only subscribes to this when !componentStyle.isStatic,
  // but that'd be against the rules-of-hooks. We could be naughty and do it anyway as it
  // should be an immutable value, but behave for now.
  const theme = determineTheme(props, contextTheme, defaultProps) || EMPTY_OBJECT;

  const context: Dict<any> = resolveContext<Props>(componentAttrs, props, theme);
  const elementToBeCreated: WebTarget = context.as || target;
  const propsForElement: Dict<any> = {};

  for (const key in context) {
    if (context[key] === undefined) {
      // Omit undefined values from props passed to wrapped element.
      // This enables using .attrs() to remove props, for example.
    } else if (key[0] === '$' || key === 'as' || key === 'theme') {
      // Omit transient props and execution props.
    } else if (key === 'forwardedAs') {
      propsForElement.as = context.forwardedAs;
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      propsForElement[key] = context[key];
    }
  }

  const generatedClassName = useInjectedStyle(componentStyle, isStatic, context);

  if (process.env.NODE_ENV !== 'production' && !isStatic && forwardedComponent.warnTooManyClasses) {
    forwardedComponent.warnTooManyClasses(generatedClassName);
  }

  let classString = joinStrings(foldedComponentIds, styledComponentId);
  if (generatedClassName) {
    classString += ' ' + generatedClassName;
  }
  if (context.className) {
    classString += ' ' + context.className;
  }

  propsForElement[
    // handle custom elements which React doesn't properly alias
    isTag(elementToBeCreated) &&
    !domElements.has(elementToBeCreated as Extract<typeof domElements, string>)
      ? 'class'
      : 'className'
  ] = classString;

  propsForElement.ref = forwardedRef;

  return createElement(elementToBeCreated, propsForElement);
}

function createStyledComponent<
  Target extends WebTarget,
  OtherProps extends object,
  Statics extends object = object
>(
  target: Target,
  options: StyledOptions<'web', OtherProps>,
  rules: RuleSet<OtherProps>
): ReturnType<IStyledComponentFactory<'web', Target, OtherProps, never, Statics>> {
  const isTargetStyledComp = isStyledComponent(target);
  const styledComponentTarget = target as IStyledComponent<'web', Target, OtherProps>;
  const isCompositeComponent = !isTag(target);

  const {
    componentId = generateId(options.displayName, options.parentComponentId),
    displayName = generateDisplayName(target),
  } = options;
  const attrs = (options.attrs ?? []) as Attrs<
    StyledComponentProps<'web', Target, OtherProps, never>
  >[];

  const styledComponentId =
    options.displayName && options.componentId
      ? `${escape(options.displayName)}-${options.componentId}`
      : options.componentId || componentId;

  // fold the underlying StyledComponent attrs up (implicit extend)
  const finalAttrs =
    isTargetStyledComp && styledComponentTarget.attrs
      ? styledComponentTarget.attrs.concat(attrs).filter(Boolean)
      : attrs;

  let { shouldForwardProp } = options;

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

  const componentStyle = new ComponentStyle(
    rules,
    styledComponentId,
    isTargetStyledComp ? (styledComponentTarget.componentStyle as ComponentStyle) : undefined
  );

  // statically styled-components don't need to build an execution context object,
  // and shouldn't be increasing the number of class names
  const isStatic = componentStyle.isStatic && attrs.length === 0;
  function forwardRef(props: ExecutionProps & OtherProps, ref: Ref<Element>) {
    return useStyledComponentImpl<Target, OtherProps>(WrappedStyledComponent, props, ref, isStatic);
  }

  forwardRef.displayName = displayName;

  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */
  let WrappedStyledComponent = React.forwardRef(forwardRef) as unknown as IStyledComponent<
    'web',
    typeof target,
    OtherProps
  > &
    Statics;
  WrappedStyledComponent.attrs = finalAttrs;
  WrappedStyledComponent.componentStyle = componentStyle;
  WrappedStyledComponent.displayName = displayName;
  WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

  // this static is used to preserve the cascade of static classes for component selector
  // purposes; this is especially important with usage of the css prop
  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp
    ? joinStrings(styledComponentTarget.foldedComponentIds, styledComponentTarget.styledComponentId)
    : '';

  WrappedStyledComponent.styledComponentId = styledComponentId;

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

  if (process.env.NODE_ENV !== 'production') {
    checkDynamicCreation(displayName, styledComponentId);

    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(
      displayName,
      styledComponentId
    );
  }

  // If the Object prototype is frozen, the "toString" property is non-writable. This means that any objects which inherit this property
  // cannot have the property changed using an assignment. If using strict mode, attempting that will cause an error. If not using strict
  // mode, attempting that will be silently ignored.
  // However, we can still explicitly shadow the prototype's "toString" property by defining a new "toString" property on this object.
  Object.defineProperty(WrappedStyledComponent, 'toString', {
    value: () => `.${WrappedStyledComponent.styledComponentId}`,
  });

  if (isCompositeComponent) {
    const compositeComponentTarget = target as AnyComponent;

    hoist<typeof WrappedStyledComponent, typeof compositeComponentTarget>(
      WrappedStyledComponent,
      compositeComponentTarget,
      {
        // all SC-specific things should not be hoisted
        attrs: true,
        componentStyle: true,
        displayName: true,
        foldedComponentIds: true,
        shouldForwardProp: true,
        styledComponentId: true,
        target: true,
      } as { [key in keyof OmitNever<IStyledStatics<'web', OtherProps>>]: true }
    );
  }

  return WrappedStyledComponent;
}

export default createStyledComponent;
