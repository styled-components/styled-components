import type * as CSS from 'csstype';
import React from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

export { CSS, DefaultTheme };

interface ExoticComponentWithDisplayName<P extends object = {}> extends React.ExoticComponent<P> {
  defaultProps?: Partial<P>;
  displayName?: string;
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

export type KnownTarget = keyof JSX.IntrinsicElements | AnyComponent;

export type WebTarget =
  | string // allow custom elements, etc.
  | KnownTarget;

export type NativeTarget = AnyComponent;

export type StyledTarget<R extends Runtime> = R extends 'web' ? WebTarget : NativeTarget;
export interface StyledOptions<R extends Runtime, Props extends object, Theme extends object> {
  attrs?: Attrs<Props, Theme>[];
  componentId?: R extends 'web' ? string : never;
  displayName?: string;
  parentComponentId?: R extends 'web' ? string : never;
  shouldForwardProp?: ShouldForwardProp<R>;
}

export type Dict<T = any> = { [key: string]: T };

export type DataAttributes = { [key: `data-${string}`]: any };

export type ExecutionProps<Theme extends object> = {
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
  as?: KnownTarget;
  forwardedAs?: KnownTarget;
  theme?: Theme;
};

/**
 * ExecutionProps but with `theme` required.
 */
export interface ExecutionContext<Theme extends object> extends ExecutionProps<Theme> {
  theme: Theme;
}

export interface StyleFunction<Props extends object, Theme extends object> {
  (executionContext: ExecutionContext<Theme> & Props): Interpolation<object, Theme>;
}

export type Interpolation<Props extends object, Theme extends object> =
  | StyleFunction<Props, Theme>
  | StyledObject<Props, Theme>
  | TemplateStringsArray
  | string
  | number
  | false
  | undefined
  | null
  | Keyframes
  | StyledComponentBrand
  | RuleSet<object, Theme>
  | Interpolation<Props, Theme>[];

export type Attrs<Props extends object, Theme extends object> =
  | (ExecutionProps<Theme> & Partial<Props>)
  | ((props: ExecutionContext<Theme> & Props) => ExecutionProps<Theme> & Partial<Props>);

export type RuleSet<Props extends object, Theme extends object> = Interpolation<Props, Theme>[];

export type Styles<Props extends object, Theme extends object> =
  | TemplateStringsArray
  | StyledObject<Props, Theme>
  | StyleFunction<Props, Theme>;

export type NameGenerator = (hash: number) => string;

export interface StyleSheet {
  create: Function;
}

export interface Keyframes {
  id: string;
  name: string;
  rules: string;
}

export interface Flattener<Props extends object, Theme extends object> {
  (
    chunks: Interpolation<Props, Theme>[],
    executionContext: object | null | undefined,
    styleSheet: StyleSheet | null | undefined
  ): Interpolation<Props, Theme>[];
}

export interface Stringifier {
  (css: string, selector?: string, prefix?: string, componentId?: string): string[];
  hash: string;
}

export interface ShouldForwardProp<R extends Runtime> {
  (prop: string, elementToBeCreated: StyledTarget<R>): boolean;
}

export interface CommonStatics<R extends Runtime, Props extends object, Theme extends object> {
  attrs: Attrs<Props, Theme>[];
  target: StyledTarget<R>;
  shouldForwardProp?: ShouldForwardProp<R>;
}

export interface IStyledStatics<R extends Runtime, OuterProps extends object, Theme extends object>
  extends CommonStatics<R, OuterProps, Theme> {
  componentStyle: R extends 'web' ? ComponentStyle<Theme> : never;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: R extends 'web' ? string : never;
  inlineStyle: R extends 'native'
    ? InstanceType<IInlineStyleConstructor<OuterProps, Theme>>
    : never;
  target: StyledTarget<R>;
  styledComponentId: R extends 'web' ? string : never;
  warnTooManyClasses?: R extends 'web' ? ReturnType<typeof createWarnTooManyClasses> : never;
}

/**
 * Used by PolymorphicComponent to define prop override cascading order.
 */
export type PolymorphicComponentProps<
  R extends Runtime,
  Theme extends object,
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
    : {}
> = NoInfer<
  FastOmit<
    Substitute<
      BaseProps,
      // "as" wins over "forwardedAs" when it comes to prop interface
      Substitute<ForwardedAsTargetProps, AsTargetProps>
    >,
    keyof ExecutionProps<Theme>
  >
> &
  FastOmit<ExecutionProps<Theme>, 'as' | 'forwardedAs'> & {
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
export interface PolymorphicComponent<
  R extends Runtime,
  BaseProps extends object,
  Theme extends object
> extends React.ForwardRefExoticComponent<BaseProps> {
  <
    AsTarget extends StyledTarget<R> | void = void,
    ForwardedAsTarget extends StyledTarget<R> | void = void
  >(
    props: PolymorphicComponentProps<R, Theme, BaseProps, AsTarget, ForwardedAsTarget>
  ): JSX.Element;
}

export interface IStyledComponent<
  R extends Runtime,
  Theme extends object,
  Props extends object = BaseObject
> extends PolymorphicComponent<R, Props, Theme>,
    IStyledStatics<R, Props, Theme>,
    StyledComponentBrand {
  defaultProps?: ExecutionProps<Theme> & Partial<Props>;
  toString: () => string;
}

// corresponds to createStyledComponent
export interface IStyledComponentFactory<
  R extends Runtime,
  Theme extends object,
  Target extends StyledTarget<R>,
  OuterProps extends object,
  OuterStatics extends object = BaseObject
> {
  <Props extends object = BaseObject, Statics extends object = BaseObject>(
    target: Target,
    options: StyledOptions<R, OuterProps & Props, Theme>,
    rules: RuleSet<OuterProps & Props, Theme>
  ): IStyledComponent<R, Theme, Substitute<OuterProps, Props>> & OuterStatics & Statics;
}

export interface IInlineStyleConstructor<Props extends object, Theme extends object> {
  new (rules: RuleSet<Props, Theme>): IInlineStyle<Props, Theme>;
}

export interface IInlineStyle<Props extends object, Theme extends object> {
  rules: RuleSet<Props, Theme>;
  generateStyleObject(executionContext: ExecutionContext<Theme> & Props): object;
}

export type StyledObject<Props extends object, Theme extends object> = Substitute<
  Props,
  CSS.Properties
> & {
  [key: string]:
    | string
    | number
    | StyleFunction<Props, Theme>
    | StyledObject<Props, Theme>
    | RuleSet<any, Theme>
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

export type CSSProp = Interpolation<any, any>;

// Prevents TypeScript from inferring generic argument
export type NoInfer<T> = [T][T extends any ? 0 : never];

export type Substitute<A extends object, B extends object> = FastOmit<A, keyof B> & B;
