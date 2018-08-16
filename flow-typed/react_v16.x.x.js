// from https://github.com/facebook/flow/pull/6510

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * A UI node that can be rendered by React. React can render most primitives in
 * addition to elements and arrays of nodes.
 */
declare type React$Node =
  | void
  | null
  | boolean
  | number
  | string
  | React$Element<any>
  | React$Portal
  | Iterable<React$Node>

/**
 * Base class of ES6 React classes, modeled as a polymorphic class whose main
 * type parameters are Props and State.
 */
declare class React$Component<Props, State = void> {
  // fields

  props: Props;
  state: State;

  // action methods

  setState(
    partialState: $Shape<State> | ((State, Props) => $Shape<State> | void),
    callback?: () => mixed
  ): void;

  forceUpdate(callback?: () => void): void;

  // lifecycle methods

  constructor(props?: Props, context?: any): void;
  render(): React$Node;
  componentWillMount(): mixed;
  UNSAFE_componentWillMount(): mixed;
  componentDidMount(): mixed;
  componentWillReceiveProps(nextProps: Props, nextContext: any): mixed;
  UNSAFE_componentWillReceiveProps(nextProps: Props, nextContext: any): mixed;
  shouldComponentUpdate(
    nextProps: Props,
    nextState: State,
    nextContext: any
  ): boolean;
  componentWillUpdate(
    nextProps: Props,
    nextState: State,
    nextContext: any
  ): mixed;
  UNSAFE_componentWillUpdate(
    nextProps: Props,
    nextState: State,
    nextContext: any
  ): mixed;
  componentDidUpdate(
    prevProps: Props,
    prevState: State,
    prevContext: any
  ): mixed;
  componentWillUnmount(): mixed;
  componentDidCatch(
    error: Error,
    info: {
      componentStack: string,
    }
  ): mixed;

  // long tail of other stuff not modeled very well

  refs: any;
  context: any;
  getChildContext(): any;
  static displayName?: ?string;
  static childContextTypes: any;
  static contextTypes: any;
  static propTypes: $Subtype<{ [_: $Keys<Props>]: any }>;

  // We don't add a type for `defaultProps` so that its type may be entirely
  // inferred when we diff the type for `defaultProps` with `Props`. Otherwise
  // the user would need to define a type (which would be redundant) to override
  // the type we provide here in the base class.
  //
  // static defaultProps: $Shape<Props>;
}

declare class React$PureComponent<Props, State = void> extends React$Component<
  Props,
  State
> {
  // TODO: Due to bugs in Flow's handling of React.createClass, some fields
  // already declared in the base class need to be redeclared below. Ideally
  // they should simply be inherited.

  props: Props;
  state: State;
}

/**
 * Base class of legacy React classes, which extends the base class of ES6 React
 * classes and supports additional methods.
 */
declare class LegacyReactComponent<Props, State> extends React$Component<
  Props,
  State
> {
  // additional methods

  replaceState(state: State, callback?: () => void): void;

  isMounted(): boolean;

  // TODO: Due to bugs in Flow's handling of React.createClass, some fields
  // already declared in the base class need to be redeclared below. Ideally
  // they should simply be inherited.

  props: Props;
  state: State;
}

/**
 * The type of a stateless functional component. In most cases these components
 * are a single function. However, they may have some static properties that we
 * can type check.
 */
declare type React$StatelessFunctionalComponent<Props> = {
  (props: Props, context: any): React$Node,
  displayName?: ?string,
  propTypes?: $Subtype<{ [_: $Keys<Props>]: any }>,
  contextTypes?: any,
}

/**
 * The type of a component in React. A React component may be a:
 *
 * - Stateless functional components. Functions that take in props as an
 *   argument and return a React node.
 * - ES6 class component. Components with state defined either using the ES6
 *   class syntax, or with the legacy `React.createClass()` helper.
 */
declare type React$ComponentType<Props> =
  | React$StatelessFunctionalComponent<Props>
  | Class<React$Component<Props, any>>

/**
 * The type of an element in React. A React element may be a:
 *
 * - String. These elements are intrinsics that depend on the React renderer
 *   implementation.
 * - React component. See `ComponentType` for more information about its
 *   different variants.
 */
declare type React$ElementType =
  | string
  | React$StatelessFunctionalComponent<any>
  | Class<React$Component<any, any>>

/**
 * Type of a React element. React elements are commonly created using JSX
 * literals, which desugar to React.createElement calls (see below).
 */
declare type React$Element<+ElementType: React$ElementType> = {|
  +type: ElementType,
  +props: React$ElementProps<ElementType>,
  +key: React$Key | null,
  +ref: any,
|}

/**
 * The type of the key that React uses to determine where items in a new list
 * have moved.
 */
declare type React$Key = string | number

/**
 * The type of the ref prop available on all React components.
 */
declare type React$Ref<ElementType: React$ElementType> =
  | { current: React$ElementRef<ElementType> | null }
  | ((React$ElementRef<ElementType> | null) => mixed)
  | string

/**
 * The type of a React Context.  React Contexts are created by calling
 * createContext() with a default value.
 */
declare type React$Context<T> = {
  Provider: React$ComponentType<{ value: T, children?: React$Node }>,
  Consumer: React$ComponentType<{ children: (value: T) => React$Node }>,
}

/**
 * A React portal node. The implementation of the portal node is hidden to React
 * users so we use an opaque type.
 */
declare opaque type React$Portal

declare module react {
  declare export var DOM: any
  declare export var PropTypes: ReactPropTypes
  declare export var version: string

  declare export function checkPropTypes<V>(
    propTypes: $Subtype<{ [_: $Keys<V>]: ReactPropsCheckType }>,
    values: V,
    location: string,
    componentName: string,
    getStack: ?() => ?string
  ): void

  declare export var createClass: React$CreateClass
  declare export function createContext<T>(defaultValue: T): React$Context<T>
  declare export var createElement: React$CreateElement
  declare export var cloneElement: React$CloneElement
  declare export function createFactory<ElementType: React$ElementType>(
    type: ElementType
  ): React$ElementFactory<ElementType>
  declare export function createRef<ElementType: React$ElementType>(): {
    current: null | React$ElementRef<ElementType>,
  }
  declare export function forwardRef<Props, ElementType: React$ElementType>(
    render: (props: Props, ref: React$Ref<ElementType>) => React$Node
  ): React$ComponentType<Props>

  declare export function isValidElement(element: any): boolean

  declare export var Component: typeof React$Component
  declare export var PureComponent: typeof React$PureComponent
  declare export type StatelessFunctionalComponent<
    P
  > = React$StatelessFunctionalComponent<P>
  declare export type ComponentType<P> = React$ComponentType<P>
  declare export type ElementType = React$ElementType
  declare export type Element<+C> = React$Element<C>
  declare export var Fragment: ({ children: React$Node }) => React$Node
  declare export type Key = React$Key
  declare export type Ref<C> = React$Ref<C>
  declare export type Node = React$Node
  declare export type Context<T> = React$Context<T>
  declare export type Portal = React$Portal

  declare export type ElementProps<C> = React$ElementProps<C>
  declare export type ElementConfig<C> = React$ElementConfig<C>
  declare export type ElementRef<C> = React$ElementRef<C>

  declare export type ChildrenArray<+T> = $ReadOnlyArray<ChildrenArray<T>> | T
  declare export var Children: {
    map<T, U>(
      children: ChildrenArray<T>,
      fn: (child: $NonMaybeType<T>, index: number) => U,
      thisArg?: mixed
    ): Array<$NonMaybeType<U>>,
    forEach<T>(
      children: ChildrenArray<T>,
      fn: (child: T, index: number) => mixed,
      thisArg?: mixed
    ): void,
    count(children: ChildrenArray<any>): number,
    only<T>(children: ChildrenArray<T>): $NonMaybeType<T>,
    toArray<T>(children: ChildrenArray<T>): Array<$NonMaybeType<T>>,
  }

  declare export default {|
    +DOM: typeof DOM,
    +PropTypes: typeof PropTypes,
    +version: typeof version,
    +checkPropTypes: typeof checkPropTypes,
    +createClass: typeof createClass,
    +createContext: typeof createContext,
    +createElement: typeof createElement,
    +cloneElement: typeof cloneElement,
    +createFactory: typeof createFactory,
    +createRef: typeof createRef,
    +forwardRef: typeof forwardRef,
    +isValidElement: typeof isValidElement,
    +Component: typeof Component,
    +PureComponent: typeof PureComponent,
    +Fragment: typeof Fragment,
    +Children: typeof Children,
  |}
}

// TODO Delete this once https://github.com/facebook/react/pull/3031 lands
// and "react" becomes the standard name for this module
declare module React {
  declare module.exports: $Exports<'react'>
}

type ReactPropsCheckType = (
  props: any,
  propName: string,
  componentName: string,
  href?: string
) => ?Error

type ReactPropsChainableTypeChecker = {
  isRequired: ReactPropsCheckType,
  (props: any, propName: string, componentName: string, href?: string): ?Error,
}

type React$PropTypes$arrayOf = (
  typeChecker: ReactPropsCheckType
) => ReactPropsChainableTypeChecker
type React$PropTypes$instanceOf = (
  expectedClass: any
) => ReactPropsChainableTypeChecker
type React$PropTypes$objectOf = (
  typeChecker: ReactPropsCheckType
) => ReactPropsChainableTypeChecker
type React$PropTypes$oneOf = (
  expectedValues: Array<any>
) => ReactPropsChainableTypeChecker
type React$PropTypes$oneOfType = (
  arrayOfTypeCheckers: Array<ReactPropsCheckType>
) => ReactPropsChainableTypeChecker
type React$PropTypes$shape = (shapeTypes: {
  [key: string]: ReactPropsCheckType,
}) => ReactPropsChainableTypeChecker

type ReactPropTypes = {
  array: React$PropType$Primitive<Array<any>>,
  bool: React$PropType$Primitive<boolean>,
  func: React$PropType$Primitive<Function>,
  number: React$PropType$Primitive<number>,
  object: React$PropType$Primitive<Object>,
  string: React$PropType$Primitive<string>,
  any: React$PropType$Primitive<any>,
  arrayOf: React$PropType$ArrayOf,
  element: React$PropType$Primitive<any> /* TODO */,
  instanceOf: React$PropType$InstanceOf,
  node: React$PropType$Primitive<any> /* TODO */,
  objectOf: React$PropType$ObjectOf,
  oneOf: React$PropType$OneOf,
  oneOfType: React$PropType$OneOfType,
  shape: React$PropType$Shape,
}
