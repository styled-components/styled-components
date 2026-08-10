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
import css from './css';

type AttrsResult<T extends Attrs<any>> = T extends (...args: any) => infer P
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
  out AttrsKeys extends keyof any = never,
> {
  <Props extends object = BaseObject, Statics extends object = BaseObject>(
    initialStyles: Styles<MergeProps<OuterProps, NoInfer<Props>>>,
    ...interpolations: Interpolation<MergeProps<OuterProps, NoInfer<Props>>>[]
  ): IStyledComponent<
    R,
    // Tested against the target, never `OuterProps`: after `.attrs()` those
    // diverge and the widening would switch off, which is #5756 one layer down.
    // `TargetProps<R, Target>` is `OuterProps`' own default, so it costs nothing.
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
        : Omit<Target, keyof React.Component<any>>
      : {});

  attrs: <
    Props extends object = BaseObject,
    PrivateMergedProps extends object = MergeProps<OuterProps, Props>,
    // Widen when the merged props are un-introspectable ({}) so attrs can backfill
    // arbitrary keys on e.g. Mantine polymorphic-factory targets, matching the
    // permissive JSX call site. Targets with known props are unaffected.
    PrivateAttrsArg extends Attrs<
      WidenForUntypedTarget<TargetProps<R, Target>, PrivateMergedProps>
    > = Attrs<WidenForUntypedTarget<TargetProps<R, Target>, PrivateMergedProps>>,
    PrivateResolvedTarget extends StyledTarget<R> = AttrsTarget<R, PrivateAttrsArg, Target>,
  >(
    attrs: PrivateAttrsArg
  ) => Styled<
    R,
    PrivateResolvedTarget,
    // Target-unchanged fast path: when object-form `.attrs` leaves the target
    // as-is, `OuterProps` already equals `TargetProps<R, Target>`, so re-merging
    // `ComponentPropsWithRef<Target>` only rebuilds the ~265-key intrinsic bag
    // the #5767 indexed access avoids. `MergeProps<OuterProps, Props>` is the
    // same result. The bracket keeps a function-form `.attrs` (union target) off
    // this branch, preserving its TS2589-avoidance; see docs/type-performance.md.
    [PrivateResolvedTarget] extends [Target]
      ? PrivateMergedProps
      : PrivateResolvedTarget extends KnownTarget
        ? MergeProps<
            // `MergeProps` keeps the CSS-variable widening `OuterProps` carries,
            // which substituting the target's unwidened `style` would drop.
            // `ComponentPropsWithRef` rather than `TargetProps` is the one place
            // that stays: a function-form `.attrs` makes this target a union, and
            // `TargetProps` distributing inside that measured as TS2589. Both in
            // docs/type-performance.md.
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
  AttrsKeys extends keyof any = never,
>(
  componentConstructor: IStyledComponentFactory<R, StyledTarget<R>, object, any>,
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

  /* This is callable directly as a template function */
  const templateFunction = <Props extends object = BaseObject, Statics extends object = BaseObject>(
    initialStyles: Styles<MergeProps<OuterProps, Props>>,
    ...interpolations: Interpolation<MergeProps<OuterProps, Props>>[]
  ) =>
    componentConstructor<MergeProps<OuterProps, Props>, Statics>(
      tag,
      options as StyledOptions<R, MergeProps<OuterProps, Props>>,
      css<MergeProps<OuterProps, Props>>(initialStyles, ...interpolations)
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
      // Target-unchanged fast path: object-form `.attrs` leaves the target as-is
      // (`AttrsTarget` returns `Target`), so `OuterProps` already carries the
      // target's props (`TargetProps<R, Target>`) and re-resolving them through
      // `ComponentPropsWithRef` only rebuilds the ~265-key intrinsic bag the
      // #5767 indexed access was written to avoid. The bracket keeps a
      // function-form `.attrs` (resolved target is a union) off this branch so it
      // does not distribute here; see docs/type-performance.md.
      [PrivateResolvedTarget] extends [Target]
        ? PrivateMergedProps
        : PrivateResolvedTarget extends KnownTarget
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
