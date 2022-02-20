import React, { ComponentType } from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

export type StyledOptions<Props> = {
  attrs?: Attrs<Props>[];
  componentId?: string;
  displayName?: string;
  parentComponentId?: string;
  shouldForwardProp?: ShouldForwardProp;
};

export type StyledNativeOptions<Props> = {
  attrs?: Attrs<Props>[];
  displayName?: string;
  shouldForwardProp?: ShouldForwardProp;
};

export type BaseExtensibleObject = {
  [key: string]: any;
};

export type ExtensibleObject = BaseExtensibleObject & {
  $as?: KnownWebTarget;
  $forwardedAs?: KnownWebTarget;
  as?: KnownWebTarget;
  forwardedAs?: KnownWebTarget;
  theme?: DefaultTheme;
};

export type ExecutionContext = ExtensibleObject & {
  theme: DefaultTheme;
};

export type StyleFunction<Props> = (
  executionContext: ExecutionContext & Props
) => string | StyledObject | CSSConstructor<Props> | StyleFunction<Props>;

// IStyledNativeComponent is not included here since we don't allow
// component selectors for RN
export type Interpolation<Props> =
  | StyleFunction<Props>
  | StyledObject
  | string
  | number
  | Keyframes
  | IStyledComponent<any, any>
  | Interpolation<Props>[];

export type Attrs<Props> =
  | (ExtensibleObject & Props)
  | ((props: ExecutionContext & Props) => ExecutionContext & Props);

export type RuleSet<Props> = Interpolation<Props>[];

export type Styles<Props> = TemplateStringsArray | StyledObject | StyleFunction<Props>;

export type KnownWebTarget =
  | keyof JSX.IntrinsicElements
  | React.ComponentType<any>
  | React.ForwardRefExoticComponent<any>;
export type WebTarget =
  | string // allow custom elements, etc.
  | KnownWebTarget;

export type NativeTarget = ComponentType<any> | React.ForwardRefExoticComponent<any>;

export type NameGenerator = (hash: number) => string;

export type CSSConstructor<Props> = (
  strings: string[],
  ...interpolations: Interpolation<Props>[]
) => RuleSet<Props>;

export type StyleSheet = {
  create: Function;
};

export interface Keyframes {
  id: string;
  name: string;
  rules: string;
}

export type Flattener<Props> = (
  chunks: Interpolation<Props>[],
  executionContext: Object | null | undefined,
  styleSheet: Object | null | undefined
) => Interpolation<Props>[];

export type FlattenerResult<Props> =
  | RuleSet<Props>
  | number
  | string
  | string[]
  | IStyledComponent<any, any>
  | Keyframes;

export interface Stringifier {
  (css: string, selector?: string, prefix?: string, componentId?: string): string;
  hash: string;
}

export type ShouldForwardProp = (
  prop: string,
  isValidAttr: (prop: string) => boolean,
  elementToBeCreated?: WebTarget | NativeTarget
) => boolean;

export interface CommonStatics<Props> {
  attrs: Attrs<Props>[];
  target: StyledTarget;
  shouldForwardProp?: ShouldForwardProp;
  withComponent: any;
}

export interface IStyledStatics<OuterProps = undefined> extends CommonStatics<OuterProps> {
  componentStyle: ComponentStyle;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: Array<string>;
  target: WebTarget;
  styledComponentId: string;
  warnTooManyClasses?: ReturnType<typeof createWarnTooManyClasses>;
  withComponent: <Target extends WebTarget, Props = undefined>(
    tag: Target
  ) => IStyledComponent<Target, OuterProps & Props>;
}

type CustomComponentProps<
  ActualComponent extends WebTarget,
  PropsToBeInjectedIntoActualComponent extends {},
  ActualComponentProps = ActualComponent extends KnownWebTarget
    ? React.ComponentPropsWithRef<ActualComponent>
    : {}
> = React.HTMLAttributes<ActualComponent> &
  Omit<PropsToBeInjectedIntoActualComponent, keyof ActualComponentProps | 'as' | '$as'> &
  ActualComponentProps & {
    $as?: ActualComponent;
    as?: ActualComponent;
  };

interface CustomComponent<
  FallbackComponent extends WebTarget,
  ExpectedProps = {},
  PropsToBeInjectedIntoActualComponent = {}
> extends React.ForwardRefExoticComponent<ExpectedProps> {
  <ActualComponent extends WebTarget = FallbackComponent>(
    props: CustomComponentProps<
      ActualComponent,
      ExpectedProps & PropsToBeInjectedIntoActualComponent
    >
  ): React.ReactElement<
    CustomComponentProps<
      ActualComponent,
      ExecutionContext & ExpectedProps & PropsToBeInjectedIntoActualComponent
    >,
    ActualComponent
  >;
}

export interface IStyledComponent<Target extends WebTarget, Props = undefined>
  extends CustomComponent<Target, Props, ExecutionContext>,
    IStyledStatics<Props> {
  defaultProps?: Partial<ExtensibleObject & Props>;
  toString: () => string;
}

export type IStyledComponentFactory<Target extends WebTarget, Props = undefined> = (
  target: Target,
  options: StyledOptions<Props>,
  rules: RuleSet<Props>
) => IStyledComponent<Target, Props>;

export interface IStyledNativeStatics<OuterProps = undefined> extends CommonStatics<OuterProps> {
  inlineStyle: InstanceType<IInlineStyleConstructor<OuterProps>>;
  target: NativeTarget;
  withComponent: <Target extends NativeTarget, Props = undefined>(
    tag: Target
  ) => IStyledNativeComponent<Target, OuterProps & Props>;
}

export interface IStyledNativeComponent<Target extends NativeTarget, Props = undefined>
  extends CustomComponent<Target, Props>,
    IStyledNativeStatics<Props> {
  defaultProps?: Partial<ExtensibleObject & Props>;
}

export type IStyledNativeComponentFactory<Target extends NativeTarget, Props = undefined> = (
  target: NativeTarget,
  options: StyledNativeOptions<Props>,
  rules: RuleSet<Props>
) => IStyledNativeComponent<Target, Props>;
export interface IInlineStyleConstructor<Props = undefined> {
  new (rules: RuleSet<Props>): IInlineStyle<Props>;
}

export interface IInlineStyle<Props = undefined> {
  rules: RuleSet<Props>;
  generateStyleObject(executionContext: Object): Object;
}

export type StyledTarget = WebTarget | NativeTarget;

export type StyledObject = {
  [key: string]: Record<string, any> | string | number | StyleFunction<ExecutionContext>;
} & {
  // uncomment when we can eventually override index signatures with more specific types
  // [K in keyof CSS.Properties]: CSS.Properties[K] | ((...any: any[]) => CSS.Properties[K]);
};
