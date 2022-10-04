import {
  Attrs,
  Interpolation,
  IStyledComponent,
  IStyledComponentFactory,
  KnownTarget,
  RuleSet,
  Runtime,
  StyledOptions,
  StyledTarget,
  Styles,
} from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import styledError from '../utils/error';
import css from './css';

/**
 * for types a and b, if b shares a field with a, mark a's field as optional
 */
type UnionWithOptionalIntersectedFields<A, B> = {
  [K in keyof (A | B)]: K extends keyof B ? A[K] | undefined : A[K];
};

/**
 * attrs can be an object or function that returns an object; attrs are always
 * optional and should hole-punch required base types if we're providing the
 * value via attrs
 */
type InferAttrResultType<T extends Attrs<object>> = Partial<
  T extends (...args: any) => infer P ? P : T
>;

/**
 * If attrs type is a function (no type provided, inferring from usage), extract the return value
 * and merge it with the existing type to hole-punch any required fields that are satisfied as
 * a result of running attrs. Otherwise if we have a definite type then union the base props
 * with the passed attr type to capture any intended overrides.
 */
type ApplyAttrResultToProps<T extends Attrs<object>, Props extends object> = T extends (
  ...args: any
) => object
  ? UnionWithOptionalIntersectedFields<Props, InferAttrResultType<T>>
  : Props & InferAttrResultType<T>;

export interface Styled<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OuterProps extends object = Target extends KnownTarget
    ? React.ComponentPropsWithRef<Target>
    : object,
  OuterStatics extends object = object
> {
  <Props extends object = object, Statics extends object = object>(
    initialStyles: Styles<OuterProps & Props>,
    ...interpolations: Interpolation<OuterProps & Props>[]
  ): IStyledComponent<R, Target, OuterProps & Props> & OuterStatics & Statics;

  attrs: <T extends Attrs<object>>(
    attrs: Attrs<T extends object ? OuterProps & T : OuterProps>
  ) => Styled<R, Target, ApplyAttrResultToProps<T, OuterProps>, OuterStatics>;

  withConfig: (config: StyledOptions<R, OuterProps>) => Styled<R, Target, OuterProps, OuterStatics>;
}

export default function constructWithOptions<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OuterProps extends object = Target extends KnownTarget
    ? React.ComponentPropsWithRef<Target>
    : object,
  OuterStatics extends object = object
>(
  componentConstructor: IStyledComponentFactory<R, Target, OuterProps, OuterStatics>,
  tag: Target,
  options: StyledOptions<R, OuterProps> = EMPTY_OBJECT
): Styled<R, Target, OuterProps, OuterStatics> {
  // We trust that the tag is a valid component as long as it isn't falsish
  // Typically the tag here is a string or function (i.e. class or pure function component)
  // However a component may also be an object if it uses another utility, e.g. React.memo
  // React will output an appropriate warning however if the `tag` isn't valid
  if (!tag) {
    throw styledError(1, tag);
  }

  /* This is callable directly as a template function */
  const templateFunction = <Props extends object = object, Statics extends object = object>(
    initialStyles: Styles<OuterProps & Props>,
    ...interpolations: Interpolation<OuterProps & Props>[]
  ) =>
    componentConstructor<Props, Statics>(
      tag,
      options,
      css(initialStyles, ...interpolations) as RuleSet<OuterProps & Props>
    );

  /* Modify/inject new props at runtime */
  templateFunction.attrs = <T extends Attrs<object>>(
    attrs: Attrs<T extends object ? OuterProps & T : OuterProps>
  ) =>
    constructWithOptions<R, Target, ApplyAttrResultToProps<T, OuterProps>, OuterStatics>(
      componentConstructor as unknown as IStyledComponentFactory<
        R,
        Target,
        ApplyAttrResultToProps<T, OuterProps>,
        OuterStatics
      >,
      tag,
      {
        ...options,
        attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
      }
    );

  /**
   * If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = (config: StyledOptions<R, OuterProps>) =>
    constructWithOptions<R, Target, OuterProps, OuterStatics>(componentConstructor, tag, {
      ...options,
      ...config,
    });

  return templateFunction;
}
