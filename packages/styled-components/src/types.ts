import { Component, ComponentType } from 'react';
import ComponentStyle from './models/ComponentStyle';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

export type ExtensibleObject = {
  [key: string]: any;
};

export type Attrs = (props: ExtensibleObject) => ExtensibleObject | ExtensibleObject;

export type Interpolation =
  | ((executionContext: ExtensibleObject) => Interpolation)
  | string
  | ComponentType<any>
  | Interpolation[];

export type RuleSet = Interpolation[];

export type Styles = string[] | Object | ((executionContext: ExtensibleObject) => Interpolation);

export type Target = string | ComponentType<any>;

export type NameGenerator = (hash: number) => string;

export type CSSConstructor = (strings: string[], ...interpolations: Interpolation[]) => RuleSet;
export type StyleSheet = {
  create: Function;
};

export type Flattener = (
  chunks: Interpolation[],
  executionContext: Object | null | undefined,
  styleSheet: Object | null | undefined
) => Interpolation[];

export type Stringifier = {
  hash: string;
};

export type ShouldForwardProp = (prop: string, isValidAttr: (prop: string) => boolean) => boolean;

export interface IStyledStatics {
  attrs: Attrs;
  componentStyle: ComponentStyle;
  displayName: string;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: Array<string>;
  target: Target | IStyledComponent;
  shouldForwardProp?: ShouldForwardProp;
  styledComponentId: string;
  warnTooManyClasses?: ReturnType<typeof createWarnTooManyClasses>;
  withComponent: (tag: Target) => IStyledComponent;
}

export interface IStyledComponent extends Component<any>, IStyledStatics {
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

export interface IStyledNativeComponent extends Component<any>, IStyledNativeStatics {
  defaultProps?: Object;
}
