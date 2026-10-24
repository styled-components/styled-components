import {
  Attrs,
  BaseObject,
  ExecutionProps,
  Interpolation,
  IStyledComponent,
  IStyledComponentFactory,
  KnownTarget,
  MakeAttrsOptional,
  MergeProps,
  Runtime,
  StyledOptions,
  StyledTarget,
  Styles,
  TargetProps,
  WidenForUntypedTarget,
} from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import styledError from '../utils/error';
import { cssWithInterpolations } from './css';

// biome-ignore lint/suspicious/noExplicitAny: the constraint must admit `Attrs` of every props shape, and `Attrs<BaseObject>` does not: it changes `.attrs<{ bar: string }>()` inference so `<Component />` stops reporting the missing required prop (src/test/types.tsx: TS2769 "Property 'bar' is missing in type '{}'")
type AttrsResult<T extends Attrs<any>> = T extends (
  // biome-ignore lint/suspicious/noExplicitAny: `(...args: unknown)` fails with "A rest parameter must be of an array type", and `unknown[]` rejects every attrs callback that declares a typed `props` parameter
  ...args: any
) => infer P
  ? P extends object
    ? P
    : never
  : T extends object
    ? T
    : never;

/**
 * Based on Attrs being a simple object or function that returns
 * a prop object, inspect the attrs result and attempt to extract
 * any "as" prop usage to modify the runtime target.
 */
type AttrsTarget<
  R extends Runtime,
  // biome-ignore lint/suspicious/noExplicitAny: same constraint as `AttrsResult`: it must admit `Attrs` of every props shape, and `Attrs<BaseObject>` changes `.attrs<{ bar: string }>()` inference (src/test/types.tsx: TS2769)
  T extends Attrs<any>,
  FallbackTarget extends StyledTarget<R>,
  Result extends ExecutionProps = AttrsResult<T>,
> = Result extends { as: infer RuntimeTarget }
  ? RuntimeTarget extends KnownTarget
    ? RuntimeTarget
    : FallbackTarget
  : FallbackTarget;

export interface Styled<
  out R extends Runtime,
  out Target extends StyledTarget<R>,
  in out OuterProps extends object,
  out OuterStatics extends object = BaseObject,
  out AttrsKeys extends PropertyKey = never,
> {
  <Props extends object = BaseObject, Statics extends object = BaseObject>(
    initialStyles: Styles<MergeProps<OuterProps, NoInfer<Props>>>,
    ...interpolations: Interpolation<MergeProps<OuterProps, NoInfer<Props>>>[]
  ): IStyledComponent<
    R,
    // Permissiveness is decided by the target, not by the finished prop bag.
    // `OuterProps` is built from this same instantiation, so naming it again
    // re-uses a cached type rather than adding one.
    WidenForUntypedTarget<
      TargetProps<R, Target>,
      MakeAttrsOptional<MergeProps<OuterProps, Props>, AttrsKeys>
    >
  > &
    OuterStatics &
    Statics &
    (R extends 'web'
      ? Target extends string
        ? {}
        : // biome-ignore lint/suspicious/noExplicitAny: public `Styled` signature; the key set does not depend on the props argument, but any other argument changes the emitted .d.ts
          Omit<Target, keyof React.Component<any>>
      : {});

  attrs: <
    Props extends object = BaseObject,
    PrivateMergedProps extends object = MergeProps<OuterProps, Props>,
    PrivateAttrsArg extends Attrs<
      WidenForUntypedTarget<TargetProps<R, Target>, PrivateMergedProps>
    > = Attrs<WidenForUntypedTarget<TargetProps<R, Target>, PrivateMergedProps>>,
    PrivateResolvedTarget extends StyledTarget<R> = AttrsTarget<R, PrivateAttrsArg, Target>,
  >(
    attrs: PrivateAttrsArg
  ) => Styled<
    R,
    PrivateResolvedTarget,
    PrivateResolvedTarget extends KnownTarget
      ? MergeProps<
          // `MergeProps` keeps the CSS-variable widening `OuterProps` carries,
          // which substituting the target's unwidened `style` would drop.
          // `ComponentPropsWithRef` rather than `TargetProps` is the one place
          // that stays: a function-form `.attrs` makes this target a union, and
          // `TargetProps` distributing inside that distribution blows past the
          // complexity ceiling.
          MergeProps<OuterProps, React.ComponentPropsWithRef<PrivateResolvedTarget>>,
          Props
        >
      : PrivateMergedProps,
    OuterStatics,
    AttrsKeys | keyof AttrsResult<PrivateAttrsArg>
  >;

  withConfig: (
    config: StyledOptions<R, OuterProps>
  ) => Styled<R, Target, OuterProps, OuterStatics, AttrsKeys>;
}

export default function constructWithOptions<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OuterProps extends object = TargetProps<R, Target>,
  OuterStatics extends object = BaseObject,
  AttrsKeys extends PropertyKey = never,
>(
  componentConstructor: IStyledComponentFactory<R, StyledTarget<R>, object, BaseObject>,
  tag: StyledTarget<R>,
  options: StyledOptions<R, OuterProps> = EMPTY_OBJECT
): Styled<R, Target, OuterProps, OuterStatics, AttrsKeys> {
  /**
   * We trust that the tag is a valid component as long as it isn't
   * falsish. Typically the tag here is a string or function (i.e.
   * class or pure function component), however a component may also be
   * an object if it uses another utility, e.g. React.memo. React will
   * output an appropriate warning however if the `tag` isn't valid.
   */
  if (!tag) {
    throw styledError(1, tag);
  }

  /* This is callable directly as a template function. We forward the
   * rest-param array straight to `cssWithInterpolations` rather than
   * spreading into `css(...)` and re-collecting, which skips one array
   * allocation + one spread iteration per styled.div`...` call. */
  const templateFunction = <Props extends object = BaseObject, Statics extends object = BaseObject>(
    initialStyles: Styles<MergeProps<OuterProps, Props>>,
    ...interpolations: Interpolation<MergeProps<OuterProps, Props>>[]
  ) =>
    componentConstructor<MergeProps<OuterProps, Props>, Statics>(
      tag,
      options as StyledOptions<R, MergeProps<OuterProps, Props>>,
      cssWithInterpolations<MergeProps<OuterProps, Props>>(initialStyles, interpolations)
    );

  /**
   * Attrs allows for accomplishing two goals:
   *
   * 1. Backfilling props at runtime more expressively than defaultProps
   * 2. Amending the prop interface of a wrapped styled component
   */
  templateFunction.attrs = <
    Props extends object = BaseObject,
    PrivateMergedProps extends object = MergeProps<OuterProps, Props>,
    PrivateAttrsArg extends Attrs<
      WidenForUntypedTarget<TargetProps<R, Target>, PrivateMergedProps>
    > = Attrs<WidenForUntypedTarget<TargetProps<R, Target>, PrivateMergedProps>>,
    PrivateResolvedTarget extends StyledTarget<R> = AttrsTarget<R, PrivateAttrsArg, Target>,
  >(
    attrs: PrivateAttrsArg
  ) =>
    constructWithOptions<
      R,
      PrivateResolvedTarget,
      PrivateResolvedTarget extends KnownTarget
        ? MergeProps<
            MergeProps<OuterProps, React.ComponentPropsWithRef<PrivateResolvedTarget>>,
            Props
          >
        : PrivateMergedProps,
      OuterStatics,
      AttrsKeys | keyof AttrsResult<PrivateAttrsArg>
    >(componentConstructor, tag, {
      ...options,
      attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
    });

  /**
   * If config methods are called, wrap up a new template function
   * and merge options.
   */
  templateFunction.withConfig = (config: StyledOptions<R, OuterProps>) =>
    constructWithOptions<R, Target, OuterProps, OuterStatics, AttrsKeys>(
      componentConstructor,
      tag,
      {
        ...options,
        ...config,
      }
    );

  return templateFunction;
}
