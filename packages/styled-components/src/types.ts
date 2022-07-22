import React from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

interface ExoticComponentWithDisplayName<P = unknown> extends React.ExoticComponent<P> {
  defaultProps?: Partial<P>;
  displayName?: string;
}

export { DefaultTheme };

export type AnyComponent<P = any> = ExoticComponentWithDisplayName<P> | React.ComponentType<P>;

export interface StyledOptions<Props> {
  attrs?: Attrs<Props>[];
  componentId?: string;
  displayName?: string;
  parentComponentId?: string;
  shouldForwardProp?: ShouldForwardProp;
}

export interface StyledNativeOptions<Props> {
  attrs?: Attrs<Props>[];
  displayName?: string;
  shouldForwardProp?: ShouldForwardProp;
}

export type KnownTarget = keyof JSX.IntrinsicElements | AnyComponent;

export type WebTarget =
  | string // allow custom elements, etc.
  | KnownTarget;

export type NativeTarget = AnyComponent;

export interface BaseExtensibleObject {
  [key: string]: any;
}

export interface ExtensibleObject extends BaseExtensibleObject {
  $as?: KnownTarget;
  $forwardedAs?: KnownTarget;
  as?: KnownTarget;
  forwardedAs?: KnownTarget;
  theme?: DefaultTheme;
}

export interface ExecutionContext extends ExtensibleObject {
  theme: DefaultTheme;
}

export interface StyleFunction<Props = ExecutionContext> {
  (executionContext: Props): Interpolation<Props>;
}

// IStyledNativeComponent is not included here since we don't allow
// component selectors for RN
export type Interpolation<Props> =
  | StyleFunction<Props>
  | StyledObject<Props>
  | TemplateStringsArray
  | string
  | number
  | Keyframes
  | IStyledComponent<any, any>
  | Interpolation<Props>[];

export type Attrs<Props> = (ExtensibleObject & Props) | ((props: Props) => Partial<Props>);

export type RuleSet<Props> = Interpolation<Props>[];

export type Styles<Props> = TemplateStringsArray | StyledObject<Props> | StyleFunction<Props>;

export type NameGenerator = (hash: number) => string;

export interface StyleSheet {
  create: Function;
}

export interface Keyframes {
  id: string;
  name: string;
  rules: string;
}

export interface Flattener<Props> {
  (
    chunks: Interpolation<Props>[],
    executionContext: Object | null | undefined,
    styleSheet: Object | null | undefined
  ): Interpolation<Props>[];
}

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

export interface ShouldForwardProp {
  (
    prop: string,
    isValidAttr: (prop: string) => boolean,
    elementToBeCreated?: WebTarget | NativeTarget
  ): boolean;
}

export interface CommonStatics<Props> {
  attrs: Attrs<Props>[];
  target: StyledTarget;
  shouldForwardProp?: ShouldForwardProp;
  withComponent: any;
}

export interface IStyledStatics<OuterProps = unknown> extends CommonStatics<OuterProps> {
  componentStyle: ComponentStyle;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: Array<string>;
  target: WebTarget;
  styledComponentId: string;
  warnTooManyClasses?: ReturnType<typeof createWarnTooManyClasses>;
  withComponent: <Target extends WebTarget, Props = unknown>(
    tag: Target
  ) => IStyledComponent<Target, OuterProps & Props>;
}

type PolymorphicComponentProps<
  ActualComponent extends StyledTarget,
  PropsToBeInjectedIntoActualComponent extends {},
  ActualComponentProps = ActualComponent extends KnownTarget
    ? React.ComponentPropsWithRef<ActualComponent>
    : {}
> = React.HTMLAttributes<ActualComponent> &
  Omit<PropsToBeInjectedIntoActualComponent, keyof ActualComponentProps | 'as' | '$as'> &
  ActualComponentProps &
  (
    | {
        // if "$as" is passed it takes precendence over "as"
        $as: ActualComponent;
        as?: AnyComponent;
      }
    | {
        as?: ActualComponent;
      }
  );

interface PolymorphicComponent<
  FallbackComponent extends StyledTarget,
  ExpectedProps = unknown,
  PropsToBeInjectedIntoActualComponent = unknown
> extends React.ForwardRefExoticComponent<ExpectedProps> {
  <ActualComponent extends StyledTarget = FallbackComponent>(
    props: PolymorphicComponentProps<
      ActualComponent,
      ExpectedProps & PropsToBeInjectedIntoActualComponent
    >
  ): React.ReactElement<
    PolymorphicComponentProps<
      ActualComponent,
      ExecutionContext & ExpectedProps & PropsToBeInjectedIntoActualComponent
    >,
    ActualComponent
  >;
}

export interface IStyledComponent<Target extends WebTarget, Props = unknown>
  extends PolymorphicComponent<Target, Props, ExecutionContext>,
    IStyledStatics<Props> {
  defaultProps?: Partial<
    ExtensibleObject & (Target extends KnownTarget ? React.ComponentProps<Target> : {}) & Props
  >;
  toString: () => string;
}

// corresponds to createStyledComponent
export interface IStyledComponentFactory<
  Target extends WebTarget,
  Props = unknown,
  Statics = unknown
> {
  (target: Target, options: StyledOptions<Props>, rules: RuleSet<Props>): IStyledComponent<
    Target,
    Props
  > &
    Statics;
}

export interface IStyledNativeStatics<OuterProps = unknown> extends CommonStatics<OuterProps> {
  inlineStyle: InstanceType<IInlineStyleConstructor<OuterProps>>;
  target: NativeTarget;
  withComponent: <Target extends NativeTarget, Props = unknown>(
    tag: Target
  ) => IStyledNativeComponent<Target, OuterProps & Props>;
}

export interface IStyledNativeComponent<Target extends NativeTarget, Props = unknown>
  extends PolymorphicComponent<Target, Props, ExecutionContext>,
    IStyledNativeStatics<Props> {
  defaultProps?: Partial<
    ExtensibleObject & (Target extends KnownTarget ? React.ComponentProps<Target> : {}) & Props
  >;
}

// corresponds to createNativeStyledComponent
export interface IStyledNativeComponentFactory<
  Target extends NativeTarget,
  Props = unknown,
  Statics = unknown
> {
  (
    target: Target,
    options: StyledNativeOptions<Props>,
    rules: RuleSet<Props>
  ): IStyledNativeComponent<Target, Props> & Statics;
}
export interface IInlineStyleConstructor<Props = unknown> {
  new (rules: RuleSet<Props>): IInlineStyle<Props>;
}

export interface IInlineStyle<Props = unknown> {
  rules: RuleSet<Props>;
  generateStyleObject(executionContext: Object): Object;
}

export type StyledTarget = WebTarget | NativeTarget;

export interface StyledObject<Props = ExecutionContext> {
  [key: string]: BaseExtensibleObject | string | number | StyleFunction<Props>;
}
// uncomment when we can eventually override index signatures with more specific types
// [K in keyof CSS.Properties]: CSS.Properties[K] | ((...any: any[]) => CSS.Properties[K]);

/**
 * Override DefaultTheme to get accurate typings for your project.
 *
 * ```
 * // create styled-components.d.ts in your project source
 * // if it isn't being picked up, check tsconfig compilerOptions.types
 * import type { CSSProp } from "styled-components";
 * import Theme from './theme';
 *
 * type ThemeType = typeof Theme;
 *
 * declare module "styled-components" {
 *  export interface DefaultTheme extends ThemeType {}
 * }
 *
 * declare module "react" {
 *  interface DOMAttributes<T> {
 *    css?: CSSProp;
 *  }
 * }
 * ```
 */
export type CSSProp = string | StyledObject | StyleFunction;
