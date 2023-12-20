import {
  Attrs,
  BaseObject,
  ExecutionProps,
  Interpolation,
  IStyledComponent,
  IStyledComponentFactory,
  KnownTarget,
  NoInfer,
  Runtime,
  StyledOptions,
  StyledTarget,
  Styles,
  Substitute,
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
  R extends Runtime,
  Target extends StyledTarget<R>,
  OuterProps extends object,
  OuterStatics extends object = BaseObject,
> {
  <Props extends object = BaseObject, Statics extends object = BaseObject>(
    initialStyles: Styles<Substitute<OuterProps, NoInfer<Props>>>,
    ...interpolations: Interpolation<Substitute<OuterProps, NoInfer<Props>>>[]
  ): IStyledComponent<R, Substitute<OuterProps, Props>> &
    OuterStatics &
    Statics &
    (R extends 'web'
      ? Target extends string
        ? {}
        : Omit<Target, keyof React.Component<any>>
      : {});

  attrs: <
    Props extends object = BaseObject,
    PrivateMergedProps extends object = Substitute<OuterProps, Props>,
    PrivateAttrsArg extends Attrs<PrivateMergedProps> = Attrs<PrivateMergedProps>,
    PrivateResolvedTarget extends StyledTarget<R> = AttrsTarget<R, PrivateAttrsArg, Target>,
  >(
    attrs: PrivateAttrsArg
  ) => Styled<
    R,
    PrivateResolvedTarget,
    PrivateResolvedTarget extends KnownTarget
      ? Substitute<
          Substitute<OuterProps, React.ComponentPropsWithRef<PrivateResolvedTarget>>,
          Props
        >
      : PrivateMergedProps,
    OuterStatics
  >;

  withConfig: (config: StyledOptions<R, OuterProps>) => Styled<R, Target, OuterProps, OuterStatics>;
}

export default function constructWithOptions<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OuterProps extends object = Target extends KnownTarget
    ? React.ComponentPropsWithRef<Target>
    : BaseObject,
  OuterStatics extends object = BaseObject,
>(
  componentConstructor: IStyledComponentFactory<R, StyledTarget<R>, object, any>,
  tag: StyledTarget<R>,
  options: StyledOptions<R, OuterProps> = EMPTY_OBJECT
): Styled<R, Target, OuterProps, OuterStatics> {
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
    initialStyles: Styles<Substitute<OuterProps, Props>>,
    ...interpolations: Interpolation<Substitute<OuterProps, Props>>[]
  ) =>
    componentConstructor<Substitute<OuterProps, Props>, Statics>(
      tag,
      options as StyledOptions<R, Substitute<OuterProps, Props>>,
      css<Substitute<OuterProps, Props>>(initialStyles, ...interpolations)
    );

  /**
   * Attrs allows for accomplishing two goals:
   *
   * 1. Backfilling props at runtime more expressively than defaultProps
   * 2. Amending the prop interface of a wrapped styled component
   */
  templateFunction.attrs = <
    Props extends object = BaseObject,
    PrivateMergedProps extends object = Substitute<OuterProps, Props>,
    PrivateAttrsArg extends Attrs<PrivateMergedProps> = Attrs<PrivateMergedProps>,
    PrivateResolvedTarget extends StyledTarget<R> = AttrsTarget<R, PrivateAttrsArg, Target>,
  >(
    attrs: PrivateAttrsArg
  ) =>
    constructWithOptions<
      R,
      PrivateResolvedTarget,
      PrivateResolvedTarget extends KnownTarget
        ? Substitute<
            Substitute<OuterProps, React.ComponentPropsWithRef<PrivateResolvedTarget>>,
            Props
          >
        : PrivateMergedProps,
      OuterStatics
    >(componentConstructor, tag, {
      ...options,
      attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
    });

  /**
   * If config methods are called, wrap up a new template function
   * and merge options.
   */
  templateFunction.withConfig = (config: StyledOptions<R, OuterProps>) =>
    constructWithOptions<R, Target, OuterProps, OuterStatics>(componentConstructor, tag, {
      ...options,
      ...config,
    });

  return templateFunction;
}
