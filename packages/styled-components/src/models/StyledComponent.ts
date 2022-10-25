import React, { createElement, Ref, useContext, useDebugValue } from 'react';
import { SC_VERSION } from '../constants';
import type {
  AnyComponent,
  AttrsArg,
  Dict,
  ExecutionContext,
  ExecutionProps,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledStatics,
  OmitNever,
  RuleSet,
  StyledOptions,
  WebTarget,
} from '../types';
import { checkDynamicCreation } from '../utils/checkDynamicCreation';
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses';
import determineTheme from '../utils/determineTheme';
import domElements from '../utils/domElements';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../utils/empties';
import escape from '../utils/escape';
import generateComponentId from '../utils/generateComponentId';
import generateDisplayName from '../utils/generateDisplayName';
import getComponentName from '../utils/getComponentName';
import hoist from '../utils/hoist';
import isStyledComponent from '../utils/isStyledComponent';
import isTag from '../utils/isTag';
import joinStrings from '../utils/joinStrings';
import merge from '../utils/mixinDeep';
import ComponentStyle from './ComponentStyle';
import { useStyleSheet, useStylis } from './StyleSheetManager';
import { ThemeContext } from './ThemeProvider';

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
  resolvedAttrs: T,
  warnTooManyClasses?: ReturnType<typeof createWarnTooManyClasses>
) {
  const styleSheet = useStyleSheet();
  const stylis = useStylis();

  const className = componentStyle.generateAndInjectStyles(
    isStatic ? EMPTY_OBJECT : resolvedAttrs,
    styleSheet,
    stylis
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (process.env.NODE_ENV !== 'production') useDebugValue(className);

  if (process.env.NODE_ENV !== 'production' && !isStatic && warnTooManyClasses) {
    warnTooManyClasses(className);
  }

  return className;
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
    shouldForwardProp,
    styledComponentId,
    target,
  } = forwardedComponent;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (process.env.NODE_ENV !== 'production') useDebugValue(styledComponentId);

  // NOTE: the non-hooks version only subscribes to this when !componentStyle.isStatic,
  // but that'd be against the rules-of-hooks. We could be naughty and do it anyway as it
  // should be an immutable value, but behave for now.
  const theme = determineTheme(props, useContext(ThemeContext), defaultProps) || EMPTY_OBJECT;

  const context = componentAttrs.reduce<
    ExecutionContext & Props & { class?: string; className?: string; ref?: React.Ref<Target> }
  >(
    (p, attrDef) => {
      const resolvedAttrDef = typeof attrDef === 'function' ? attrDef(p) : attrDef;

      /* eslint-disable guard-for-in */
      for (const key in resolvedAttrDef) {
        // @ts-expect-error bad types
        p[key] =
          key === 'className'
            ? joinStrings(p[key], resolvedAttrDef[key])
            : key === 'style'
            ? { ...p[key], ...resolvedAttrDef[key] }
            : resolvedAttrDef[key];
      }
      /* eslint-enable guard-for-in */

      return p;
    },
    { ...props, theme }
  );

  const generatedClassName = useInjectedStyle(
    componentStyle,
    isStatic,
    context,
    process.env.NODE_ENV !== 'production' ? forwardedComponent.warnTooManyClasses : undefined
  );

  const refToForward = forwardedRef;
  const elementToBeCreated: WebTarget = context.as || target;
  const isTargetTag = isTag(elementToBeCreated);
  const propsForElement: Dict<any> = {};

  // eslint-disable-next-line guard-for-in
  for (const key in context) {
    // @ts-expect-error for..in iterates strings instead of keyof
    if (context[key] === undefined) {
      // Omit undefined values from props passed to wrapped element.
      // This enables using .attrs() to remove props, for example.
    } else if (key[0] === '$' || key === 'as' || key === 'theme') {
      // Omit transient props and execution props.
    } else if (key === 'forwardedAs') {
      propsForElement.as = context.forwardedAs;
    } else if (!shouldForwardProp || shouldForwardProp(key, elementToBeCreated)) {
      // @ts-expect-error for..in iterates strings instead of keyof
      propsForElement[key] = context[key];
    }
  }

  propsForElement[
    // handle custom elements which React doesn't properly alias
    isTargetTag &&
    domElements.indexOf(elementToBeCreated as Extract<typeof domElements, string>) === -1
      ? 'class'
      : 'className'
  ] = foldedComponentIds
    .concat(
      styledComponentId,
      generatedClassName !== styledComponentId ? generatedClassName : '',
      context.className || ''
    )
    .filter(Boolean)
    .join(' ');

  propsForElement.ref = refToForward;

  return createElement(elementToBeCreated, propsForElement);
}

function createStyledComponent<
  Target extends WebTarget,
  OuterProps extends object,
  Statics extends object = object
>(
  target: Target,
  options: StyledOptions<'web', OuterProps>,
  rules: RuleSet<OuterProps>
): ReturnType<IStyledComponentFactory<'web', Target, OuterProps, Statics>> {
  const isTargetStyledComp = isStyledComponent(target);
  const styledComponentTarget = target as IStyledComponent<'web', Target, OuterProps>;
  const isCompositeComponent = !isTag(target);

  const {
    attrs = EMPTY_ARRAY,
    componentId = generateId(options.displayName, options.parentComponentId),
    displayName = generateDisplayName(target),
  } = options;

  const styledComponentId =
    options.displayName && options.componentId
      ? `${escape(options.displayName)}-${options.componentId}`
      : options.componentId || componentId;

  // fold the underlying StyledComponent attrs up (implicit extend)
  const finalAttrs =
    isTargetStyledComp && styledComponentTarget.attrs
      ? styledComponentTarget.attrs
          .concat(attrs as unknown as AttrsArg<OuterProps>[])
          .filter(Boolean)
      : (attrs as AttrsArg<OuterProps>[]);

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
  function forwardRef(props: ExecutionProps & OuterProps, ref: Ref<Element>) {
    // eslint-disable-next-line
    return useStyledComponentImpl<Target, OuterProps>(WrappedStyledComponent, props, ref, isStatic);
  }

  forwardRef.displayName = displayName;

  /**
   * forwardRef creates a new interim component, which we'll take advantage of
   * instead of extending ParentComponent to create _another_ interim class
   */
  let WrappedStyledComponent = React.forwardRef(forwardRef) as unknown as IStyledComponent<
    'web',
    typeof target,
    OuterProps
  > &
    Statics;
  WrappedStyledComponent.attrs = finalAttrs;
  WrappedStyledComponent.componentStyle = componentStyle;
  WrappedStyledComponent.displayName = displayName;
  WrappedStyledComponent.shouldForwardProp = shouldForwardProp;

  // this static is used to preserve the cascade of static classes for component selector
  // purposes; this is especially important with usage of the css prop
  WrappedStyledComponent.foldedComponentIds = isTargetStyledComp
    ? styledComponentTarget.foldedComponentIds.concat(styledComponentTarget.styledComponentId)
    : (EMPTY_ARRAY as string[]);

  WrappedStyledComponent.styledComponentId = styledComponentId;

  // fold the underlying StyledComponent target up since we folded the styles
  WrappedStyledComponent.target = isTargetStyledComp ? styledComponentTarget.target : target;

  WrappedStyledComponent.withComponent = function withComponent<
    Target extends WebTarget,
    Props extends object = object
  >(tag: Target) {
    const { componentId: previousComponentId, ...optionsToCopy } = options;

    const newComponentId =
      previousComponentId &&
      `${previousComponentId}-${isTag(tag) ? tag : escape(getComponentName(tag))}`;

    const newOptions = {
      ...optionsToCopy,
      attrs: finalAttrs,
      componentId: newComponentId,
    } as StyledOptions<'web', OuterProps & Props>;

    return createStyledComponent<Target, OuterProps & Props, Statics>(
      tag,
      newOptions,
      rules as RuleSet<OuterProps & Props>
    );
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

  if (process.env.NODE_ENV !== 'production') {
    checkDynamicCreation(displayName, styledComponentId);

    WrappedStyledComponent.warnTooManyClasses = createWarnTooManyClasses(
      displayName,
      styledComponentId
    );
  }

  WrappedStyledComponent.toString = () => `.${WrappedStyledComponent.styledComponentId}`;

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
        withComponent: true,
      } as { [key in keyof OmitNever<IStyledStatics<'web', OuterProps>>]: true }
    );
  }

  return WrappedStyledComponent;
}

export default createStyledComponent;
