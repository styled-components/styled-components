import { ComponentType, ForwardRefExoticComponent } from 'react';
import constructWithOptions from './constructors/constructWithOptions';
import ComponentStyle from './models/ComponentStyle';
import { Theme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';

export type BaseExtensibleObject = {
  [key: string]: any;
};

export type ExtensibleObject = BaseExtensibleObject & {
  theme?: Theme;
};

export type ExecutionContext = BaseExtensibleObject & {
  theme: Theme;
};

export type StyleFunction<Props> = (
  executionContext: ExecutionContext & Props
) => BaseExtensibleObject | string | number;

// Do not add IStyledComponent to this union, it breaks prop function interpolation in TS
export type Interpolation<Props extends Object = ExecutionContext> =
  | StyleFunction<Props>
  | ExtensibleObject
  | string
  | Keyframe
  | Interpolation<Props>[];

export type Attrs<Props = ExecutionContext> =
  | ExtensibleObject
  | ((props: ExecutionContext & Props) => ExecutionContext);
export type RuleSet = Interpolation[];

export type Styles = string[] | Object | ((executionContext: ExecutionContext) => Interpolation);

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

export type ShouldForwardProp = (
  prop: string,
  isValidAttr: (prop: string) => boolean,
  elementToBeCreated?: WebTarget | NativeTarget
) => boolean;

export interface CommonStatics {
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
  extends ForwardRefExoticComponent<ExtensibleObject>,
    IStyledStatics {
  defaultProps?: Object;
  toString: () => string;
}

export type IStyledComponentFactory = (
  target: IStyledComponent['target'],
  options: {
    attrs?: Attrs[];
    componentId: string;
    displayName?: string;
    parentComponentId?: string;
    shouldForwardProp?: ShouldForwardProp;
  },
  rules: RuleSet
) => IStyledComponent;

export interface IStyledNativeStatics extends CommonStatics {
  inlineStyle: InstanceType<IInlineStyleConstructor>;
  target: NativeTarget | IStyledNativeComponent;
  withComponent: (tag: NativeTarget) => IStyledNativeComponent;
}

export interface IStyledNativeComponent
  extends ForwardRefExoticComponent<ExtensibleObject>,
    IStyledNativeStatics {
  defaultProps?: Object;
}

export type IStyledNativeComponentFactory = (
  target: IStyledNativeComponent['target'],
  options: {
    attrs?: Attrs[];
    displayName?: string;
    shouldForwardProp?: ShouldForwardProp;
  },
  rules: RuleSet
) => IStyledNativeComponent;

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

type CSSValue = string | number;

export type StyledObject = {
  [key: string]: StyledObject | CSSValue | ((...any: any[]) => CSSValue);
} & {
  // uncomment when we can eventually override index signatures with more specific types
  // [K in keyof CSS.Properties]: CSS.Properties[K] | ((...any: any[]) => CSS.Properties[K]);
};
