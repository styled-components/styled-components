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

export type KnownTarget = React.ElementType | AnyComponent;

export type AllowedTarget = unknown | KnownTarget;

export type WebTarget =
  | string // allow custom elements, etc.
  | KnownTarget;

export type NativeTarget = AnyComponent;

export type StyledTarget<R extends Runtime> = R extends 'web' ? WebTarget : NativeTarget;
export interface StyledOptions<R extends Runtime, Props extends object> {
  attrs?: AttrsArg<Props>[];
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
  (executionContext: ExecutionContext & Omit<Props, keyof ExecutionContext>): Interpolation<Props>;
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
  | IStyledComponent<'web', any, any>
  | Interpolation<Props>[];

export type AttrsArg<Props extends object> =
  | (Omit<ExecutionProps, keyof Props> & Props)
  | ((props: Omit<ExecutionContext, keyof Props> & Props) => Partial<Props>);

export type Attrs = object | ((...args: any) => object);

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
  | IStyledComponent<'web', any, any>
  | Keyframes;

export interface Stringifier {
  (css: string, selector?: string, prefix?: string, componentId?: string): string[];
  hash: string;
}

export interface ShouldForwardProp<R extends Runtime> {
  (prop: string, elementToBeCreated: StyledTarget<R>): boolean;
}

export interface CommonStatics<R extends Runtime, Props extends object> {
  attrs: AttrsArg<Props>[];
  target: StyledTarget<R>;
  shouldForwardProp?: ShouldForwardProp<R>;
}

export interface IStyledStatics<R extends Runtime, OuterProps extends object>
  extends CommonStatics<R, OuterProps> {
  componentStyle: R extends 'web' ? ComponentStyle : never;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: R extends 'web' ? string : never;
  inlineStyle: R extends 'native' ? InstanceType<IInlineStyleConstructor<OuterProps>> : never;
  target: StyledTarget<R>;
  styledComponentId: R extends 'web' ? string : never;
  warnTooManyClasses?: R extends 'web' ? ReturnType<typeof createWarnTooManyClasses> : never;
}

/**
 * Used by PolymorphicComponent to define prop override cascading order.
 */
export type PolymorphicComponentProps<
  R extends Runtime,
  E extends StyledTarget<R>,
  P extends object,
  Mix extends AllowedTarget
> = WithPolymorphicAttrs<P, E, Mix> &
  P &
  Simplify<GatherElementTypeProps<E>> &
  Simplify<GatherElementTypeProps<Mix>> & {
    theme?: DefaultTheme;
  };

interface WithPolymorphicAttrs<Props, E extends AllowedTarget, Mix extends AllowedTarget> {
  as?: Props extends { as?: KnownTarget } ? Props['as'] : E | E[];
  mix?: Props extends { mix?: KnownTarget } ? Props['mix'] : Mix | Mix[];
}

type GatherElementTypeProps<T> = T extends React.ElementType
  ? Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'mix'>
  : T extends [infer Element, ...infer RestElement]
  ? Spread<GatherElementTypeProps<Element>, GatherElementTypeProps<RestElement>>
  : T extends [infer Element]
  ? GatherElementTypeProps<Element>
  : {};

/****** Type utils from https://github.com/sindresorhus/type-fest ******/

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] };

type Spread<
  FirstType extends Spreadable,
  SecondType extends Spreadable
> = FirstType extends TupleOrArray
  ? SecondType extends TupleOrArray
    ? SpreadTupleOrArray<FirstType, SecondType>
    : Simplify<SpreadObject<FirstType, SecondType>>
  : Simplify<SpreadObject<FirstType, SecondType>>;

type TupleOrArray = readonly [...unknown[]];
type Spreadable = object | TupleOrArray;

type SpreadTupleOrArray<FirstType extends TupleOrArray, SecondType extends TupleOrArray> = Array<
  FirstType[number] | SecondType[number]
>;

type SpreadObject<FirstType extends object, SecondType extends object> = {
  [Key in keyof FirstType]: Key extends keyof SecondType ? FirstType[Key] : FirstType[Key];
} & Pick<SecondType, RequiredKeysOf<SecondType> | Exclude<keyof SecondType, keyof FirstType>>;

type RequiredKeysOf<BaseType extends object> = Exclude<
  {
    [Key in keyof BaseType]: BaseType extends Record<Key, BaseType[Key]> ? Key : never;
  }[keyof BaseType],
  undefined
>;

/****** End of type utils from https://github.com/sindresorhus/type-fest ******/

/**
 * This type forms the signature for a forwardRef-enabled component that accepts
 * the "as" prop to dynamically change the underlying rendered JSX. The interface will
 * automatically attempt to extract props from the given rendering target to
 * get proper typing for any specialized props in the target component.
 */
export interface PolymorphicComponent<
  R extends Runtime,
  P extends object,
  FallbackComponent extends StyledTarget<R>
> extends React.ForwardRefExoticComponent<P> {
  <E extends StyledTarget<R> = FallbackComponent, Mix extends AllowedTarget = E>(
    props: PolymorphicComponentProps<R, E, P, Mix>
  ): React.ReactElement | null;
}

export interface IStyledComponent<
  R extends Runtime,
  Target extends StyledTarget<R>,
  Props extends object
> extends PolymorphicComponent<R, Props, Target>,
    IStyledStatics<R, Props> {
  defaultProps?: Partial<
    (Target extends KnownTarget
      ? ExecutionProps & Omit<GatherElementTypeProps<Target>, keyof ExecutionProps>
      : ExecutionProps) &
      Props
  >;
  toString: () => string;
}

// corresponds to createStyledComponent
export interface IStyledComponentFactory<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OuterProps extends object,
  OuterStatics extends object = object
> {
  <Props extends object = object, Statics extends object = object>(
    target: Target,
    options: StyledOptions<R, OuterProps & Props>,
    rules: RuleSet<OuterProps & Props>
  ): IStyledComponent<R, Target, OuterProps & Props> & OuterStatics & Statics;
}

export interface IInlineStyleConstructor<Props extends object> {
  new (rules: RuleSet<Props>): IInlineStyle<Props>;
}

export interface IInlineStyle<Props extends object> {
  rules: RuleSet<Props>;
  generateStyleObject(executionContext: Object): Object;
}

export interface StyledObject<Props extends object> {
  [key: string]: Dict<any> | string | number | StyleFunction<Props> | StyledObject<Props>;
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
export type CSSProp = string | StyledObject<any> | StyleFunction<any>;
