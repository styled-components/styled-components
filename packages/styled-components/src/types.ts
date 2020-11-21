import * as CSS from 'csstype';
import { ComponentType, ForwardRefExoticComponent } from 'react';
import constructWithOptions from './constructors/constructWithOptions';
import ComponentStyle from './models/ComponentStyle';
import { Theme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

export type ExtensibleObject = {
  [key: string]: any;
  theme?: any;
};

export type Attrs = (props: ExtensibleObject) => ExtensibleObject | ExtensibleObject;

export type Interpolation =
  | ((executionContext: ExtensibleObject) => Interpolation)
  | ExtensibleObject
  | string
  | Keyframe
  | IStyledComponent
  | ComponentType<any>
  | Interpolation[];

export type RuleSet = Interpolation[];

export type Styles = string[] | Object | ((executionContext: ExtensibleObject) => Interpolation);

export type WebTarget = string | ComponentType<any>;
export type NativeTarget = ComponentType<any>;

export type NameGenerator = (hash: number) => string;

export type CSSConstructor = (strings: string[], ...interpolations: Interpolation[]) => RuleSet;
export type StyleSheet = {
  create: Function;
};

export interface Keyframes {
  id: string;
  name: string;
  rules: string;
}

export type Flattener = (
  chunks: Interpolation[],
  executionContext: Object | null | undefined,
  styleSheet: Object | null | undefined
) => Interpolation[];

export type FlattenerResult = RuleSet | string | string[] | IStyledComponent | Keyframes;

export interface Stringifier {
  (css: string, selector?: string, prefix?: string, componentId?: string): string;
  hash: string;
}

export type ShouldForwardProp = (prop: string, isValidAttr: (prop: string) => boolean) => boolean;

interface CommonStatics {
  attrs: Attrs[];
  target: any;
  shouldForwardProp?: ShouldForwardProp;
  withComponent: any;
}

export interface IStyledStatics extends CommonStatics {
  componentStyle: ComponentStyle;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: Array<string>;
  target: WebTarget | IStyledComponent;
  styledComponentId: string;
  warnTooManyClasses?: ReturnType<typeof createWarnTooManyClasses>;
  withComponent: (tag: WebTarget) => IStyledComponent;
}

export interface IStyledComponent
  extends ForwardRefExoticComponent<ExtensibleObject & { theme?: Theme }>,
    IStyledStatics {
  defaultProps?: Object;
  toString: () => string;
}

export interface IStyledNativeStatics extends CommonStatics {
  inlineStyle: InstanceType<IInlineStyleConstructor>;
  target: NativeTarget | IStyledNativeComponent;
  withComponent: (tag: NativeTarget) => IStyledNativeComponent;
}

export interface IStyledNativeComponent
  extends ForwardRefExoticComponent<ExtensibleObject & { theme?: Theme }>,
    IStyledNativeStatics {
  defaultProps?: Object;
}

export interface IInlineStyleConstructor {
  new (rules: RuleSet): IInlineStyle;
}

export interface IInlineStyle {
  rules: RuleSet;
  generateStyleObject(executionContext: Object): Object;
}

export type StyledTarget = IStyledComponent['target'] | IStyledNativeComponent['target'];

export type StyledTemplateFunction = ReturnType<typeof constructWithOptions>;

type StyledElementShortcuts = {
  [key in keyof JSX.IntrinsicElements]?: StyledTemplateFunction;
};

export interface Styled extends StyledElementShortcuts {
  (tag: WebTarget): StyledTemplateFunction;
}

export type StyledObject = CSS.Properties & {
  [key: string]: StyledObject;
};
