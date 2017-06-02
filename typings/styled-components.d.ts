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
export type InterpolationValue = string | number;
export type SimpleInterpolation = InterpolationValue | ReadonlyArray<InterpolationValue | ReadonlyArray<InterpolationValue>>;
export interface InterpolationFunction<P> {
  (props: P): Interpolation<P>;
}

type WithComponentOverloads<Tags, T> = {
  [K in keyof Tags]: StyledComponentClass<Tags[K], T>;
};

export interface StyledComponentClass<P, T> extends ComponentClass<ThemedOuterStyledProps<P, T>> {
  extend: ThemedStyledFunction<P, T>;

  withComponent<K extends keyof HTMLTags>(tag: K): WithComponentOverloads<HTMLTags, T>[K];
  withComponent<K extends keyof SVGTags>(tag: K): WithComponentOverloads<SVGTags, T>[K];
  withComponent(element: ComponentClass<P>): StyledComponentClass<P, T>;
}

export interface ThemedStyledFunction<P, T> {
  (strings: TemplateStringsArray, ...interpolations: Interpolation<ThemedStyledProps<P, T>>[]): StyledComponentClass<P, T>;
  <U>(strings: TemplateStringsArray, ...interpolations: Interpolation<ThemedStyledProps<P & U, T>>[]): StyledComponentClass<P, T>;
}
export type StyledFunction<P> = ThemedStyledFunction<P, any>;

export type ThemedHtmlStyledFunction<E, T> = ThemedStyledFunction<React.HTMLProps<E>, T>;
export type HtmlStyledFunction<E> = ThemedHtmlStyledFunction<E, any>;

export type ThemedSvgStyledFunction<E extends SVGElement, T> = ThemedStyledFunction<React.SVGAttributes<E>, T>;
export type SvgStyledFunction<E extends SVGElement> = ThemedSvgStyledFunction<E, any>;

type ThemedStyledComponentFactoriesHTML<T> = {
    [K in keyof HTMLTags]: ThemedHtmlStyledFunction<HTMLTags[K], T>;
}

type ThemedStyledComponentFactoriesSVG<T> = {
    [K in keyof SVGTags]: ThemedSvgStyledFunction<SVGTags[K], T>;
}

type ThemedStyledComponentFactories<T> = ThemedStyledComponentFactoriesHTML<T> & ThemedStyledComponentFactoriesHTML<T>;

export interface ThemedBaseStyledInterface<T> extends ThemedStyledComponentFactories<T> {
  <P>(component: Component<P>): ThemedStyledFunction<P, T>;
}
export type BaseStyledInterface = ThemedBaseStyledInterface<any>;

export type ThemedStyledInterface<T> = ThemedBaseStyledInterface<T>;
export type StyledInterface = ThemedStyledInterface<any>;

export type ThemeProviderComponent<T> = ComponentClass<ThemeProps<T>>;

export interface ThemedCssFunction<T> {
  (strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): InterpolationValue[];
  <P>(strings: TemplateStringsArray, ...interpolations: Interpolation<ThemedStyledProps<P, T>>[]): FlattenInterpolation<ThemedStyledProps<P, T>>[];
}

export interface ThemedStyledComponentsModule<T> {
  default: ThemedStyledInterface<T>;

  css: ThemedCssFunction<T>;
  keyframes(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): string;
  injectGlobal(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): void;
  withTheme<P extends { theme?: T; }, T>(component: Component<P>): ComponentClass<P>;

  ThemeProvider: ThemeProviderComponent<T>;
}

declare const styled: StyledInterface;

export const css: ThemedCssFunction<any>;
export function withTheme<P extends { theme?: T; }, T>(component: Component<P>): ComponentClass<P>;

export function keyframes(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): string;
export function injectGlobal(strings: TemplateStringsArray, ...interpolations: SimpleInterpolation[]): void;

export const ThemeProvider: ThemeProviderComponent<any>;

export class StyleSheetManager extends React.Component<{ sheet: ServerStyleSheet }, any> { }

export class ServerStyleSheet {
  collectStyles(children: ReactElement<any>): StyleSheetManager
  collectStyles(tree: any): StyleSheetManager;
  getStyleTags(): string;
  getStyleElement(): ReactElement<any>[]
  static create(): StyleSheet
}

export default styled;
