declare global {
  interface Window {
    '__styled-components-init__'?: number;
  }
}

declare module '@emotion/unitless' {
  export default {} as { [key: string]: boolean };
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
    shorthandBlacklist?: string[]
  ): Style;
}
