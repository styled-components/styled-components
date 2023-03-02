import React from 'react';
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
export interface DefaultTheme {
    [key: string]: any;
}
declare type ThemeFn = (outerTheme?: DefaultTheme) => DefaultTheme;
declare type ThemeArgument = DefaultTheme | ThemeFn;
declare type Props = {
    children?: React.ReactNode;
    theme: ThemeArgument;
};
export declare const ThemeContext: React.Context<DefaultTheme | undefined>;
export declare const ThemeConsumer: React.Consumer<DefaultTheme | undefined>;
/**
 * Provide a theme to an entire react component tree via context
 */
export default function ThemeProvider(props: Props): JSX.Element | null;
export {};
