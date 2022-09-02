import React from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

interface ExoticComponentWithDisplayName<P = unknown> extends React.ExoticComponent<P> {
  defaultProps?: Partial<P>;
  displayName?: string;
}

// from https://stackoverflow.com/a/69852402
export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type Runtime = 'web' | 'native';

export { DefaultTheme };

export type AnyComponent<P = any> = ExoticComponentWithDisplayName<P> | React.ComponentType<P>;

export interface StyledOptions<R extends Runtime, Props> {
  attrs?: Attrs<Props>[];
  componentId?: R extends 'web' ? string : never;
  displayName?: string;
  parentComponentId?: R extends 'web' ? string : never;
  shouldForwardProp?: ShouldForwardProp<R>;
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

export interface StyleFunction<Props = BaseExtensibleObject> {
  (executionContext: ExecutionContext & Props): Interpolation<Props>;
}

export type Interpolation<Props> =
  | StyleFunction<Props>
  | StyledObject<Props>
  | TemplateStringsArray
  | string
  | number
  | undefined
  | null
  | Keyframes
  // we don't allow component selectors for native
  | IStyledComponent<'web', any, any>
  | Interpolation<Props>[];

export type Attrs<Props> =
  | (ExtensibleObject & Props)
  | ((props: ExecutionContext & Props) => Partial<Props>);

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
  (css: string, selector?: string, prefix?: string, componentId?: string): string[];
  hash: string;
}

export interface ShouldForwardProp<R extends Runtime> {
  (prop: string, elementToBeCreated?: StyledTarget<R>): boolean;
}

export interface CommonStatics<R extends Runtime, Props> {
  attrs: Attrs<Props>[];
  target: StyledTarget<R>;
  shouldForwardProp?: ShouldForwardProp<R>;
  withComponent: any;
}

export interface IStyledStatics<R extends Runtime, OuterProps = unknown>
  extends CommonStatics<R, OuterProps> {
  componentStyle: R extends 'web' ? ComponentStyle : never;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: R extends 'web' ? Array<string> : never;
  inlineStyle: R extends 'native' ? InstanceType<IInlineStyleConstructor<OuterProps>> : never;
  target: StyledTarget<R>;
  styledComponentId: R extends 'web' ? string : never;
  warnTooManyClasses?: R extends 'web' ? ReturnType<typeof createWarnTooManyClasses> : never;
  withComponent: <Target extends StyledTarget<R>, Props = unknown>(
    tag: Target
  ) => IStyledComponent<R, Target, OuterProps & Props>;
}

type PolymorphicComponentProps<
  R extends Runtime,
  ActualComponent extends StyledTarget<R>,
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
  R extends Runtime,
  FallbackComponent extends StyledTarget<R>,
  ExpectedProps = unknown,
  PropsToBeInjectedIntoActualComponent = unknown
> extends React.ForwardRefExoticComponent<ExpectedProps> {
  <ActualComponent extends StyledTarget<R> = FallbackComponent>(
    props: PolymorphicComponentProps<
      R,
      ActualComponent,
      ExpectedProps & PropsToBeInjectedIntoActualComponent
    >
  ): React.ReactElement<
    PolymorphicComponentProps<
      R,
      ActualComponent,
      ExecutionContext & ExpectedProps & PropsToBeInjectedIntoActualComponent
    >,
    ActualComponent
  >;
}

export interface IStyledComponent<
  R extends Runtime,
  Target extends StyledTarget<R>,
  Props = unknown
> extends PolymorphicComponent<R, Target, Props, ExecutionContext>,
    IStyledStatics<R, Props> {
  defaultProps?: Partial<
    ExtensibleObject & (Target extends KnownTarget ? React.ComponentProps<Target> : {}) & Props
  >;
  toString: () => string;
}

// corresponds to createStyledComponent
export interface IStyledComponentFactory<
  R extends Runtime,
  Target extends StyledTarget<R>,
  Props = unknown,
  Statics = unknown
> {
  (target: Target, options: StyledOptions<R, Props>, rules: RuleSet<Props>): IStyledComponent<
    R,
    Target,
    Props
  > &
    Statics;
}

export interface IInlineStyleConstructor<Props = unknown> {
  new (rules: RuleSet<Props>): IInlineStyle<Props>;
}

export interface IInlineStyle<Props = unknown> {
  rules: RuleSet<Props>;
  generateStyleObject(executionContext: Object): Object;
}

export type StyledTarget<R extends Runtime> = R extends 'web' ? WebTarget : NativeTarget;

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
