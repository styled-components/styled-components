// @flow
import type { ComponentType } from 'react';

export type Interpolation =
  | ((executionContext: Object) => Interpolation)
  | string
  | ComponentType<*>
  | Array<Interpolation>;

export type RuleSet = Array<Interpolation>;

export type Styles = Array<string> | Object | ((executionContext: Object) => Interpolation);

export type Target = string | ComponentType<*>;

export type NameGenerator = (hash: number) => string;

export type CSSConstructor = (
  strings: Array<string>,
  ...interpolations: Array<Interpolation>
) => RuleSet;
export type StyleSheet = {
  create: Function,
};

export type Flattener = (
  chunks: Array<Interpolation>,
  executionContext: ?Object,
  styleSheet: ?Object
) => Array<Interpolation>;

export type Stringifier = (
  rules: Array<Interpolation>,
  selector: ?string,
  prefix: ?string
) => Array<string>;

export type Attr = {
  [x: string]: (props: Object) => any | Object,
};

export type Context = Object;
export type AttrsResolver = (context: Context) => Object;
export type Attrs = Attr | AttrsResolver;

export type ConstructorOptions = {
  attrs?: AttrsResolver,
  displayName?: string,
  componentId?: string,
  parentComponentId?: string,
  ParentComponent?: ComponentType<*>,

  /**
   * A special flag which tells whether a component is instantiated with
   * static attributes or not (attrs-factory function).
   */
  withStaticAttrs: boolean,
};
