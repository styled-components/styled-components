import type * as CSS from 'csstype';
import type React from 'react';
import type WebStyle from './models/WebStyle';
import type { DefaultTheme } from './models/ThemeProvider';
import type createWarnTooManyClasses from './utils/createWarnTooManyClasses';
import type { SupportedHTMLElements } from './utils/domElements';

export type { CSS, DefaultTheme, SupportedHTMLElements };

export interface ExoticComponentWithDisplayName<
  P extends BaseObject = {},
> extends React.ExoticComponent<P> {
  displayName?: string | undefined;
}

export type StyledComponentBrand = { readonly _sc: symbol };

export type BaseObject = {};

// from https://stackoverflow.com/a/69852402
export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type FastOmit<T extends BaseObject, U extends string | number | symbol> = {
  [K in keyof T as K extends U ? never : K]: T[K];
};

export type Runtime = 'web' | 'native';

export type AnyComponent<P extends BaseObject = any> =
  | ExoticComponentWithDisplayName<P>
  | React.ComponentType<P>;

export type KnownTarget = SupportedHTMLElements | AnyComponent;

export type WebTarget =
  | (string & {}) // allow custom elements while preserving literal autocomplete
  | KnownTarget;

export type NativeTarget = AnyComponent;

export type StyledTarget<R extends Runtime> = R extends 'web' ? WebTarget : NativeTarget;
export interface StyledOptions<R extends Runtime, Props extends BaseObject> {
  attrs?: Attrs<Props>[] | undefined;
  componentId?: (R extends 'web' ? string : never) | undefined;
  displayName?: string | undefined;
  parentComponentId?: (R extends 'web' ? string : never) | undefined;
  shouldForwardProp?: ShouldForwardProp<R> | undefined;
}

export type Dict<T = any> = { [key: string]: T };

/** Data-attributes helper for `.attrs<DataAttributes>(...)`. */
export type DataAttributes = { [key: `data-${string}`]: any };

export type ExecutionProps = {
  /**
   * Dynamically adjust the rendered component or HTML tag, e.g.
   * ```
   * const StyledButton = styled.button``
   *
   * <StyledButton as="a" href="/foo">
   *   I'm an anchor now
   * </StyledButton>
   * ```
   */
  as?: KnownTarget | undefined;
  forwardedAs?: KnownTarget | undefined;
  theme?: DefaultTheme | undefined;
};

/** `theme` narrowed to required (still `undefined` at runtime in RSC). */
export interface ExecutionContext extends ExecutionProps {
  theme: DefaultTheme;
}

export interface StyleFunction<Props extends BaseObject> {
  (executionContext: ExecutionContext & Props): Interpolation<Props>;
}

export type Interpolation<Props extends BaseObject> =
  | StyleFunction<Props>
  | StyledObject<Props>
  | TemplateStringsArray
  | string
  | number
  | false
  | undefined
  | null
  | Keyframes
  | StyledComponentBrand
  | RuleSet<Props>
  | Interpolation<Props>[];

export type Attrs<Props extends BaseObject = BaseObject> =
  | (ExecutionProps & Partial<OverrideStyle<Props>>)
  | ((props: ExecutionContext & Props) => ExecutionProps & Partial<OverrideStyle<Props>>);

export type RuleSet<Props extends BaseObject = BaseObject> = Interpolation<Props>[];

export type Styles<Props extends BaseObject> =
  | TemplateStringsArray
  | StyledObject<Props>
  | StyleFunction<Props>;

export type NameGenerator = (hash: number) => string;

export interface StyleSheet {
  create: Function;
}

export interface Keyframes {
  id: string;
  name: string;
  rules: string;
}

export interface Flattener<Props extends BaseObject> {
  (
    chunks: Interpolation<Props>[],
    executionContext: object | null | undefined,
    styleSheet: StyleSheet | null | undefined
  ): Interpolation<Props>[];
}

export interface Compiler {
  hash: string;
  /**
   * String-input emit path. Used by callers that have a freshly-built CSS
   * string and a parent selector — keyframes, global styles, and the rare
   * fallback when a `RuleSet` has no construction-time `Source` attached.
   *
   * Wraps the input in `prefix + selector { css }`, runs `normalize +
   * parser + emit-web` with the active plugin set + namespace, and returns
   * the resulting rule strings ready for `insertRules`. Output is
   * byte-identical to v6 stylis output for hash + SSR rehydration
   * stability.
   *
   * `prefix` carries at-rule wrapping (e.g. `'@keyframes'` for keyframe
   * registration). When both `selector` and `prefix` are empty the input
   * is parsed unwrapped (used by `createGlobalStyle`).
   */
  compile: (
    css: string,
    selector?: string | undefined,
    prefix?: string | undefined,
    componentId?: string | undefined
  ) => string[];
  /**
   * Source-input fast emit path. Walks the construction-time AST + filled
   * interpolation values, skipping the per-render `normalize + parse`
   * work `compile` performs against a freshly joined CSS string. Returns
   * `null` only on shape bailouts the fast path doesn't yet cover; callers
   * fall through to `compile` in that case.
   *
   * `fragments` is the parallel side table populated by
   * `evaluateForFastPath` for slots that resolved to a `css\`...\`` fragment.
   * Same plugin set, namespace, and decl/selector transforms feed through;
   * output is byte-equal to `compile` by construction (same parser, same
   * emitter).
   */
  emit: (
    source: import('./parser/source').Source,
    filled: ReadonlyArray<string>,
    parentSelector: string,
    componentId: string,
    fragments?: ReadonlyArray<import('./parser/compile').FastPathFragment | null> | null
  ) => string[] | null;
}

export interface ShouldForwardProp<R extends Runtime> {
  (prop: string, elementToBeCreated: StyledTarget<R>): boolean;
}

export interface CommonStatics<out R extends Runtime, in out Props extends BaseObject> {
  attrs: Attrs<Props>[];
  target: StyledTarget<R>;
  shouldForwardProp?: ShouldForwardProp<R> | undefined;
}

export interface IStyledStatics<
  out R extends Runtime,
  in out OuterProps extends BaseObject,
> extends CommonStatics<R, OuterProps> {
  webStyle: R extends 'web' ? WebStyle : never;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: R extends 'web' ? string : never;
  nativeStyle: R extends 'native' ? InstanceType<INativeStyleConstructor<OuterProps>> : never;
  target: StyledTarget<R>;
  // Web emits a real component id used for class chaining; native uses a
  // boolean sentinel so `isStyledComponent`'s `'styledComponentId' in target`
  // duck check works uniformly across runtimes.
  styledComponentId: R extends 'web' ? string : true;
  warnTooManyClasses?:
    | (R extends 'web' ? ReturnType<typeof createWarnTooManyClasses> : never)
    | undefined;
}

export type PolymorphicComponentProps<
  R extends Runtime,
  BaseProps extends BaseObject,
  AsTarget extends StyledTarget<R> | void,
  ForwardedAsTarget extends StyledTarget<R> | void,
  // props extracted from "as"
  AsTargetProps extends BaseObject = AsTarget extends KnownTarget
    ? React.ComponentPropsWithRef<AsTarget>
    : {},
  // props extracted from "forwardAs"; note that ref is excluded
  ForwardedAsTargetProps extends BaseObject = ForwardedAsTarget extends KnownTarget
    ? React.ComponentPropsWithRef<ForwardedAsTarget>
    : {},
> = OverrideStyle<
  NoInfer<
    FastOmit<
      Substitute<
        BaseProps,
        // "as" wins over "forwardedAs" when it comes to prop interface
        Substitute<ForwardedAsTargetProps, AsTargetProps>
      >,
      keyof ExecutionProps
    >
  > &
    FastOmit<ExecutionProps, 'as' | 'forwardedAs'> & {
      as?: AsTarget;
      forwardedAs?: ForwardedAsTarget;
    }
>;

/**
 * This type forms the signature for a forwardRef-enabled component
 * that accepts the "as" prop to dynamically change the underlying
 * rendered JSX. The interface will automatically attempt to extract
 * props from the given rendering target to get proper typing for
 * any specialized props in the target component.
 */
export interface PolymorphicComponent<
  out R extends Runtime,
  in out BaseProps extends BaseObject,
> extends React.ForwardRefExoticComponent<
  BaseProps & {
    as?: StyledTarget<R> | undefined;
    forwardedAs?: StyledTarget<R> | undefined;
  }
> {
  // Overload for `as` polymorphism. `as` is required here to prevent TS from
  // falling back to the constraint type (`StyledTarget<R>`) which is too wide.
  <AsTarget extends StyledTarget<R>, ForwardedAsTarget extends StyledTarget<R> | void = void>(
    props: PolymorphicComponentProps<R, BaseProps, AsTarget, ForwardedAsTarget> & { as: AsTarget }
  ): React.JSX.Element;

  // Overload for `forwardedAs` polymorphism (without `as`).
  <ForwardedAsTarget extends StyledTarget<R>>(
    props: PolymorphicComponentProps<R, BaseProps, void, ForwardedAsTarget> & {
      forwardedAs: ForwardedAsTarget;
    }
  ): React.JSX.Element;

  // Default overload: avoids Substitute for ref-callback typing under spread (#5687).
  (
    props: OverrideStyle<
      NoInfer<FastOmit<BaseProps, keyof ExecutionProps>> &
        FastOmit<ExecutionProps, 'as' | 'forwardedAs'> & {
          as?: void;
          forwardedAs?: void;
        }
    >
  ): React.JSX.Element;
}

export interface IStyledComponentBase<
  out R extends Runtime,
  in out Props extends BaseObject = BaseObject,
>
  extends PolymorphicComponent<R, Props>, IStyledStatics<R, Props>, StyledComponentBrand {
  toString: () => string;
}

/** Intersected with `string` so styled components can serve as computed object keys. */
export type IStyledComponent<
  R extends Runtime,
  Props extends BaseObject = BaseObject,
> = IStyledComponentBase<R, Props> & string;

export interface IStyledComponentFactory<
  out R extends Runtime,
  in Target extends StyledTarget<R>,
  in out OuterProps extends BaseObject,
  out OuterStatics extends BaseObject = BaseObject,
> {
  <Props extends BaseObject = BaseObject, Statics extends BaseObject = BaseObject>(
    target: Target,
    options: StyledOptions<R, OuterProps & Props>,
    rules: RuleSet<OuterProps & Props>
  ): IStyledComponent<R, Substitute<OuterProps, Props>> & OuterStatics & Statics;
}

export interface INativeStyleConstructor<Props extends BaseObject> {
  new (rules: RuleSet<Props>): INativeStyle<Props>;
}

interface CompileOutput {
  base: object;
  conditional: Array<{
    type: 'media' | 'container' | 'supports' | 'pseudo' | 'attr';
    condition: string;
    containerName?: string;
    attribute?: string;
    attrValue?: string;
    styles: object;
  }>;
  keyframes: Array<{
    name: string;
    frames: Array<{ stops: string[]; decls: Array<[string, string]> }>;
  }>;
}

export interface INativeStyle<Props extends BaseObject> {
  rules: RuleSet<Props>;
  fastEligible: boolean;
  /** Set at construction; null when rules contain function interpolations. */
  staticCompiled: CompileOutput | null;
  compile(executionContext: ExecutionContext & Props): CompileOutput;
}

export type CSSProperties = CSS.Properties<number | (string & {})>;

export type CSSPropertiesWithVars = CSSProperties & {
  [key: `--${string}`]: string | number | undefined;
};

type OverrideStyle<P> = P extends { style?: infer S }
  ? Omit<P, 'style'> & { style?: CSSPropertiesWithVars | (S & {}) }
  : P;

export type CSSPseudos = { [K in CSS.Pseudos]?: CSSObject };

export type CSSKeyframes = object & { [key: string]: CSSObject };

export type CSSObject<Props extends BaseObject = BaseObject> = StyledObject<Props>;

export interface StyledObject<Props extends BaseObject = BaseObject>
  extends CSSProperties, CSSPseudos {
  [key: string]:
    | StyledObject<Props>
    | string
    | number
    | StyleFunction<Props>
    | RuleSet<any>
    | undefined;
}

/**
 * The `css` prop is not declared by default in the types as it would cause `css` to be present
 * on the types of anything that uses styled-components indirectly, even if they do not use the
 * babel plugin.
 *
 * To enable support for the `css` prop in TypeScript, create a `styled-components.d.ts` file in
 * your project source with the following contents:
 *
 * ```ts
 * import type { CSSProp } from "styled-components";
 *
 * declare module "react" {
 *  interface Attributes {
 *    css?: CSSProp;
 *  }
 * }
 * ```
 *
 * In order to get accurate typings for `props.theme` in `css` interpolations, see
 * {@link DefaultTheme}.
 */

export type CSSProp = Interpolation<any>;

/**
 * @deprecated Use the built-in NoInfer from TypeScript 5.4+ directly.
 * Kept for backward compatibility.
 */
export type NoInfer<T> = [T][T extends any ? 0 : never];

export type Substitute<A extends BaseObject, B extends BaseObject> = keyof B extends never
  ? A
  : FastOmit<A, keyof B> & B;

/**
 * Makes keys in K optional while keeping all others required.
 * Used to make attrs-provided props optional on the final component.
 *
 * Single-pass formulation using key-remapping over `keyof P` —
 * required keys (those NOT in K) keep their modifier; the K keys are
 * spliced in from a separate mapped type with `?` applied. Avoids the
 * `FastOmit<P, K> & Partial<Pick<P, K>>` form which builds an
 * intermediate `Pick` type that can blow up TS's complexity budget on
 * deeply-discriminated component prop unions (e.g. antd Button; see
 * #5725).
 */
export type MakeAttrsOptional<P extends BaseObject, K extends keyof any> = [K] extends [never]
  ? P
  : FastOmit<P, K & keyof P> & { [Key in Extract<keyof P, K>]?: P[Key] };

export type InsertionTarget = HTMLElement | ShadowRoot;
