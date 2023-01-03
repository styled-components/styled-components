import React from 'react';
import {
  Attrs,
  AttrsArg,
  ExecutionProps,
  Interpolation,
  IStyledComponent,
  IStyledComponentFactory,
  KnownTarget,
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
type OptionalIntersection<A, B> = {
  [K in Extract<keyof A, keyof B>]?: A[K];
};

type AttrsResult<T extends Attrs> = T extends (...args: any) => infer P ? P : T;

type ExtractAttrsTarget<
  R extends Runtime,
  P extends ExecutionProps,
  DefaultTarget extends StyledTarget<R>
> = P['as'] extends KnownTarget ? P['as'] : DefaultTarget;

/**
 * If attrs type is a function (no type provided, inferring from usage), extract the return value
 * and merge it with the existing type to hole-punch any required fields that are satisfied as
 * a result of running attrs. Otherwise if we have a definite type then union the base props
 * with the passed attr type to capture any intended overrides.
 */
type PropsSatisfiedByAttrs<
  T extends Attrs,
  Props extends object,
  Result extends ExecutionProps = AttrsResult<T>
> = Omit<Props, keyof Result> &
  OptionalIntersection<Props, Result> &
  Partial<Omit<Result, keyof Props | 'as'>>;

export interface Styled<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OuterProps extends object = object,
  OuterStatics extends object = object,
  RuntimeInjectedProps extends ExecutionProps = object
> {
  <Props extends object = object, Statics extends object = object>(
    initialStyles: Styles<OuterProps & RuntimeInjectedProps & Props>,
    ...interpolations: Interpolation<OuterProps & RuntimeInjectedProps & Props>[]
  ): // @ts-expect-error KnownTarget is a subset of StyledTarget<R>
  IStyledComponent<R, ExtractAttrsTarget<R, RuntimeInjectedProps, Target>, OuterProps & Props> &
    OuterStatics &
    Statics;

  attrs: <
    T extends Attrs,
    TResult extends ExecutionProps = AttrsResult<T>,
    // @ts-expect-error KnownTarget is a subset of StyledTarget<R>
    TTarget extends StyledTarget<R> = ExtractAttrsTarget<R, TResult, Target>
  >(
    attrs: AttrsArg<T extends (...args: any) => infer P ? OuterProps & P : OuterProps & T>
  ) => Styled<
    R,
    TTarget,
    PropsSatisfiedByAttrs<T, OuterProps>,
    OuterStatics,
    Omit<RuntimeInjectedProps, keyof TResult> & TResult
  >;

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
  ) => componentConstructor<Props, Statics>(tag, options, css(initialStyles, ...interpolations));

  /* Modify/inject new props at runtime */
  templateFunction.attrs = <T extends Attrs>(
    attrs: AttrsArg<T extends (...args: any) => infer P ? OuterProps & P : OuterProps & T>
  ) =>
    constructWithOptions<R, Target, PropsSatisfiedByAttrs<T, OuterProps>, OuterStatics>(
      componentConstructor as unknown as IStyledComponentFactory<
        R,
        Target,
        PropsSatisfiedByAttrs<T, OuterProps>,
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
