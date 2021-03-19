// @flow
import type { Component, ComponentType } from 'react';
import ComponentStyle from './models/ComponentStyle';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

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
  (rules: string, selector: string, prefix: ?string, componentId: ?string): string,
  hash: string,
};

export type ShouldForwardProp = (
  prop: string,
  isValidAttr: (prop: string) => boolean,
  elementToBeCreated: Target
) => boolean;

export interface IStyledStatics {
  attrs: Attrs;
  componentStyle: ComponentStyle;
  displayName: string; // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: Array<string>;
  target: Target | IStyledComponent;
  shouldForwardProp?: ShouldForwardProp;
  styledComponentId: string;
  warnTooManyClasses?: $Call<typeof createWarnTooManyClasses, string, string>;
  withComponent: (tag: Target) => IStyledComponent;
}

export interface IStyledComponent extends Component<*>, IStyledStatics {
  defaultProps?: Object;
  toString: () => string;
}

export interface IInlineStyle {
  constructor(rules: RuleSet): void;
  rules: RuleSet;
  generateStyleObject(executionContext: Object): Object;
}

export interface IStyledNativeStatics {
  attrs: Attrs;
  inlineStyle: IInlineStyle;
  displayName: string;
  target: Target | IStyledNativeComponent;
  shouldForwardProp?: ShouldForwardProp;
  styledComponentId: string;
  withComponent: (tag: Target) => IStyledNativeComponent;
}

export interface IStyledNativeComponent extends Component<*>, IStyledNativeStatics {
  defaultProps?: Object;
}
