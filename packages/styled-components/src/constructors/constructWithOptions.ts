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
  Substitute,
  TargetProps,
  WidenForUntypedTarget,
  WidenUntypedProps,
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
    WidenForUntypedTarget<OuterProps, MakeAttrsOptional<MergeProps<OuterProps, Props>, AttrsKeys>>
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
    PrivateAttrsArg extends Attrs<WidenUntypedProps<PrivateMergedProps>> = Attrs<
      WidenUntypedProps<PrivateMergedProps>
    >,
    PrivateResolvedTarget extends StyledTarget<R> = AttrsTarget<R, PrivateAttrsArg, Target>,
  >(
    attrs: PrivateAttrsArg
  ) => Styled<
    R,
    PrivateResolvedTarget,
    PrivateResolvedTarget extends KnownTarget
      ? MergeProps<
          // `MergeProps`, not `Substitute`: the resolved target's own `style` is
          // unwidened, and substituting would drop the CSS-variable widening
          // `OuterProps` already carries. Merging intersects the two, so the
          // custom-property index signature survives.
          //
          // `ComponentPropsWithRef`, not `TargetProps`, is deliberate here and
          // is the one place that stays -- see AGENTS.md. A function-form
          // `.attrs` makes this target a union, and `TargetProps` distributes
          // inside that distribution, which measured as TS2589.
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
  OuterProps extends object = TargetProps<Target>,
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
    PrivateAttrsArg extends Attrs<WidenUntypedProps<PrivateMergedProps>> = Attrs<
      WidenUntypedProps<PrivateMergedProps>
    >,
    PrivateResolvedTarget extends StyledTarget<R> = AttrsTarget<R, PrivateAttrsArg, Target>,
  >(
    attrs: PrivateAttrsArg
  ) =>
    constructWithOptions<
      R,
      PrivateResolvedTarget,
      PrivateResolvedTarget extends KnownTarget
        ? MergeProps<
            Substitute<OuterProps, React.ComponentPropsWithRef<PrivateResolvedTarget>>,
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
