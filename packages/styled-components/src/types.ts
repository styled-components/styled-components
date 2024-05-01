import type * as CSS from 'csstype';
import React from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';
import type { SupportedHTMLElements } from './utils/domElements';

export { CSS, DefaultTheme, SupportedHTMLElements };

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

export type FastOmit<T extends object, U extends string | number | symbol> = {
  [K in keyof T as K extends U ? never : K]: T[K];
};

export type Runtime = 'web' | 'native';

export type AnyComponent<P extends object = any> =
  | ExoticComponentWithDisplayName<P>
  | React.ComponentType<P>;

export type KnownTarget = SupportedHTMLElements | AnyComponent;

export type WebTarget =
  | string // allow custom elements, etc.
  | KnownTarget;

export type NativeTarget = AnyComponent;

export type StyledTarget<R extends Runtime> = R extends 'web' ? WebTarget : NativeTarget;
export interface StyledOptions<
  R extends Runtime,
  Props extends object,
  Theme extends object = DefaultTheme,
> {
  attrs?: Attrs<Props, Theme>[] | undefined;
  componentId?: (R extends 'web' ? string : never) | undefined;
  displayName?: string | undefined;
  parentComponentId?: (R extends 'web' ? string : never) | undefined;
  shouldForwardProp?: ShouldForwardProp<R> | undefined;
}

export type Dict<T = any> = { [key: string]: T };

/**
 * This type is intended for when data attributes are composed via
 * the `.attrs` API:
 *
 * ```tsx
 * styled.div.attrs<DataAttributes>({ 'data-testid': 'foo' })``
 * ```
 *
 * Would love to figure out how to support this natively without having to
 * manually compose the type, but haven't figured out a way to do so yet that
 * doesn't cause specificity loss (see `test/types.tsx` if you attempt to embed
 * `DataAttributes` directly in the `Attrs<>` type.)
 */
export type DataAttributes = { [key: `data-${string}`]: any };

export type ExecutionProps<Theme extends object = DefaultTheme> = {
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
  theme?: Theme | undefined;
};

/**
 * ExecutionProps but with `theme` required.
 */
export interface ExecutionContext<Theme extends object = DefaultTheme>
  extends ExecutionProps<Theme> {
  theme: Theme;
}

export interface StyleFunction<Props extends object, Theme extends object = DefaultTheme> {
  (executionContext: ExecutionContext<Theme> & Props): Interpolation<Props>;
}

export type Interpolation<Props extends object, Theme extends object = DefaultTheme> =
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
  | RuleSet<Props, Theme>
  | Interpolation<Props, Theme>[];

export type Attrs<Props extends object = BaseObject, Theme extends object = DefaultTheme> =
  | (ExecutionProps<Theme> & Partial<Props>)
  | ((props: ExecutionContext<Theme> & Props) => ExecutionProps<Theme> & Partial<Props>);

export type RuleSet<
  Props extends object = object,
  Theme extends object = DefaultTheme,
> = Interpolation<Props, Theme>[];

export type Styles<Props extends object, Theme extends object = DefaultTheme> =
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

export interface Flattener<Props extends object, Theme extends object = DefaultTheme> {
  (
    chunks: Interpolation<Props, Theme>[],
    executionContext: object | null | undefined,
    styleSheet: StyleSheet | null | undefined
  ): Interpolation<Props, Theme>[];
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

export interface CommonStatics<
  R extends Runtime,
  Props extends object,
  Theme extends object = DefaultTheme,
> {
  attrs: Attrs<Props, Theme>[];
  target: StyledTarget<R>;
  shouldForwardProp?: ShouldForwardProp<R> | undefined;
}

export interface IStyledStatics<
  R extends Runtime,
  OuterProps extends object,
  Theme extends object = DefaultTheme,
> extends CommonStatics<R, OuterProps, Theme> {
  componentStyle: R extends 'web' ? ComponentStyle<Theme> : never;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: R extends 'web' ? string : never;
  inlineStyle: R extends 'native'
    ? InstanceType<IInlineStyleConstructor<OuterProps, Theme>>
    : never;
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
    ? React.ComponentPropsWithRef<ForwardedAsTarget>
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

interface IStyledComponentBase<
  R extends Runtime,
  Props extends object = BaseObject,
  Theme extends object = DefaultTheme,
> extends PolymorphicComponent<R, Props>,
    IStyledStatics<R, Props, Theme>,
    StyledComponentBrand {
  defaultProps?: (ExecutionProps<Theme> & Partial<Props>) | undefined;
  toString: () => string;
}

export type IStyledComponent<
  R extends Runtime,
  Props extends object = BaseObject,
  Theme extends object = DefaultTheme,
> = IStyledComponentBase<R, Props, Theme> &
  /**
   * TypeScript doesn't allow using a styled component as a key inside object
   * styles because "A computed property name must be of type 'string', 'number',
   * 'symbol', or 'any'.". The toString() method only exists in the web runtime.
   * This hack intersects the `IStyledComponent` type with the built-in `string`
   * type to keep TSC happy.
   *
   * @example
   *  const H1 = styled.h1({
   *    fontSize: '2rem'
   *  });
   *
   *  const Header = styled.header({
   *    [H1]: {
   *      marginBottom: '1rem'
   *    }
   *  })
   */
  (R extends 'web' ? string : {});

// corresponds to createStyledComponent
export interface IStyledComponentFactory<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OuterProps extends object,
  OuterStatics extends object = BaseObject,
  Theme extends object = DefaultTheme,
> {
  <Props extends object = BaseObject, Statics extends object = BaseObject>(
    target: Target,
    options: StyledOptions<R, OuterProps & Props, Theme>,
    rules: RuleSet<OuterProps & Props, Theme>
  ): IStyledComponent<R, Substitute<OuterProps, Props>, Theme> & OuterStatics & Statics;
}

export interface IInlineStyleConstructor<
  Props extends object,
  Theme extends object = DefaultTheme,
> {
  new (rules: RuleSet<Props, Theme>): IInlineStyle<Props, Theme>;
}

export interface IInlineStyle<Props extends object, Theme extends object = DefaultTheme> {
  rules: RuleSet<Props, Theme>;
  generateStyleObject(executionContext: ExecutionContext<Theme> & Props): object;
}

export type CSSProperties = CSS.Properties<number | (string & {})>;

export type CSSPseudos<Theme extends object = DefaultTheme> = {
  [K in CSS.Pseudos]?: CSSObject<Theme>;
};

export type CSSKeyframes<Theme extends object = DefaultTheme> = object & {
  [key: string]: CSSObject<Theme>;
};

export type CSSObject<
  Props extends object = BaseObject,
  Theme extends object = DefaultTheme,
> = StyledObject<Props, Theme>;

export interface StyledObject<
  Props extends object = BaseObject,
  Theme extends object = DefaultTheme,
> extends CSSProperties,
    CSSPseudos {
  [key: string]:
    | StyledObject<Props, Theme>
    | string
    | number
    | StyleFunction<Props, Theme>
    | RuleSet<any, Theme>
    | undefined;
}

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

export type CSSProp<Theme extends object = DefaultTheme> = Interpolation<any, Theme>;

// Prevents TypeScript from inferring generic argument
export type NoInfer<T> = [T][T extends any ? 0 : never];

export type Substitute<A extends object, B extends object> = FastOmit<A, keyof B> & B;
