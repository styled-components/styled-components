import * as React from "react";
import { StatelessComponent, ComponentClass, PureComponent, ReactElement } from "react";

import { HTMLTags, SVGTags } from "./tags";

type Component<P> = ComponentClass<P> | StatelessComponent<P>;

export interface ThemeProps<T> {
  theme: T;
}

export type ThemedStyledProps<P, T> = P & ThemeProps<T>;
export type StyledProps<P> = ThemedStyledProps<P, any>;

export type ThemedOuterStyledProps<P, T> = P & {
  theme?: T;
  innerRef?: (instance: any) => void;
};
export type OuterStyledProps<P> = ThemedOuterStyledProps<P, any>;

export type Interpolation<P> = FlattenInterpolation<P> | ReadonlyArray<FlattenInterpolation<P> | ReadonlyArray<FlattenInterpolation<P>>>;
export type FlattenInterpolation<P> = InterpolationValue | InterpolationFunction<P>;
export type InterpolationValue = string | number | StyledComponentClass<any, any>;
export type SimpleInterpolation = InterpolationValue | ReadonlyArray<InterpolationValue | ReadonlyArray<InterpolationValue>>;
export interface InterpolationFunction<P> {
  (props: P): Interpolation<P>;
}

type Attrs<P, A extends Partial<P>, T> = {
  [K in keyof A]: ((props: ThemedStyledProps<P, T>) => A[K]) | A[K];
};

export interface StyledComponentClass<P, T, O = P> extends ComponentClass<ThemedOuterStyledProps<O, T>> {
  extend: ThemedStyledFunction<P, T, O>;

  withComponent<K extends keyof HTMLTags>(tag: K): StyledComponentClass<React.HTMLProps<HTMLTags[K]>, T, O>;
  withComponent<K extends keyof SVGTags>(tag: K): StyledComponentClass<React.SVGAttributes<SVGTags[K]>, T, O>;
  withComponent(element: ComponentClass<P>): StyledComponentClass<P, T, O>;
}

export interface ThemedStyledFunction<P, T, O = P> {
  (strings: TemplateStringsArray, ...interpolations: Interpolation<ThemedStyledProps<P, T>>[]): StyledComponentClass<P, T, O>;
  <U>(strings: TemplateStringsArray, ...interpolations: Interpolation<ThemedStyledProps<P & U, T>>[]): StyledComponentClass<P & U, T, O & U>;
  attrs<U, A extends Partial<P & U> = {}>(attrs: Attrs<P & U, A, T>): ThemedStyledFunction<P & A & U, T, O & U>;
}

export type StyledFunction<P> = ThemedStyledFunction<P, any>;

export type ThemedHtmlStyledFunction<E, T> = ThemedStyledFunction<React.HTMLProps<E>, T>;
export type HtmlStyledFunction<E> = ThemedHtmlStyledFunction<E, any>;

export type ThemedSvgStyledFunction<E extends SVGElement, T> = ThemedStyledFunction<React.SVGAttributes<E>, T>;
export type SvgStyledFunction<E extends SVGElement> = ThemedSvgStyledFunction<E, any>;

type ThemedStyledComponentFactoriesHTML<T> = {
    [K in keyof HTMLTags]: ThemedHtmlStyledFunction<HTMLTags[K], T>;
};

type ThemedStyledComponentFactoriesSVG<T> = {
    [K in keyof SVGTags]: ThemedSvgStyledFunction<SVGTags[K], T>;
};

type ThemedStyledComponentFactories<T> = ThemedStyledComponentFactoriesHTML<T> & ThemedStyledComponentFactoriesSVG<T>;

export interface ThemedBaseStyledInterface<T> extends ThemedStyledComponentFactories<T> {
  <P extends { theme?: T; }>(component: Component<P>): ThemedStyledFunction<P, T, WithOptionalTheme<P, T>>;
  <P>(component: Component<P>): ThemedStyledFunction<P, T>;
}
export type BaseStyledInterface = ThemedBaseStyledInterface<any>;

export type ThemedStyledInterface<T> = ThemedBaseStyledInterface<T>;
export type StyledInterface = ThemedStyledInterface<any>;

export interface ThemeProviderProps<T> {
  theme?: T | ((theme: T) => T);
}
export type ThemeProviderComponent<T> = ComponentClass<ThemeProviderProps<T>>;

export interface ThemedCssFunction<T> {
  (strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): InterpolationValue[];
  <P>(strings: TemplateStringsArray, ...interpolations: Interpolation<ThemedStyledProps<P, T>>[]): FlattenInterpolation<ThemedStyledProps<P, T>>[];
}

// Helper type operators
type Diff<T extends string, U extends string> = ({ [P in T]: P } & { [P in U]: never } & { [x: string]: never })[T];
type Omit<T, K extends keyof T> = Pick<T, Diff<keyof T, K>>;
type WithOptionalTheme<P extends { theme?: T; }, T> = Omit<P, "theme"> & { theme?: T; };

export interface ThemedStyledComponentsModule<T> {
  default: ThemedStyledInterface<T>;

  css: ThemedCssFunction<T>;
  keyframes(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): string;
  injectGlobal(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): void;
  withTheme<P extends { theme?: T; }>(component: Component<P>): ComponentClass<WithOptionalTheme<P, T>>;

  ThemeProvider: ThemeProviderComponent<T>;
}

declare const styled: StyledInterface;

export const css: ThemedCssFunction<any>;
export function withTheme<P extends { theme?: T; }, T>(component: Component<P>): ComponentClass<WithOptionalTheme<P, T>>;

export function keyframes(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): string;
export function injectGlobal(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): void;

export const ThemeProvider: ThemeProviderComponent<object>;

interface StylesheetComponentProps {
  sheet: ServerStyleSheet;
}

export class StyleSheetManager extends React.Component<StylesheetComponentProps, {}> { }

export class ServerStyleSheet {
  collectStyles(tree: React.ReactNode): ReactElement<StylesheetComponentProps>;

  getStyleTags(): string;
  getStyleElement(): ReactElement<{}>[];
}

export default styled;
