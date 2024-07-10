declare module '@babel/helper-module-imports' {
  import { NodePath, types } from '@babel/core';

  export function addDefault(
    program: NodePath,
    identifier: types.Identifier,
    options: Object
  ): types.Identifier;

  export function addNamed(
    program: NodePath,
    name: string,
    identifier: types.Identifier,
    options: Object
  ): types.Identifier;
}

declare module '@emotion/unitless' {
  export default {} as { [key: string]: boolean };
}

declare module '@emotion/use-insertion-effect-with-fallbacks' {
  export const useInsertionEffectAlwaysWithSyncFallback: (
    effect: React.EffectCallback,
    deps?: React.DependencyList | undefined
  ) => void;
  export const useInsertionEffectWithLayoutFallback: (
    effect: React.EffectCallback,
    deps?: React.DependencyList | undefined
  ) => void;
}

declare module 'babel-plugin-styled-components' {
  export default function ({ types: any }): {
    inherits: any;
    visitor: any;
  };
}

declare module 'css-to-react-native' {
  export type StyleTuple = [string, string];

  export interface Style {
    [key: string]: string | number | Style;
  }

  export function getPropertyName(name: string): string;
  export function getStylesForProperty(
    name: string,
    value: string,
    allowShorthand?: boolean
  ): Style;

  export default function transform(
    styleTuples: StyleTuple[],
    shorthandBlacklist?: string[] | undefined
  ): Style;
}
