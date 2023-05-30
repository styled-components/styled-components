import React from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

interface ExoticComponentWithDisplayName<P = any> extends React.ExoticComponent<P> {
  defaultProps?: Partial<P>;
  displayName?: string;
}

// from https://stackoverflow.com/a/69852402
export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type Runtime = 'web' | 'native';

export { DefaultTheme };

export type AnyComponent<P = any> = ExoticComponentWithDisplayName<P> | React.ComponentType<P>;

export type KnownTarget = keyof JSX.IntrinsicElements | AnyComponent;

export type WebTarget =
  | string // allow custom elements, etc.
  | KnownTarget;

export type NativeTarget = AnyComponent;

export type StyledTarget<R extends Runtime> = R extends 'web' ? WebTarget : NativeTarget;
export interface StyledOptions<R extends Runtime, Props extends object> {
  attrs?: Attrs<Props>[];
  componentId?: R extends 'web' ? string : never;
  displayName?: string;
  parentComponentId?: R extends 'web' ? string : never;
  shouldForwardProp?: ShouldForwardProp<R>;
}

export type Dict<T> = { [key: string]: T };

export interface ExecutionProps {
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
  theme?: DefaultTheme;
}

/**
 * ExecutionProps but with `theme` required.
 */
export interface ExecutionContext extends ExecutionProps {
  theme: DefaultTheme;
}

export interface StyleFunction<Props extends object> {
  (executionContext: ExecutionContext & Props): Interpolation<Props>;
}

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
  // Omit function signature for IStyledComponent in Interpolation so that TS
  // can disambiguate functions as StyleFunction. Note that IStyledComponent is
  // not actually callable, the function signature is just a crutch for JSX,
  // same as React.ExoticComponent.
  // We don't allow component selectors for native.
  | { readonly _sc: symbol }
  | Interpolation<Props>[];

export type Attrs<Props> = ((props: ThemedProps<Props>) => Partial<Props>) | Partial<Props>;

export type RuleSet<Props extends object> = Interpolation<Props>[];

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
    executionContext: Object | null | undefined,
    styleSheet: Object | null | undefined
  ): Interpolation<Props>[];
}

export type FlattenerResult<Props extends object> =
  | RuleSet<Props>
  | number
  | string
  | string[]
  | IStyledComponent<any, any, any>
  | Keyframes;

export interface Stringifier {
  (css: string, selector?: string, prefix?: string, componentId?: string): string[];
  hash: string;
}

export interface ShouldForwardProp<R extends Runtime> {
  (prop: string, elementToBeCreated: StyledTarget<R>): boolean;
}

export interface CommonStatics<R extends Runtime, Props extends object> {
  attrs: Attrs<Props>[];
  target: StyledTarget<R>;
  shouldForwardProp?: ShouldForwardProp<R>;
}

export interface IStyledStatics<R extends Runtime, Props extends object>
  extends CommonStatics<R, Props> {
  componentStyle: R extends 'web' ? ComponentStyle : never;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: R extends 'web' ? string : never;
  inlineStyle: R extends 'native' ? InstanceType<IInlineStyleConstructor<Props>> : never;
  target: StyledTarget<R>;
  styledComponentId: R extends 'web' ? string : never;
  warnTooManyClasses?: R extends 'web' ? ReturnType<typeof createWarnTooManyClasses> : never;
}

// Any prop that has a default prop becomes optional, but its type is unchanged
// Undeclared default props are augmented into the resulting allowable attributes
// If declared props have indexed properties, ignore default props entirely as keyof gets widened
// Wrap in an outer-level conditional type to allow distribution over props that are unions
type Defaultize<P, D> = P extends any
  ? string extends keyof P
    ? P
    : PickU<P, Exclude<keyof P, keyof D>> &
      Partial<PickU<P, Extract<keyof P, keyof D>>> &
      Partial<PickU<D, Exclude<keyof D, keyof P>>>
  : never;

type ReactDefaultizedProps<C, P> = C extends { defaultProps: infer D } ? Defaultize<P, D> : P;

type MakeAttrsOptional<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OtherProps extends object,
  AttrProps extends keyof Props,
  Props = Target extends keyof JSX.IntrinsicElements | React.ComponentType<any> ? React.ComponentPropsWithRef<Target> : {},
> =
  // Distribute unions early to avoid quadratic expansion
  Props extends any
    ? OmitU<ReactDefaultizedProps<Target, Props> & OtherProps, AttrProps> &
      Partial<PickU<Props & OtherProps, AttrProps>>
    : never;

export type StyledComponentProps<
  R extends Runtime,
  // The Component from whose props are derived
  Target extends StyledTarget<R>,
  // The other props added by the template
  OtherProps extends object,
  // The props that are made optional by .attrs
  AttrProps extends keyof any
> =
  // Distribute O if O is a union type
  OtherProps extends object
    ? MakeAttrsOptional<R, Target, OtherProps, AttrProps> & { theme?: DefaultTheme | undefined }
    : never;

type StyledComponentPropsWithAs<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OtherProps extends object,
  AttrProps extends keyof any,
  AsC extends StyledTarget<R> = Target
> = StyledComponentProps<R, Target, OtherProps, AttrProps> & { as?: AsC | undefined; forwardedAs?: AsC | undefined };

export interface ThemeProps {
  theme: DefaultTheme;
}
export type ThemedProps<Props> = Props & ThemeProps;

export interface IStyledComponent<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OtherProps extends object = {},
  AttrProps extends keyof any = never
> extends IStyledStatics<R, StyledComponentProps<R, Target, OtherProps, AttrProps>> {
  (
    props: StyledComponentProps<R, Target, OtherProps, AttrProps> & { as?: never | undefined; forwardedAs?: never | undefined }
  ): React.ReactElement<StyledComponentProps<R, Target, OtherProps, AttrProps>>;

  <AsC extends StyledTarget<R> = Target>(
    props: StyledComponentPropsWithAs<R, AsC, OtherProps, AttrProps, AsC>
  ): React.ReactElement<StyledComponentPropsWithAs<R, AsC, OtherProps, AttrProps, AsC>>;

  displayName?: string;
  defaultProps?: Partial<StyledComponentProps<R, Target, OtherProps, AttrProps>>;
  toString: () => string;

  // Branding
  readonly _sc: symbol;
}

// corresponds to createStyledComponent
export interface IStyledComponentFactory<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OtherProps extends object = {},
  AttrProps extends keyof any = never,
  OtherStatics extends object = {}
> {
  <Statics extends object = {}>(
    target: Target,
    options: StyledOptions<R, StyledComponentProps<R, Target, OtherProps, AttrProps>>,
    rules: RuleSet<StyledComponentProps<R, Target, OtherProps, AttrProps>>
  ): IStyledComponent<R, Target, OtherProps, AttrProps> & OtherStatics & Statics;
}

export interface IInlineStyleConstructor<Props extends object> {
  new (rules: RuleSet<Props>): IInlineStyle<Props>;
}

export interface IInlineStyle<Props extends object> {
  rules: RuleSet<Props>;
  generateStyleObject(executionContext: Object): Object;
}

export interface StyledObject<Props extends object> {
  [key: string]: string | number | StyleFunction<Props> | StyledObject<Props> | undefined;
}
// uncomment when we can eventually override index signatures with more specific types
// [K in keyof CSS.Properties]: CSS.Properties[K] | ((...any: any[]) => CSS.Properties[K]);

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
export type CSSProp = Interpolation<any> | Interpolation<any>[];

// Prevents TypeScript from inferring generic argument
export type NoInfer<T> = [T][T extends any ? 0 : never];

// Pick that distributes over union types
export type PickU<T, K extends keyof T> = T extends any ? {[P in K]: T[P]} : never;
export type OmitU<T, K extends keyof T> = T extends any ? PickU<T, Exclude<keyof T, K>> : never;

// IStyledComponent with either AttrProps generic arg set to "any" or "never"
export type AnyStyledComponent<R extends Runtime> = IStyledComponent<R, any, any, any> | IStyledComponent<R, any, any>;

// Helper types for inferring inner component generic args
export type StyledComponentInnerComponent<R extends Runtime, Target extends StyledTarget<R>> =
  Target extends IStyledComponent<R, infer I, any, any>
  ? I
  : Target extends IStyledComponent<R, infer I, any>
    ? I
    : Target;

export type StyledComponentInnerOtherProps<R extends Runtime, Target extends AnyStyledComponent<R>> =
  Target extends IStyledComponent<R, any, infer OtherProps, any>
    ? OtherProps
    : Target extends IStyledComponent<R, any, infer OtherProps>
      ? OtherProps
      : never;

export type StyledComponentInnerAttrs<R extends Runtime, Target extends AnyStyledComponent<R>> =
  Target extends IStyledComponent<R, any, any, infer AttrProps>
    ? AttrProps
    : never;
