import React from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';
interface ExoticComponentWithDisplayName<P = any> extends React.ExoticComponent<P> {
    defaultProps?: Partial<P>;
    displayName?: string;
}
export declare type OmitNever<T> = {
    [K in keyof T as T[K] extends never ? never : K]: T[K];
};
export declare type Runtime = 'web' | 'native';
export { DefaultTheme };
export declare type AnyComponent<P = any> = ExoticComponentWithDisplayName<P> | React.ComponentType<P>;
export declare type KnownTarget = keyof JSX.IntrinsicElements | AnyComponent;
export declare type WebTarget = string | KnownTarget;
export declare type NativeTarget = AnyComponent;
export declare type StyledTarget<R extends Runtime> = R extends 'web' ? WebTarget : NativeTarget;
export interface StyledOptions<R extends Runtime, Props extends object> {
    attrs?: AttrsArg<Props>[];
    componentId?: R extends 'web' ? string : never;
    displayName?: string;
    parentComponentId?: R extends 'web' ? string : never;
    shouldForwardProp?: ShouldForwardProp<R>;
}
export declare type Dict<T> = {
    [key: string]: T;
};
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
export declare type Interpolation<Props extends object> = StyleFunction<Props> | StyledObject<Props> | TemplateStringsArray | string | number | false | undefined | null | Keyframes | IStyledComponent<'web', any, any> | Interpolation<Props>[];
export declare type AttrsArg<Props extends object> = (Omit<ExecutionProps, keyof Props> & Props) | ((props: Omit<ExecutionContext, keyof Props> & Props) => Partial<Props>);
export declare type Attrs = object | ((...args: any) => object);
export declare type RuleSet<Props extends object> = Interpolation<Props>[];
export declare type Styles<Props extends object> = TemplateStringsArray | StyledObject<Props> | StyleFunction<Props>;
export declare type NameGenerator = (hash: number) => string;
export interface StyleSheet {
    create: Function;
}
export interface Keyframes {
    id: string;
    name: string;
    rules: string;
}
export interface Flattener<Props extends object> {
    (chunks: Interpolation<Props>[], executionContext: Object | null | undefined, styleSheet: Object | null | undefined): Interpolation<Props>[];
}
export declare type FlattenerResult<Props extends object> = RuleSet<Props> | number | string | string[] | IStyledComponent<'web', any, any> | Keyframes;
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
export interface IStyledStatics<R extends Runtime, OuterProps extends object> extends CommonStatics<R, OuterProps> {
    componentStyle: R extends 'web' ? ComponentStyle : never;
    foldedComponentIds: R extends 'web' ? Array<string> : never;
    inlineStyle: R extends 'native' ? InstanceType<IInlineStyleConstructor<OuterProps>> : never;
    target: StyledTarget<R>;
    styledComponentId: R extends 'web' ? string : never;
    warnTooManyClasses?: R extends 'web' ? ReturnType<typeof createWarnTooManyClasses> : never;
}
/**
 * Used by PolymorphicComponent to define prop override cascading order.
 */
export declare type PolymorphicComponentProps<R extends Runtime, E extends StyledTarget<R>, P extends object> = Omit<E extends KnownTarget ? P & Omit<React.ComponentPropsWithRef<E>, keyof P> : P, 'as' | 'theme'> & {
    as?: P extends {
        as?: string | AnyComponent;
    } ? P['as'] : E;
    theme?: DefaultTheme;
};
/**
 * This type forms the signature for a forwardRef-enabled component that accepts
 * the "as" prop to dynamically change the underlying rendered JSX. The interface will
 * automatically attempt to extract props from the given rendering target to
 * get proper typing for any specialized props in the target component.
 */
export interface PolymorphicComponent<R extends Runtime, P extends object, FallbackComponent extends StyledTarget<R>> extends React.ForwardRefExoticComponent<object> {
    <E extends StyledTarget<R> = FallbackComponent>(props: PolymorphicComponentProps<R, E, P>): React.ReactElement | null;
}
export interface IStyledComponent<R extends Runtime, Target extends StyledTarget<R>, Props extends object> extends PolymorphicComponent<R, Props, Target>, IStyledStatics<R, Props> {
    defaultProps?: Partial<(Target extends KnownTarget ? ExecutionProps & Omit<React.ComponentProps<Target>, keyof ExecutionProps> : ExecutionProps) & Props>;
    toString: () => string;
}
export interface IStyledComponentFactory<R extends Runtime, Target extends StyledTarget<R>, OuterProps extends object, OuterStatics extends object = object> {
    <Props extends object = object, Statics extends object = object>(target: Target, options: StyledOptions<R, OuterProps & Props>, rules: RuleSet<OuterProps & Props>): IStyledComponent<R, Target, OuterProps & Props> & OuterStatics & Statics;
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
export declare type CSSProp = string | StyledObject<any> | StyleFunction<any>;
