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
// `Partial<Props>`, not `Partial<OverrideStyle<Props>>`: `Props` already carries
// the widening from `TargetProps`, and re-applying it here stops `Attrs<any>`
// relating to `Attrs<OuterProps>`.
export type Attrs<Props extends BaseObject = BaseObject> =
  | (ExecutionProps & Partial<Props>)
  | ((props: ExecutionContext & Props, ast: CompiledAst) => ExecutionProps & Partial<Props>);

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

export interface IStyledStatics<out R extends Runtime, in out OuterProps extends BaseObject>
  extends CommonStatics<R, OuterProps> {
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

/** ExecutionProps sans as/forwardedAs, pre-resolved so call sites relate against a concrete interface. */
interface ThemedExecutionProps {
  theme?: DefaultTheme | undefined;
}

/**
 * Props of a render target, resolved once per target rather than once per JSX
 * call site.
 *
 * One flat distributive conditional, with tags resolved by indexed access. The
 * shape it replaced (`T extends KnownTarget ? ComponentPropsWithRef<T> : {}`)
 * distributed over a constraint of ~150 members and re-instantiated
 * `ComponentPropsWithRef` for each, every one of those rebuilding a large prop
 * bag through `Omit`. `React.JSX.IntrinsicElements[T]` already carries `ref` via
 * `DetailedHTMLProps`, so the tag branch loses nothing by skipping that.
 *
 * Do not bracket the test. An outer `T extends KnownTarget` re-check costs
 * several times the check time, and `T & KnownTarget` cross-products two large
 * unions. The `AnyComponent` arm doubles as that test, and every non-target
 * falls through to `{}`.
 *
 * The `style` widening happens here, once per target, rather than at every JSX
 * call site: directly via {@link WithCSSVars} on the intrinsic arm, which needs
 * no guard, and via {@link OverrideStyle} on the component arm, which does.
 *
 * `R` carries the runtime so the widening stays web-only. It is deliberately
 * undefaulted, since a default is what would let a native call site pick up web
 * CSS by omission.
 */
export type TargetProps<R extends Runtime, T> = T extends keyof React.JSX.IntrinsicElements
  ? IntrinsicProps<T>
  : T extends AnyComponent
    ? ComponentTargetProps<R, T>
    : {};

/**
 * Props of an HTML or SVG tag.
 *
 * Both branches of {@link TargetProps} are named rather than inlined, so a
 * component's type reads as `Merged<IntrinsicProps<"button">, { … }>`
 * instead of the full expansion of every tag attribute. See {@link WithCSSVars}
 * for why a conditional's inline branch cannot keep a name.
 *
 * Applies the widening directly rather than through {@link OverrideStyle}: every
 * intrinsic element declares `style`, so the guard has nothing to decide here.
 */
type IntrinsicProps<T extends keyof React.JSX.IntrinsicElements> = WithCSSVars<
  React.JSX.IntrinsicElements[T]
>;

/**
 * Props of a component render target. Named for the same reason as {@link IntrinsicProps}.
 *
 * The `style` widening is web-only: a React Native `style` takes a native style
 * object, which carries neither web CSS nor custom properties. This is the only
 * seam that knows the runtime, which is why the gate sits here rather than
 * inside {@link OverrideStyle}. The conditional is over `Runtime`, two members
 * concrete at every entry point, never over the target union.
 */
type ComponentTargetProps<R extends Runtime, T extends AnyComponent> = R extends 'web'
  ? OverrideStyle<React.ComponentPropsWithRef<T>>
  : React.ComponentPropsWithRef<T>;

export type PolymorphicComponentProps<
  R extends Runtime,
  BaseProps extends BaseObject,
  AsTarget extends StyledTarget<R> | (BaseProps extends { as?: infer A } ? A : never) | void,
  ForwardedAsTarget extends StyledTarget<R> | void,
  // props extracted from "as"
  AsTargetProps extends BaseObject = TargetProps<R, AsTarget>,
  // props extracted from "forwardedAs"
  ForwardedAsTargetProps extends BaseObject = TargetProps<R, ForwardedAsTarget>,
> = NoInfer<
  FastOmit<
    MergeProps<
      BaseProps,
      // "as" wins over "forwardedAs" when it comes to prop interface
      Substitute<ForwardedAsTargetProps, AsTargetProps>
    >,
    keyof ExecutionProps
  >
> &
  ThemedExecutionProps & {
    as?: AsTarget;
    forwardedAs?: ForwardedAsTarget;
  };

/**
 * Resolves the call-site props for one usage of a polymorphic component from its
 * `as` / `forwardedAs` targets. An `as` render target substitutes that target's
 * props and requires `as`; plain usage (or `as` being the wrapped component's own
 * non-target type, e.g. Next.js Link's `as?: Url`) keeps Substitute-free base
 * props so ref callbacks infer with spread props (#5687), the wrapped `as` stays
 * assignable (#5734), and BaseProps keys keep completing (#5741); `forwardedAs`
 * substitutes the forwarded target's props.
 *
 * The target test is `string | AnyComponent`, not `KnownTarget`: narrowing it
 * drops custom element strings (`as="my-element"`) out of the target branch.
 *
 * Load-bearing shape, do not simplify: two conditionals with `unknown` sibling
 * branches (not one three-way conditional), a leading flat `{ as?; forwardedAs? }`
 * member, and positive `extends [string | AnyComponent]` discriminants. Collapsing
 * the conditionals, dropping the flat member, or using a `[void]` discriminant
 * each regress plain-call-site cost, `as`-target completion, or ref-callback
 * inference (#5687) respectively.
 */
type PolymorphicAsProps<AsTarget, ForwardedAsTarget> = {
  as?: AsTarget | undefined;
  forwardedAs?: ForwardedAsTarget | undefined;
};

type PolymorphicCallProps<
  R extends Runtime,
  BaseProps extends BaseObject,
  AsTarget extends StyledTarget<R> | (BaseProps extends { as?: infer A } ? A : never) | void,
  ForwardedAsTarget extends StyledTarget<R> | void,
> = PolymorphicAsProps<AsTarget, ForwardedAsTarget> &
  ([AsTarget] extends [string | AnyComponent]
    ? PolymorphicComponentProps<R, BaseProps, AsTarget, ForwardedAsTarget> & { as: AsTarget }
    : unknown) &
  ([AsTarget] extends [string | AnyComponent]
    ? unknown
    : [ForwardedAsTarget] extends [string | AnyComponent]
      ? PolymorphicComponentProps<R, BaseProps, void, ForwardedAsTarget> & {
          forwardedAs: ForwardedAsTarget;
        }
      : NoInfer<FastOmit<BaseProps, keyof ExecutionProps>> & ThemedExecutionProps);

/**
 * Signature for a styled component that accepts the `as` prop to dynamically
 * change the underlying rendered JSX. The interface automatically extracts
 * props from the given rendering target to get proper typing for any
 * specialized props in the target component.
 */
export interface PolymorphicComponent<out R extends Runtime, in out BaseProps extends BaseObject>
  extends React.ForwardRefExoticComponent<
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
  // A single call signature, not overloads: with overloads a mid-typed JSX
  // attribute matches none, resolution fails, and attribute completion drops. The
  // prop-shape branching lives in `PolymorphicCallProps`.
  <
    AsTarget extends
      | StyledTarget<R>
      | (BaseProps extends { as?: infer A } ? A : never)
      | void = void,
    ForwardedAsTarget extends StyledTarget<R> | void = void,
  >(
    props: PolymorphicCallProps<R, BaseProps, AsTarget, ForwardedAsTarget>
  ): React.JSX.Element;
}

/**
 * Widens because the *target* is un-introspectable, even when the component
 * declares props of its own. A component whose props resolve to `{}` (a generic
 * polymorphic factory, for instance) would otherwise reject every prop it has,
 * `children` included.
 *
 * `Target` must be the target's props, never a bag the component's own props
 * were merged into. Pass the latter and the test degrades: adding one transient
 * prop makes `keyof` non-`never`, the widening switches off, and the target's
 * own props start being rejected again. Every call site in
 * `constructWithOptions` passes `TargetProps<R, Target>` for that reason.
 *
 * {@link IStyledComponentBase} is the one exception, passing its own `Props` as
 * both arguments. That seam widens the erased public surface, where `Props`
 * defaults to `BaseObject` and there is no target to consult; a bag reaching it
 * from `styled()` was already decided by the target upstream, so the test is a
 * no-op there rather than the degraded form described above.
 *
 * The test distributes over `Target` first, because `keyof` on a union
 * intersects each member's keys: a union of disjoint shapes has `keyof` of
 * `never` while being perfectly introspectable, and widening it would throw the
 * union away. Checking each member alone, then collapsing `true | false` against
 * `true`, widens only when every constituent is genuinely empty.
 *
 * Applying it to an already-widened `Target` is a no-op, since the index
 * signature makes `keyof` be `string`.
 */
export type WidenForUntypedTarget<Target extends BaseObject, Props extends BaseObject> = (
  Target extends unknown
    ? keyof Target extends never
      ? true
      : false
    : never
) extends true
  ? Props & { [key: string]: unknown }
  : Props;

export interface IStyledComponentBase<
    out R extends Runtime,
    in out Props extends BaseObject = BaseObject,
  >
  // Widened on the JSX call surface only, never on the statics.
  extends PolymorphicComponent<R, WidenForUntypedTarget<Props, Props>>,
    IStyledStatics<R, Props>,
    StyledComponentBrand {
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

type ConditionalKind =
  | 'media'
  | 'container'
  | 'supports'
  | 'pseudo'
  | 'attr'
  | 'combinator'
  | 'nthChild'
  | 'has';

interface ConditionalEntry<T extends ConditionalKind = ConditionalKind> {
  type: T;
  condition: string;
  containerName?: string;
  attribute?: string;
  attrValue?: string;
  combinator?: 'descendant' | 'child' | 'adjacent-sibling' | 'general-sibling';
  styles: object;
}

interface CompileOutput {
  base: object;
  conditional: Array<ConditionalEntry>;
  /** Subset of `conditional` minus pseudo-bearing entries. */
  nonPseudoEntries: Array<ConditionalEntry<Exclude<ConditionalKind, 'pseudo'>>>;
  /** Subset of `conditional` containing only pseudo-bearing entries. */
  pseudoEntries: Array<ConditionalEntry>;
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

/**
 * Declares a `style` prop that accepts exactly the fields named and nothing
 * else, instead of writing `?: never` for every CSS property by hand:
 *
 * ```tsx
 * // `width` is the only accepted style field
 * const Box = styled.div<{ style?: CustomStyle<{ width: number }> }>``;
 * ```
 */
export type CustomStyle<T extends object> = T & {
  [K in Exclude<keyof CSSPropertiesWithVars, keyof T>]?: never;
};

/**
 * Widens a target's `style` prop so CSS custom properties are accepted, and the
 * taken branch of {@link OverrideStyle}. Keep it named: a conditional alias
 * loses its name once it resolves, so an inline branch prints its whole
 * expansion in every hover and error.
 *
 * The `& {}` on the style arm is load-bearing under
 * `exactOptionalPropertyTypes`, since it filters `undefined` out so the `?:`
 * stays the sole optional source, and the explicit `| undefined` then restores
 * `style={undefined}`.
 *
 * Built-in `Omit` here rather than {@link FastOmit}: `Pick` + `Exclude` is the
 * more optimized pair for this shape (measured +17% instantiations when swapped).
 */
type WithCSSVars<P extends BaseObject> = Omit<P, 'style'> & {
  // `keyof P & 'style'` rather than `'style'`: splitting the branch out of the
  // conditional means P is no longer known to carry the key here, and this form
  // stays valid for any P while resolving to P['style'] whenever the key exists.
  style?: CSSPropertiesWithVars | (P[keyof P & 'style'] & {}) | undefined;
};

/**
 * Applies the `style` widening to a target that may or may not declare `style`.
 *
 * Applied once per target in {@link TargetProps}, never to a merged prop bag at
 * a JSX call site. That placement is load-bearing and not only a cost decision:
 * built-in `Omit` is `Pick` + `Exclude`, and `keyof (X & (A | B))` sees only the
 * union's *shared* keys, so widening a bag that already merged a union-typed
 * target's props silently drops every member-specific prop. Per target, the
 * union is still a union and distributes.
 *
 * The test is `'style' extends keyof P`, not `P extends { style?: infer S }`:
 * the latter is vacuously satisfied by `{}`, which would hand a `style` key to
 * targets that expose no props at all and defeat {@link WidenForUntypedTarget}.
 * Only {@link ComponentTargetProps} needs the guard; every intrinsic element
 * declares `style`, so {@link IntrinsicProps} applies `WithCSSVars` directly.
 *
 * The outer `P extends unknown` is what makes this distribute over a union of
 * prop shapes. `keyof` a union is the keys common to every member, so an
 * undistributed pass widens `A | B` against the shared keys alone and drops
 * every member-specific prop: a component typed `ButtonProps | AnchorProps`
 * stops accepting `href`. Widening member by member keeps the union intact.
 */
type OverrideStyle<P extends BaseObject> = P extends unknown
  ? 'style' extends keyof P
    ? WithCSSVars<P>
    : P
  : never;

export type CSSPseudos = { [K in CSS.Pseudos]?: CSSObject };

export type CSSKeyframes = object & { [key: string]: CSSObject };

export type CSSObject<Props extends BaseObject = BaseObject> = StyledObject<Props>;

export interface StyledObject<Props extends BaseObject = BaseObject>
  extends CSSProperties,
    CSSPseudos {
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
 * The taken branch of {@link Substitute}. Named so it survives into hovers and
 * error messages: a conditional alias loses its name the moment it resolves, so
 * an inline branch prints its whole expansion instead.
 */
type Substituted<A extends BaseObject, B> = FastOmit<A, keyof B> & B;

// `B` is deliberately unconstrained. Bounding it to BaseObject forces callers
// passing a still-generic target's props to intersect `& BaseObject` to satisfy
// it, and `{}` is retained rather than reduced inside an intersection, so that
// one bound propagates an unreducible node through every prop bag downstream.
// Nothing here needs the bound: `keyof B` and `& B` are valid for any B.
//
// The `keyof B extends never` guard keeps `{}` out of prop bags: a non-target
// resolves to `{}` and `Props` defaults to BaseObject, so without it both cases
// resolve to `FastOmit<A, never> & {}`, the unreducible node above.
//
// `keyof B extends never` alone cannot carry that guard, because `keyof` a union
// is the keys *common* to every member: a union of disjoint shapes reports
// `never` while being a perfectly real prop bag, and the fast path then dropped
// it wholesale. `{} extends B` separates the two, since an empty object is
// assignable to `{}` but not to a union whose members each require a key. The
// taken branch needs no distribution of its own, because `FastOmit<A, never> & B`
// is an intersection and an intersection over a union distributes already.
//
// Do NOT instead re-ask `keyof` per member (`B extends unknown ? …` inside this
// guard). It is more complete, and it tips `tsc` into TS2589 where a caller
// spreads props carrying `as?: WebTarget`: the added distribution nests inside
// the one the polymorphic signature already performs over that large union.
//
// Known limitation, accepted: a union whose members are ALL-optional (`{a?: 1} |
// {b?: 2}`) still takes the fast path, because `{}` is assignable to each member.
// Such a union accepts `{}` anyway, so it is nearly indistinguishable from the
// flattened `{a?: 1, b?: 2}` that does work.
export type Substitute<A extends BaseObject, B> = keyof B extends never
  ? {} extends B
    ? A
    : Substituted<A, B>
  : Substituted<A, B>;

/**
 * A component's own props over its target's props, with `style` merged rather
 * than replaced, so `styled.div<{ style?: { width: number } }>` constrains
 * `width` and leaves the rest of CSS accepted. A field declared `never` is
 * forbidden; {@link CustomStyle} forbids everything a declaration omits.
 *
 * Under `exactOptionalPropertyTypes` the intersection leaves no `undefined` arm,
 * so such a component rejects an explicit `style={undefined}`; declare
 * `style?: X | undefined` to allow it. Omitting the prop is unaffected.
 *
 * Keep the `& B` tail an unconditional intersection. The alternative shape,
 * omitting `style` from `A` only when `B` actually declares one, was measured
 * twice and rejected twice: conditioning on `keyof A` tips `tsc` past its
 * complexity ceiling outright, and conditioning on `keyof B` costs about half
 * again as many types.
 */
export type MergeProps<A extends BaseObject, B> = keyof B extends never
  ? {} extends B
    ? A
    : Merged<A, B>
  : Merged<A, B>;

/**
 * The taken branch of {@link MergeProps}, named so hovers print a name rather
 * than the expansion. Keep it named; see {@link Substituted}.
 *
 * `Exclude<keyof B, 'style'>` is the whole feature: `style` is not omitted from
 * the target, so the target's `style` and the declared `style` intersect instead
 * of the declaration replacing it.
 */
type Merged<A extends BaseObject, B> = FastOmit<A, Exclude<keyof B, 'style'>> & B;

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
