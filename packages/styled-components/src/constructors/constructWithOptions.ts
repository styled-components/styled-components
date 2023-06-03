import React from 'react';
import {
  Interpolation,
  IStyledComponent,
  IStyledComponentFactory,
  NoInfer,
  Runtime,
  StyledComponentInnerComponent,
  StyledComponentProps,
  StyledOptions,
  StyledTarget,
  Styles,
  SubsetOnly,
  ThemedProps,
} from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import styledError from '../utils/error';
import css from './css';

type StyledComponentPropsWithRef<
  R extends Runtime,
  Target extends StyledTarget<R>
> = Target extends keyof JSX.IntrinsicElements | React.ComponentType<any>
  ? Target extends { readonly _sc: symbol }
    ? React.ComponentPropsWithRef<StyledComponentInnerComponent<R, Target>>
    : React.ComponentPropsWithRef<Target>
  : {};

type AttrPropValues<
  R extends Runtime,
  Target extends StyledTarget<R>,
  Props extends object
> = Partial<StyledComponentPropsWithRef<R, Target> & Props> & { [key: string]: any };

type AttrFactoryProps<
  R extends Runtime,
  Target extends StyledTarget<R>,
  Props extends object
> = ThemedProps<StyledComponentPropsWithRef<R, Target> & Props>;

type FactoryAsC<
  R extends Runtime,
  Target extends StyledTarget<R>,
  Factory extends (...args: any[]) => any
> = ReturnType<Factory> extends { as: infer AsC }
  ? AsC extends StyledTarget<R>
    ? AsC
    : Target
  : Target;

// Prevents functions
type AttrValueType<T> = T extends (() => any) | ((...args: any[]) => any) ? never : {};

type StrictAttrFactory<
  Factory extends (...args: any[]) => any,
  R extends Runtime,
  Target extends StyledTarget<R>,
  Props extends object
> = Factory extends (...args: any[]) => infer TResult
  ? TResult extends object & SubsetOnly<TResult, AttrPropValues<R, Target, Props>>
    ? (props: AttrFactoryProps<R, Target, Props>) => AttrPropValues<R, Target, Props>
    : never
  : never;

export interface Styled<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OtherProps extends object,
  AttrProps extends keyof any = never,
  OtherStatics extends object = {}
> {
  <MoreOtherProps extends object = {}, MoreStatics extends object = {}>(
    initialStyles: Styles<
      ThemedProps<StyledComponentPropsWithRef<R, Target> & OtherProps & NoInfer<MoreOtherProps>>
    >,
    ...interpolations: Interpolation<
      ThemedProps<StyledComponentPropsWithRef<R, Target> & OtherProps & NoInfer<MoreOtherProps>>
    >[]
  ): IStyledComponent<R, Target, OtherProps & NoInfer<MoreOtherProps>, AttrProps> &
    OtherStatics &
    MoreStatics;

  // .attrs({ as: "foo", prop: value })
  attrs<
    AsC extends StyledTarget<R> = Target,
    NewA extends AttrPropValues<R, Target, OtherProps> & { as?: AsC } = AttrPropValues<
      R,
      Target,
      OtherProps
    > & { as?: AsC }
  >(
    attrs: NewA & AttrValueType<NewA> & { as?: AsC }
  ): Styled<R, AsC, OtherProps & Omit<NewA, 'as'>, AttrProps | keyof NewA>;

  // .attrs<{ prop: value }>({ as: "foo", prop: value })
  attrs<
    NewProps extends object = never,
    AsC extends StyledTarget<R> = Target,
    NewA extends AttrPropValues<R, Target, OtherProps & NewProps> & { as?: AsC } = AttrPropValues<
      R,
      Target,
      OtherProps & NewProps
    > & { as?: AsC }
  >(
    attrs: NewA & AttrValueType<NewA> & { as?: AsC }
  ): Styled<R, AsC, OtherProps & Omit<NewProps, 'as'>, AttrProps | keyof NewA>;

  // .attrs(props => ({ prop: value }))
  attrs<
    AsC extends StyledTarget<R>,
    Factory extends (
      props: AttrFactoryProps<R, Target, OtherProps>
    ) => AttrPropValues<R, Target, OtherProps & { as?: AsC }>
  >(
    attrFactory: Factory & StrictAttrFactory<Factory, R, Target, OtherProps & { as?: AsC }>
  ): Styled<
    R,
    FactoryAsC<R, Target, Factory>,
    OtherProps & Omit<ReturnType<Factory>, 'as' | keyof StyledComponentPropsWithRef<R, Target>>,
    AttrProps | keyof ReturnType<Factory>
  >;

  // .attrs<{ prop: value }>(props => ({ prop: value }))
  attrs<
    NewProps extends object = {},
    AsC extends StyledTarget<R> = Target,
    Factory extends (
      props: AttrFactoryProps<R, Target, OtherProps & NoInfer<NewProps>>
    ) => AttrPropValues<R, Target, OtherProps & NoInfer<NewProps> & { as?: AsC }> = (
      props: AttrFactoryProps<R, Target, OtherProps & NoInfer<NewProps>>
    ) => AttrPropValues<R, Target, OtherProps & NoInfer<NewProps> & { as?: AsC }>
  >(
    attrFactory: Factory & StrictAttrFactory<Factory, R, Target, OtherProps & NoInfer<NewProps>>
  ): Styled<
    R,
    FactoryAsC<R, Target, Factory>,
    OtherProps & Omit<NewProps, 'as'>,
    AttrProps | keyof ReturnType<Factory>
  >;

  withConfig: <Props extends OtherProps = OtherProps>(
    config: StyledOptions<R, StyledComponentPropsWithRef<R, Target> & Props>
  ) => Styled<R, Target, Props, AttrProps>;
}

export default function constructWithOptions<
  R extends Runtime,
  Target extends StyledTarget<R>,
  OtherProps extends object = {},
  OtherStatics extends object = {}
>(
  componentConstructor: IStyledComponentFactory<R, Target, OtherProps, never, OtherStatics>,
  tag: Target,
  options: StyledOptions<R, StyledComponentProps<R, Target, OtherProps, never>> = EMPTY_OBJECT
): Styled<R, Target, OtherProps, never, OtherStatics> {
  // We trust that the tag is a valid component as long as it isn't falsish
  // Typically the tag here is a string or function (i.e. class or pure function component)
  // However a component may also be an object if it uses another utility, e.g. React.memo
  // React will output an appropriate warning however if the `tag` isn't valid
  if (!tag) {
    throw styledError(1, tag);
  }

  /* This is callable directly as a template function */
  const templateFunction = <MoreOtherProps extends object = {}, MoreStatics extends object = {}>(
    initialStyles: Styles<
      ThemedProps<StyledComponentPropsWithRef<R, Target> & OtherProps & NoInfer<MoreOtherProps>>
    >,
    ...interpolations: Interpolation<
      ThemedProps<StyledComponentPropsWithRef<R, Target> & OtherProps & NoInfer<MoreOtherProps>>
    >[]
  ): IStyledComponent<R, Target, OtherProps & NoInfer<MoreOtherProps>, never> &
    OtherStatics &
    MoreStatics =>
    componentConstructor<OtherStatics & MoreStatics>(
      tag,
      options,
      css<any>(initialStyles, ...interpolations)
    );

  /* Modify/inject new props at runtime */
  templateFunction.attrs = <NewProps extends object>(
    attrs: AttrPropValues<R, Target, OtherProps & NewProps> | AttrFactoryProps<R, Target, NewProps>
  ) =>
    constructWithOptions<R, Target, OtherProps & NewProps, OtherStatics>(
      componentConstructor,
      tag,
      {
        ...options,
        attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
      }
    );

  /**
   * If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = <Props extends OtherProps = OtherProps>(
    config: StyledOptions<R, StyledComponentPropsWithRef<R, Target> & Props>
  ) =>
    constructWithOptions<R, Target, any, OtherStatics>(componentConstructor, tag, {
      ...options,
      ...config,
    } as StyledOptions<R, StyledComponentProps<R, Target, any, never>>);

  return templateFunction;
}
