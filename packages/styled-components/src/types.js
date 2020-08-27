// @flow
import type { ComponentType } from 'react';

export type Attrs = Array<Function>;

export type Interpolation =
  | ((executionContext: Object) => Interpolation)
  | string
  | ComponentType<*>
  | Interpolation[];

export type RuleSet = Interpolation[];

export type Styles = string[] | Object | ((executionContext: Object) => Interpolation);

export type Target = string | ComponentType<*>;

export type NameGenerator = (hash: number) => string;

export type CSSConstructor = (strings: string[], ...interpolations: Interpolation[]) => RuleSet;
export type StyleSheet = {
  create: Function,
};

export type Flattener = (
  chunks: Interpolation[],
  executionContext: ?Object,
  styleSheet: ?Object
) => Interpolation[];

export type Stringifier = {
  (rules: string, selector: string, prefix: ?string, componentId: ?string): string[],
  hash: string,
};
