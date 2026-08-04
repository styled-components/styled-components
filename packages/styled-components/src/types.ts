import type * as CSS from 'csstype';
import React from 'react';
import ComponentStyle from './models/ComponentStyle';
import { DefaultTheme } from './models/ThemeProvider';
import createWarnTooManyClasses from './utils/createWarnTooManyClasses';
import type { SupportedHTMLElements } from './utils/domElements';

export { CSS, DefaultTheme, SupportedHTMLElements };

export interface ExoticComponentWithDisplayName<
  P extends BaseObject = {},
> extends React.ExoticComponent<P> {
  defaultProps?: Partial<P> | undefined;
  displayName?: string | undefined;
}

/**
 * Use this type to disambiguate between a styled-component instance
 * and a StyleFunction or any other type of function.
 */
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

/**
 * This type is intended for when data attributes are composed via
 * the `.attrs` API:
 *
 * ```tsx
 * styled.div.attrs<DataAttributes>({ 'data-testid': 'foo' })``
 * ```
 *
 * Would love to figure out how to support this natively without having to
 * manually compose the type, but haven't figured out a way to do so yet that
 * doesn't cause specificity loss (see `test/types.tsx` if you attempt to embed
 * `DataAttributes` directly in the `Attrs<>` type.)
 */
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

/**
 * ExecutionProps but with `theme` narrowed from optional to required.
 *
 * Note: in RSC environments where ThemeProvider is a no-op,
 * `theme` will be `undefined` at runtime.
 */
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
  // `RuleSet<Props>` IS `Interpolation<Props>[]`, so listing both spelled the
  // same recursive branch twice and doubled the work of every expansion. That
  // was enough to tip `css?: CSSProp` over the instantiation-depth limit when
  // combined with a library that has deep recursive generics of its own
  // (react-spring's `animated`, #3496).
  | RuleSet<Props>;

// `Props` already carries the widened `style` from TargetProps, so this does not
// re-apply OverrideStyle. Re-applying it here also broke `Attrs<any>` relating to
// `Attrs<OuterProps>` in the component implementations.
export type Attrs<Props extends BaseObject = BaseObject> =
  | (ExecutionProps & Partial<Props>)
  | ((props: ExecutionContext & Props) => ExecutionProps & Partial<Props>);

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

export interface Stringifier {
  (
    css: string,
    selector?: string | undefined,
    prefix?: string | undefined,
    componentId?: string | undefined
  ): string[];
  hash: string;
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
  componentStyle: R extends 'web' ? ComponentStyle : never;
  // this is here because we want the uppermost displayName retained in a folding scenario
  foldedComponentIds: R extends 'web' ? string : never;
  inlineStyle: R extends 'native' ? InstanceType<IInlineStyleConstructor<OuterProps>> : never;
  target: StyledTarget<R>;
  styledComponentId: R extends 'web' ? string : never;
  warnTooManyClasses?:
    | (R extends 'web' ? ReturnType<typeof createWarnTooManyClasses> : never)
    | undefined;
}

/** ExecutionProps sans as/forwardedAs, pre-resolved so call sites relate against a concrete interface. */
interface ThemedExecutionProps {
  theme?: DefaultTheme | undefined;
}

/**
 * Props of a render target, for `as` / `forwardedAs`.
 *
 * One distributive conditional, never two nested, and tags resolve by indexed
 * access rather than `React.ComponentPropsWithRef`. Both are load-bearing: this
 * shape is the #5767 fix, and nesting a `T extends KnownTarget` check around it
 * costs ~4x the check time. The `AnyComponent` arm doubles as that test, and
 * every non-target falls through to `{}`.
 *
 * The `style` widening happens here, once per target, rather than at every JSX
 * call site -- directly via {@link WithCSSVars} on the intrinsic arm, which
 * needs no guard, and via {@link OverrideStyle} on the component arm, which
 * does. See AGENTS.md before changing any of it.
 *
 * `R` carries the runtime so the widening stays web-only; it is deliberately
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
 * component's type reads as `Substituted<IntrinsicProps<"button">, { … }>`
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
 * The `style` widening is web-only: a React Native `style` takes a `ViewStyle`,
 * which carries neither web CSS nor custom properties. This is the only seam that
 * knows the runtime, which is why the gate sits here rather than inside
 * {@link OverrideStyle}. The conditional is over `Runtime` -- two members, concrete
 * at every entry point -- never over the target union.
 */
type ComponentTargetProps<R extends Runtime, T extends AnyComponent> = R extends 'web'
  ? OverrideStyle<React.ComponentPropsWithRef<T>>
  : React.ComponentPropsWithRef<T>;

/**
 * Used by PolymorphicComponent to define prop override cascading order.
 */
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
 * `as` / `forwardedAs` targets. An `as` render target has its props merged over
 * the base props and requires `as`; plain usage (or `as` being the wrapped
 * component's own non-target type, e.g. Next.js Link's `as?: Url`) reaches
 * {@link PolymorphicComponentProps} not at all, so the base props stay untouched
 * and ref callbacks infer with spread props (#5687), the wrapped `as` stays
 * assignable (#5734), and BaseProps keys keep completing (#5741). `forwardedAs`
 * merges the same way, and loses to `as` where both name a target.
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
type PolymorphicCallProps<
  R extends Runtime,
  BaseProps extends BaseObject,
  AsTarget extends StyledTarget<R> | (BaseProps extends { as?: infer A } ? A : never) | void,
  ForwardedAsTarget extends StyledTarget<R> | void,
> = { as?: AsTarget | undefined; forwardedAs?: ForwardedAsTarget | undefined } & ([
  AsTarget,
] extends [string | AnyComponent]
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
  // FastOmit ahead of the intersection so a wrapped component's own `as` /
  // `forwardedAs` props (e.g. Next.js Link's `as?: Url`) don't intersect with
  // our `WebTarget`-typed versions and produce conflicting required-shape
  // types (#5734). `React.ComponentProps<typeof StyledComponent>` still
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
    AsTarget extends StyledTarget<R> | (BaseProps extends { as?: infer A } ? A : never) | void =
      void,
    ForwardedAsTarget extends StyledTarget<R> | void = void,
  >(
    props: PolymorphicCallProps<R, BaseProps, AsTarget, ForwardedAsTarget>
  ): React.JSX.Element;
}

/**
 * Some wrapped targets can't be statically introspected and their props
 * collapse to `{}` -- most notably polymorphic-factory components (e.g. Mantine
 * v7's `Button`, `Card`, `Menu.Item`), whose generic callable signature defeats
 * `React.ComponentPropsWithRef`. A closed `{}` would reject every prop at the JSX
 * call site, including `children`. Falling back to a permissive prop bag keeps
 * these components usable; targets with introspectable props are unchanged.
 *
 * Applied only to the JSX call surface (`PolymorphicComponent`), never to the
 * statics (`IStyledStatics`, `defaultProps`), so internal code keeps the real
 * `Props` and the widening can't leak past the call site.
 *
 * The test distributes over `Props` first: `keyof` on a union intersects each
 * member's keys, so a union of disjoint shapes has `keyof` of `never` while
 * being perfectly introspectable. Checking each member alone avoids widening it.
 */
export type WidenUntypedProps<Props extends BaseObject> = WidenForUntypedTarget<Props, Props>;

/**
 * Widens because the *target* is un-introspectable, even when the component
 * declares props of its own.
 *
 * `Target` must be the target's props, never a bag the component's own props
 * were merged into. Pass the latter and the test degrades: adding one transient
 * prop makes `keyof` non-`never`, the widening switches off, and the target's
 * own props including `children` start being rejected. That is #5756, and every
 * call site here passes `TargetProps<R, Target>` for that reason.
 *
 * Applying it to an already-widened `Target` is a no-op, since the index
 * signature makes `keyof` be `string`.
 */
export type WidenForUntypedTarget<Target extends BaseObject, Props extends BaseObject> = (
  Target extends unknown ? (keyof Target extends never ? true : false) : never
) extends true
  ? Props & { [key: string]: unknown }
  : Props;

export interface IStyledComponentBase<
  out R extends Runtime,
  in out Props extends BaseObject = BaseObject,
>
  extends
    PolymorphicComponent<R, WidenUntypedProps<Props>>,
    IStyledStatics<R, Props>,
    StyledComponentBrand {
  defaultProps?: (ExecutionProps & Partial<Props>) | undefined;
  toString: () => string;
}

/**
 * Intersected with `string` so styled components can be used as computed
 * property keys in object styles: `{ [MyComponent]: { ... } }`.
 * The conditional `R extends 'web' ? string : {}` was removed to avoid
 * a type alias with a conditional - type aliases require full structural
 * comparison on every use, while this unconditional intersection is cheaper.
 */
export type IStyledComponent<
  R extends Runtime,
  Props extends BaseObject = BaseObject,
> = IStyledComponentBase<R, Props> & string;

// corresponds to createStyledComponent
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

export interface IInlineStyleConstructor<Props extends BaseObject> {
  new (rules: RuleSet<Props>): IInlineStyle<Props>;
}

export interface IInlineStyle<Props extends BaseObject> {
  rules: RuleSet<Props>;
  generateStyleObject(executionContext: ExecutionContext & Props): object;
}

export type CSSProperties = CSS.Properties<number | (string & {})>;

export type CSSPropertiesWithVars = CSSProperties & {
  [key: `--${string}`]: string | number | undefined;
};

/**
 * A `style` type that accepts exactly the fields given and nothing else.
 *
 * A declared `style` normally narrows the fields it names and leaves the rest of
 * CSS available, which is what you want when constraining one or two properties:
 *
 * ```tsx
 * // `width` must be a number; `color` and custom properties still work
 * const Box = styled.div<{ style?: { width: number } }>``;
 * ```
 *
 * Wrap the declaration in `CustomStyle` when the point is to forbid everything
 * else, rather than writing `color?: never` for every property by hand:
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
 * `(P['style'] & {})` is load-bearing under `exactOptionalPropertyTypes` -- it
 * filters `undefined` out so the `?:` stays the sole optional source -- and the
 * explicit `| undefined` then restores `style={undefined}`.
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
 * a JSX call site. It runs before a component's own props, which then merge over
 * it via {@link MergeProps} rather than replacing it.
 *
 * The test is `'style' extends keyof P`, not `P extends { style?: infer S }`:
 * the latter is vacuously satisfied by `{}`, which would hand a `style` key to
 * targets that expose no props at all and defeat `WidenUntypedProps` (#5756).
 * Only {@link ComponentTargetProps} needs the guard; every intrinsic element
 * declares `style`, so {@link IntrinsicProps} applies `WithCSSVars` directly.
 */
type OverrideStyle<P extends BaseObject> = 'style' extends keyof P ? WithCSSVars<P> : P;

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

// Re-export, not a declaration: declaring `NoInfer` here would shadow the
// TypeScript intrinsic within this file and downgrade every reference to it.
export type { NoInfer } from './utils/noInfer';

/** The taken branch of {@link Substitute}. Named so it survives into hovers and
 * error messages; see {@link WithCSSVars} for why an inline branch does not. */
export type Substituted<A extends BaseObject, B> = FastOmit<A, keyof B> & B;

// `B` is deliberately unconstrained. Bounding it to BaseObject forces callers
// passing a still-generic target's props to intersect `& BaseObject` to satisfy
// it, and `{}` is retained rather than reduced inside an intersection, so that
// one bound propagates an unreducible node through every prop bag downstream
// (measured at roughly +160% types and +70% check time on a consumer fixture).
// Nothing here needs the bound: `keyof B` and `& B` are valid for any B.
//
// The `keyof B extends never` guard is the other half of keeping `{}` out of
// prop bags: TargetProps returns `{}` for every non-target and `Props` defaults
// to BaseObject, so without it both cases resolve to `FastOmit<A, never> & {}`,
// the unreducible node the paragraph above is about.
export type Substitute<A extends BaseObject, B> = keyof B extends never ? A : Substituted<A, B>;

/**
 * A component's own props over its target's props, with `style` merged rather
 * than replaced, so `styled.div<{ style?: { width: number } }>` constrains
 * `width` and leaves the rest of CSS accepted. A field declared `never` is
 * removed; {@link CustomStyle} removes everything a declaration omits.
 *
 * Under `exactOptionalPropertyTypes` the intersection leaves no `undefined` arm,
 * so such a component rejects an explicit `style={undefined}`; declare
 * `style?: X | undefined` to allow it. Omitting the prop is unaffected.
 *
 * Both conditional spellings of this were measured and rejected, one of them
 * fatal. Keep it an intersection; see AGENTS.md before changing the shape.
 */
export type MergeProps<A extends BaseObject, B> = keyof B extends never ? A : Merged<A, B>;

/** The taken branch of {@link MergeProps}, named so hovers print a name rather
 * than the expansion. Keep it named; see {@link Substituted}. */
export type Merged<A extends BaseObject, B> = FastOmit<A, Exclude<keyof B, 'style'>> & B;

/**
 * Makes keys in K optional while keeping all others required.
 * Used to make attrs-provided props optional on the final component.
 *
 * The guard is `[K] extends [never]`, not `keyof K extends never`. `K` is the set
 * of attrs-provided keys and is `never` for any component without `.attrs()`,
 * which is most of them, but `keyof never` is `string | number | symbol`, so the
 * old spelling never short-circuited. Every such component paid an omit plus a
 * `Partial<Pick<...>>` that removed and re-added nothing, and carried both in its
 * displayed type.
 */
export type MakeAttrsOptional<P extends BaseObject, K extends keyof any> = [K] extends [never]
  ? P
  : FastOmit<P, K & keyof P> & Partial<Pick<P, K & keyof P>>;

export type InsertionTarget = HTMLElement | ShadowRoot;
