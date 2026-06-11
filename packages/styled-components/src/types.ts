import type * as CSS from 'csstype';
import type React from 'react';
import type WebStyle from './models/WebStyle';
import type { DefaultTheme } from './models/ThemeProvider';
import type { Resolver } from './native/transform/polyfills/resolvers';
import type createWarnTooManyClasses from './utils/createWarnTooManyClasses';
import type { SupportedHTMLElements } from './utils/domElements';

export type { CSS, DefaultTheme, SupportedHTMLElements };

/** Alias retained for backward-compat; prefer `React.NamedExoticComponent` directly. */
export type ExoticComponentWithDisplayName<P extends BaseObject = {}> =
  React.NamedExoticComponent<P>;

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
  | Interpolation<Props>[];

/**
 * Read-and-optionally-consume accessor over the compiled style for the
 * current render. Passed as the second argument to a function-form
 * `attrs(...)` callback, enabling third-party-component bridging where
 * a CSS-style declaration needs to surface as a prop instead (e.g.
 * mapping `color` to `react-native-svg`'s `fill`).
 *
 * Both `pop` and `peek` accept either:
 * - A **CSS property name** (single segment, no dots;e.g. `'color'`,
 *   `'padding'`). Reads from the resolved compiled style; `pop` removes,
 *   `peek` leaves the decl in place. Returns `string | undefined`.
 * - A **typed theme path** (dot-separated;e.g. `'color.red.500'`).
 *   Reads a token out of the active theme. Autocomplete and value-type
 *   inference flow from the augmented `DefaultTheme`. Calling pop/peek
 *   with a theme path opts the attrs callback out of the construction-
 *   time fast path (theme is a render-time input).
 *
 * The `fallback` second argument applies to the CSS-decl form: when the
 * declaration isn't present, `fallback` is returned and the overload
 * narrows to `string` (no `| undefined`).
 */
export interface CompiledAst {
  pop<P extends import('./utils/themePath').ThemeLeafPath<DefaultTheme>>(
    path: P
  ): import('./utils/themePath').ThemeValue<DefaultTheme, P>;
  pop<P extends import('./utils/themePath').ThemeLeafPath<DefaultTheme>>(
    path: P,
    fallback: import('./utils/themePath').ThemeValue<DefaultTheme, P>
  ): import('./utils/themePath').ThemeValue<DefaultTheme, P>;
  pop(key: string): string | undefined;
  pop(key: string, fallback: string): string;
  peek<P extends import('./utils/themePath').ThemeLeafPath<DefaultTheme>>(
    path: P
  ): import('./utils/themePath').ThemeValue<DefaultTheme, P>;
  peek<P extends import('./utils/themePath').ThemeLeafPath<DefaultTheme>>(
    path: P,
    fallback: import('./utils/themePath').ThemeValue<DefaultTheme, P>
  ): import('./utils/themePath').ThemeValue<DefaultTheme, P>;
  peek(key: string): string | undefined;
  peek(key: string, fallback: string): string;
}

/**
 * Attrs accepts a literal bag, an arity-1 callback (`(props) => ...`),
 * or an arity-2 callback (`(props, ast) => ...`). The arity-2 form
 * receives a non-optional `CompiledAst`, so authors don't need to
 * optional-chain when they reach for `ast.pop` / `ast.peek`. Authoring
 * the arity-1 form is just TypeScript's standard fewer-params-allowed
 * rule, no extra union member needed; keeping the union to a single
 * callable preserves contextual typing for `() => ({ as: 'label' })`.
 */
export type Attrs<Props extends BaseObject = BaseObject> =
  | (ExecutionProps & Partial<OverrideStyle<Props>>)
  | ((
      props: ExecutionContext & Props,
      ast: CompiledAst
    ) => ExecutionProps & Partial<OverrideStyle<Props>>);

export type RuleSet<Props extends BaseObject = BaseObject> = Interpolation<Props>[];

export type Styles<Props extends BaseObject> =
  | TemplateStringsArray
  | StyledObject<Props>
  | StyleFunction<Props>;

/** Minimal contract over RN's `StyleSheet` (the `create` method is what the native build calls). */
export interface StyleSheet {
  create: Function;
}

export interface Keyframes {
  id: string;
  name: string;
  rules: string;
}

export interface Compiler {
  hash: string;
  /**
   * String-input emit path. Used by callers that have a freshly-built CSS
   * string and a parent selector (keyframes, global styles, and the rare
   * fallback when a `RuleSet` has no construction-time `Source` attached).
   *
   * Wraps the input in `prefix + selector { css }`, runs `normalize +
   * parser + emit-web` with the active plugin set + namespace, and returns
   * the resulting rule strings ready for `insertRules`. Output is
   * deterministic for a given input so class hashes and SSR rehydration
   * stay stable across renders.
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

/**
 * @deprecated use {@link Compiler}. The v7 compiler shape replaces the v6
 * `Stringifier` function: it carries `hash` plus dedicated `compile` and
 * `emit` entry points instead of a single callable.
 */
export type Stringifier = Compiler;

export interface ShouldForwardProp<R extends Runtime> {
  (prop: string, elementToBeCreated: StyledTarget<R>): boolean;
}

export interface CommonStatics<out R extends Runtime, in out Props extends BaseObject> {
  attrs: Attrs<Props>[];
  target: StyledTarget<R>;
  shouldForwardProp?: ShouldForwardProp<R> | undefined;
  /**
   * Internal: `true` when at least one entry in `attrs` is a function
   * with arity >= 2 (a `(props, ast) => ...` post-compile callback). The
   * render path reads this flag instead of scanning `attrs` per render.
   */
  hasPostAttrs?: boolean | undefined;
  /**
   * Internal: pre-computed plans for arity-2 attrs, aligned in order with
   * the arity-2 entries in `attrs`. Each entry is either a static plan
   * (output bag + popped keys) folded at construction time, or `null` to
   * signal that the render path must invoke the original callback.
   */
  postAttrsPlans?: ReadonlyArray<import('./utils/tracePostAttrs').PostAttrsPlan | null> | undefined;
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
  // Both runtimes emit a unique string id. Web uses it for class chaining;
  // native uses it so `${StyledComp}` interpolations into a css template
  // produce a unique selector token (otherwise multi-component rules would
  // collide on a single sentinel value).
  styledComponentId: string;
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
  > & {
    theme?: DefaultTheme | undefined;
    as?: AsTarget;
    forwardedAs?: ForwardedAsTarget;
  }
>;

/**
 * Signature for a styled component that accepts the `as` prop to dynamically
 * change the underlying rendered JSX. The interface automatically extracts
 * props from the given rendering target to get proper typing for any
 * specialized props in the target component.
 */
export interface PolymorphicComponent<
  out R extends Runtime,
  in out BaseProps extends BaseObject,
> extends React.ForwardRefExoticComponent<
  // FastOmit ahead of the intersection so a wrapped component's own `as` /
  // `forwardedAs` props (e.g. Next.js Link's `as?: Url`) don't intersect with
  // our `WebTarget`-typed versions and produce a conflicting required-shape
  // type (#5734). `React.ComponentProps<typeof StyledComponent>` still
  // surfaces our `as` / `forwardedAs` (the original #5654 fix).
  FastOmit<BaseProps, 'as' | 'forwardedAs'> & {
    as?: StyledTarget<R> | undefined;
    forwardedAs?: StyledTarget<R> | undefined;
  }
> {
  // Default overload (no `as`/`forwardedAs`) is listed first so TypeScript's JSX
  // attribute completion resolves to it for plain `<StyledComponent ... />`
  // usage. The generic overloads below introduce unsolved type parameters that,
  // when visited first, suppress JSX attribute name completions for keys
  // carried by `BaseProps` (#5741). Avoids `Substitute` so ref callbacks get
  // contextual typing even with spread props (#5687). `as` / `forwardedAs` here
  // widen to also accept the wrapped component's own `as` / `forwardedAs` type
  // when present (e.g. Next.js Link's `as?: Url`), so spreading the wrapped
  // component's props onto the styled component remains assignable (#5734).
  (
    props: OverrideStyle<
      NoInfer<FastOmit<BaseProps, keyof ExecutionProps>> & {
        theme?: DefaultTheme | undefined;
        as?: BaseProps extends { as?: infer A } ? A : void;
        forwardedAs?: BaseProps extends { forwardedAs?: infer A } ? A : void;
      }
    >
  ): React.JSX.Element;

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
    type:
      | 'media'
      | 'container'
      | 'supports'
      | 'pseudo'
      | 'attr'
      | 'combinator'
      | 'nthChild'
      | 'has';
    condition: string;
    containerName?: string;
    attribute?: string;
    attrValue?: string;
    combinator?: 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling';
    styles: object;
  }>;
  /** Subset of `conditional` minus pseudo-bearing entries. */
  nonPseudoEntries: Array<{
    type: 'media' | 'container' | 'supports' | 'attr' | 'combinator' | 'nthChild' | 'has';
    condition: string;
    containerName?: string;
    attribute?: string;
    attrValue?: string;
    combinator?: 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling';
    styles: object;
  }>;
  /** Subset of `conditional` containing only pseudo-bearing entries. */
  pseudoEntries: Array<{
    type:
      | 'media'
      | 'container'
      | 'supports'
      | 'pseudo'
      | 'attr'
      | 'combinator'
      | 'nthChild'
      | 'has';
    condition: string;
    containerName?: string;
    attribute?: string;
    attrValue?: string;
    combinator?: 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling';
    styles: object;
  }>;
  /** `true` when any conditional bucket carries a pseudo-state gate. */
  hasPseudo: boolean;
  keyframes: Array<{
    name: string;
    frames: Array<{ stops: string[]; decls: Dict<any>; resolvers?: Array<[string, Resolver]> }>;
  }>;
  /** Element-level props lifted from the style object (e.g. `numberOfLines`). */
  specialCases?: Dict<any>;
  /** Container-query metadata extracted from the source CSS at compile time. */
  containerInfo?: { type: string; explicitName?: string };
  /** Named scroll progress timeline declared on this component. */
  scrollTimeline?: { name: string; axis: 'block' | 'inline' | 'x' | 'y' };
  /** Set when the source declared `position: sticky` (native lift). */
  sticky?: true;
  /** Set when the source declared `scroll-snap-align` (+ optional `scroll-snap-stop: always`); the child registers with its scroll container, which derives `snapToOffsets`. */
  snapTarget?: { align: string; stop: boolean };
  /** `anchor-name` declared by this component (published at render). */
  anchorName?: string;
  /** `position-anchor`: implicit target for anchor functions. */
  positionAnchor?: string;
  /** Set for a `display: grid` container with a supported equal `1fr` track list; `columns` is the column count. */
  gridInfo?: { columns: number };
  /** Set for a grid item declaring `grid-column: span N`. */
  gridSpan?: number;
  /** `true` when this compile output could publish a cascade value (font-size / line-height / direction) to descendants. */
  publishesCascade: boolean;
  /** Authored width/height with no authored flex factor; scrollable targets pin `flexGrow: 0` at render so the declared size holds. */
  scrollerFlexPin?: true;
}

export interface INativeStyle<Props extends BaseObject> {
  rules: RuleSet<Props>;
  /** Set at construction; true when the CSS can render via the zero-hook static impl. */
  staticEligible: boolean;
  /** Set at construction; null when rules contain function interpolations. */
  staticCompiled: CompileOutput | null;
  /**
   * Set at construction; true when the CSS uses anchor() /
   * anchor-size(). Gates the anchor-registry subscription in the
   * dynamic render path (lifetime-constant, so the hook branch is
   * stable).
   */
  usesAnchorFunctions: boolean;
  compile(executionContext: ExecutionContext & Props): CompileOutput;
}

/** @deprecated use {@link INativeStyle}. */
export type IInlineStyle<Props extends BaseObject> = INativeStyle<Props>;
/** @deprecated use {@link INativeStyleConstructor}. */
export type IInlineStyleConstructor<Props extends BaseObject> = INativeStyleConstructor<Props>;

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

export type Substitute<A extends BaseObject, B extends BaseObject> = keyof B extends never
  ? A
  : FastOmit<A, keyof B> & B;

/**
 * Makes keys in K optional while keeping all others required.
 * Used to make attrs-provided props optional on the final component.
 *
 * Single-pass formulation using key-remapping over `keyof P`:
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
