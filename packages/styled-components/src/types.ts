import type * as CSS from 'csstype';
import React from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

export { CSS, DefaultTheme };

interface ExoticComponentWithDisplayName<P extends object = {}> extends React.ExoticComponent<P> {
  defaultProps?: Partial<P> | undefined;
  displayName?: string | undefined;
}

/**
 * Use this type to disambiguate between a styled-component instance
 * and a StyleFunction or any other type of function.
 */
export type StyledComponentBrand = { readonly _sc: symbol };

export type BaseObject = {};

// from https://stackoverflow.com/a/69852402
export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

type FastOmit<T extends object, U extends string | number | symbol> = {
  [K in keyof T as K extends U ? never : K]: T[K];
};

export type Runtime = 'web' | 'native';

export type AnyComponent<P extends object = any> =
  | ExoticComponentWithDisplayName<P>
  | React.ComponentType<P>;

export type KnownTarget = Exclude<keyof JSX.IntrinsicElements, 'symbol' | 'object'> | AnyComponent;

export type WebTarget =
  | string // allow custom elements, etc.
  | KnownTarget;

export type NativeTarget = AnyComponent;

export type StyledTarget<R extends Runtime> = R extends 'web' ? WebTarget : NativeTarget;
export interface StyledOptions<R extends Runtime, Props extends object> {
  attrs?: Attrs<Props>[] | undefined;
  componentId?: (R extends 'web' ? string : never) | undefined;
  displayName?: string | undefined;
  parentComponentId?: (R extends 'web' ? string : never) | undefined;
  shouldForwardProp?: ShouldForwardProp<R> | undefined;
}

export type Dict<T = any> = { [key: string]: T };

export type DataAttributes = { [key: `data-${string}`]: any };

export type ExecutionProps = {
  /**
   * Dynamically adjust the rendered component or HTML tag, e.g.
   * ```
   * const StyledButton = styled.button``
   *
   * <StyledButton as="a" href="/foo">
   *   I'm an anchor now
   * </StyledButton>
   * ```
   */
  as?: KnownTarget | undefined;
  forwardedAs?: KnownTarget | undefined;
  theme?: DefaultTheme | undefined;
};

/**
 * ExecutionProps but with `theme` required.
 */
export interface ExecutionContext extends ExecutionProps {
  theme: DefaultTheme;
}

export interface StyleFunction<Props extends object> {
  (executionContext: ExecutionContext & Props): Interpolation<Props>;
}

type Defaultize<P, D> = P extends any
  ? string extends keyof P
    ? P
    : PickU<P, Exclude<keyof P, keyof D>> &
        Partial<PickU<P, Extract<keyof P, keyof D>>> &
        Partial<PickU<D, Exclude<keyof D, keyof P>>>
  : never;

type ReactDefaultizedProps<C, P> = C extends { defaultProps: infer D } ? Defaultize<P, D> : P;
type ForwardRefExoticBase<P> = PickU<
  React.ForwardRefExoticComponent<P>,
  keyof React.ForwardRefExoticComponent<any>
>;
type StyledComponentPropsWithAs<
  C extends string | React.ComponentType<any>,
  T extends object,
  O extends object,
  A extends keyof any,
  AsC extends string | React.ComponentType<any> = C,
  FAsC extends string | React.ComponentType<any> = C
> = StyledComponentProps<C, T, O, A, FAsC> & {
  as?: AsC | undefined;
  forwardedAs?: FAsC | undefined;
};

type WithOptionalTheme<P extends { theme?: T | undefined }, T> = OmitU<P, 'theme'> & {
  theme?: T | undefined;
};

type MakeAttrsOptional<
  C extends string | React.ComponentType<any>,
  O extends object,
  A extends keyof P,
  P = React.ComponentPropsWithRef<
    C extends IntrinsicElementsKeys | React.ComponentType<any> ? C : never
  >
> =
  // Distribute unions early to avoid quadratic expansion
  P extends any ? OmitU<ReactDefaultizedProps<C, P> & O, A> & Partial<PickU<P & O, A>> : never;

export type StyledComponentProps<
  // The Component from whose props are derived
  C extends string | React.ComponentType<any>,
  // The Theme from the current context
  T extends object,
  // The other props added by the template
  O extends object,
  // The props that are made optional by .attrs
  A extends keyof any,
  // The Component passed with "forwardedAs" prop
  FAsC extends string | React.ComponentType<any> = C
> =
  // Distribute O if O is a union type
  O extends object
    ? WithOptionalTheme<MakeAttrsOptional<C, O, A> & MakeAttrsOptional<FAsC, O, A>, T>
    : never;

export interface StyledComponentBase<
  C extends string | React.ComponentType<any>,
  T extends object,
  O extends object = {},
  A extends keyof any = never
> extends ForwardRefExoticBase<StyledComponentProps<C, T, O, A>> {
  // add our own fake call signature to implement the polymorphic 'as' prop
  (
    props: StyledComponentProps<C, T, O, A> & {
      as?: never | undefined;
      forwardedAs?: never | undefined;
    }
  ): React.ReactElement<StyledComponentProps<C, T, O, A>>;
  <
    AsC extends string | React.ComponentType<any> = C,
    FAsC extends string | React.ComponentType<any> = AsC
  >(
    props: StyledComponentPropsWithAs<AsC, T, O, A, AsC, FAsC>
  ): React.ReactElement<StyledComponentPropsWithAs<AsC, T, O, A, AsC, FAsC>>;
}

export type PickU<T, K extends keyof T> = T extends any ? { [P in K]: T[P] } : never;
export type OmitU<T, K extends keyof T> = T extends any ? PickU<T, Exclude<keyof T, K>> : never;

type StyledComponentInterpolation =
  | PickU<StyledComponentBase<any, any, any, any>, keyof StyledComponentBase<any, any>>
  | PickU<StyledComponentBase<any, any, any>, keyof StyledComponentBase<any, any>>;

export type FalseyValue = undefined | null | false;
export type Interpolation<Props extends object> =
  | StyleFunction<Props>
  | StyledObject<Props>
  | TemplateStringsArray
  | string
  | number
  | false
  | undefined
  | null
  | Keyframes
  | StyledComponentBrand
  | RuleSet<Props>
  | Interpolation<Props>[]
  | InterpolationFunction<Props>
  | FlattenInterpolation<Props>;

export type InterpolationFunction<P extends object> = (props: P) => Interpolation<P>;
export type FlattenInterpolation<P extends object> = ReadonlyArray<Interpolation<P>>;
export type InterpolationValue =
  | string
  | number
  | FalseyValue
  | Keyframes
  | StyledComponentInterpolation
  | CSSObject;
export type SimpleInterpolation = InterpolationValue | FlattenSimpleInterpolation;
export type FlattenSimpleInterpolation = ReadonlyArray<SimpleInterpolation>;

export type Attrs<Props extends object = BaseObject> =
  | (ExecutionProps & Partial<Props>)
  | ((props: ExecutionContext & Props) => ExecutionProps & Partial<Props>);

export type RuleSet<Props extends object = BaseObject> = Interpolation<Props>[];

export type Styles<Props extends object> =
  | TemplateStringsArray
  | StyledObject<Props>
  | StyleFunction<Props>;

export type NameGenerator = (hash: number) => string;

export interface StyleSheet {
  create: Function;
}

export interface Keyframes {
  id: string;
  name: string;
  rules: string;
}

export interface Flattener<Props extends object> {
  (
    chunks: Interpolation<Props>[],
    executionContext: object | null | undefined,
    styleSheet: StyleSheet | null | undefined
  ): Interpolation<Props>[];
}

export interface Stringifier {
  (
    css: string,
    selector?: string | undefined,
    prefix?: string | undefined,
    componentId?: string | undefined
  ): string[];
  hash: string;
}

export interface ShouldForwardProp<R extends Runtime> {
  (prop: string, elementToBeCreated: StyledTarget<R>): boolean;
}

export interface CommonStatics<R extends Runtime, Props extends object> {
  attrs: Attrs<Props>[];
  target: StyledTarget<R>;
  shouldForwardProp?: ShouldForwardProp<R> | undefined;
}

export interface IStyledStatics<R extends Runtime, OuterProps extends object>
  extends CommonStatics<R, OuterProps> {
  componentStyle: R extends 'web' ? ComponentStyle : never;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: R extends 'web' ? string : never;
  inlineStyle: R extends 'native' ? InstanceType<IInlineStyleConstructor<OuterProps>> : never;
  target: StyledTarget<R>;
  styledComponentId: R extends 'web' ? string : never;
  warnTooManyClasses?:
    | (R extends 'web' ? ReturnType<typeof createWarnTooManyClasses> : never)
    | undefined;
}

/**
 * Used by PolymorphicComponent to define prop override cascading order.
 */
export type PolymorphicComponentProps<
  R extends Runtime,
  BaseProps extends object,
  AsTarget extends StyledTarget<R> | void,
  ForwardedAsTarget extends StyledTarget<R> | void,
  // props extracted from "as"
  AsTargetProps extends object = AsTarget extends KnownTarget
    ? React.ComponentPropsWithRef<AsTarget>
    : {},
  // props extracted from "forwardAs"; note that ref is excluded
  ForwardedAsTargetProps extends object = ForwardedAsTarget extends KnownTarget
    ? React.ComponentPropsWithoutRef<ForwardedAsTarget>
    : {},
> = NoInfer<
  FastOmit<
    Substitute<
      BaseProps,
      // "as" wins over "forwardedAs" when it comes to prop interface
      Substitute<ForwardedAsTargetProps, AsTargetProps>
    >,
    keyof ExecutionProps
  >
> &
  FastOmit<ExecutionProps, 'as' | 'forwardedAs'> & {
    as?: AsTarget;
    forwardedAs?: ForwardedAsTarget;
  };

/**
 * This type forms the signature for a forwardRef-enabled component
 * that accepts the "as" prop to dynamically change the underlying
 * rendered JSX. The interface will automatically attempt to extract
 * props from the given rendering target to get proper typing for
 * any specialized props in the target component.
 */
export interface PolymorphicComponent<R extends Runtime, BaseProps extends object>
  extends React.ForwardRefExoticComponent<BaseProps> {
  <
    AsTarget extends StyledTarget<R> | void = void,
    ForwardedAsTarget extends StyledTarget<R> | void = void,
  >(
    props: PolymorphicComponentProps<R, BaseProps, AsTarget, ForwardedAsTarget>
  ): JSX.Element;
}

export interface IStyledComponent<R extends Runtime, Props extends object = BaseObject>
  extends PolymorphicComponent<R, Props>,
    IStyledStatics<R, Props>,
    StyledComponentBrand {
  defaultProps?: (ExecutionProps & Partial<Props>) | undefined;
  toString: () => string;
}

// corresponds to createStyledComponent
export interface IStyledComponentFactory<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OuterProps extends object,
  OuterStatics extends object = BaseObject,
> {
  <Props extends object = BaseObject, Statics extends object = BaseObject>(
    target: Target,
    options: StyledOptions<R, OuterProps & Props>,
    rules: RuleSet<OuterProps & Props>
  ): IStyledComponent<R, Substitute<OuterProps, Props>> & OuterStatics & Statics;
}

export interface IInlineStyleConstructor<Props extends object> {
  new (rules: RuleSet<Props>): IInlineStyle<Props>;
}

export interface IInlineStyle<Props extends object> {
  rules: RuleSet<Props>;
  generateStyleObject(executionContext: ExecutionContext & Props): object;
}

export type CSSProperties = CSS.Properties<number | (string & {})>;

export type CSSPseudos = { [K in CSS.Pseudos]?: CSSObject };

export type CSSKeyframes = object & { [key: string]: CSSObject };

export type CSSObject = StyledObject<any>;

export type StyledObject<Props extends object> = CSSProperties &
  CSSPseudos & {
    [key: string]:
      | StyledObject<any> // StyledObject<any> instead of CSSObject. Because writing CSSObject directly results in a circularly references.
      | string
      | number
      | StyleFunction<Props>
      | StyledObject<Props>
      | RuleSet<any>
      | undefined;
  };

/**
 * The `css` prop is not declared by default in the types as it would cause `css` to be present
 * on the types of anything that uses styled-components indirectly, even if they do not use the
 * babel plugin.
 *
 * To enable support for the `css` prop in TypeScript, create a `styled-components.d.ts` file in
 * your project source with the following contents:
 *
 * ```ts
 * import type { CSSProp } from "styled-components";
 *
 * declare module "react" {
 *  interface Attributes {
 *    css?: CSSProp;
 *  }
 * }
 * ```
 *
 * In order to get accurate typings for `props.theme` in `css` interpolations, see
 * {@link DefaultTheme}.
 */

export type CSSProp = Interpolation<any>;

// Prevents TypeScript from inferring generic argument
export type NoInfer<T> = [T][T extends any ? 0 : never];

export type Substitute<A extends object, B extends object> = FastOmit<A, keyof B> & B;

export type IntrinsicElementsKeys = keyof JSX.IntrinsicElements;
