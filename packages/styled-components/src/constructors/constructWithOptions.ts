import {
  Attrs,
  Interpolation,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledNativeComponent,
  IStyledNativeComponentFactory,
  NativeTarget,
  RuleSet,
  StyledNativeOptions,
  StyledOptions,
  StyledTarget,
  Styles,
  WebTarget,
} from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import styledError from '../utils/error';
import css from './css';

export interface NativeStyled<
  Target extends NativeTarget,
  OuterProps = unknown,
  OuterStatics = unknown
> {
  <Props = unknown, Statics = unknown>(
    initialStyles: Styles<OuterProps & Props>,
    ...interpolations: Exclude<Interpolation<OuterProps & Props>, IStyledComponent<any>>[]
  ): IStyledNativeComponent<Target, OuterProps & Props> & OuterStatics & Statics;
  attrs(attrs: Attrs<OuterProps>): NativeStyled<Target, OuterProps, OuterStatics>;
  withConfig(
    config: StyledNativeOptions<OuterProps>
  ): NativeStyled<Target, OuterProps, OuterStatics>;
}

export interface WebStyled<Target extends WebTarget, OuterProps = unknown, OuterStatics = unknown> {
  <Props = unknown, Statics = unknown>(
    initialStyles: Styles<OuterProps & Props>,
    ...interpolations: Interpolation<OuterProps & Props>[]
  ): IStyledComponent<Target, OuterProps & Props> & OuterStatics & Statics;
  attrs(attrs: Attrs<OuterProps>): WebStyled<Target, OuterProps, OuterStatics>;
  withConfig(config: StyledOptions<OuterProps>): WebStyled<Target, OuterProps, OuterStatics>;
}

export default function constructWithOptions<
  Environment extends 'web' | 'native',
  Target extends StyledTarget,
  OuterProps = unknown, // used for styled<{}>().attrs() so attrs() gets the generic prop context
  OuterStatics = unknown
>(
  componentConstructor: Environment extends 'web'
    ? IStyledComponentFactory<any, any, any>
    : IStyledNativeComponentFactory<any, any, any>,
  tag: Target,
  options: Environment extends 'web'
    ? StyledOptions<OuterProps>
    : StyledNativeOptions<OuterProps> = EMPTY_OBJECT as StyledOptions<OuterProps>
) {
  // We trust that the tag is a valid component as long as it isn't falsish
  // Typically the tag here is a string or function (i.e. class or pure function component)
  // However a component may also be an object if it uses another utility, e.g. React.memo
  // React will output an appropriate warning however if the `tag` isn't valid
  if (!tag) {
    throw styledError(1, tag);
  }

  /* This is callable directly as a template function */
  const templateFunction = <Props = unknown, Statics = unknown>(
    initialStyles: Styles<OuterProps & Props>,
    ...interpolations: Interpolation<OuterProps & Props>[]
  ) =>
    componentConstructor(
      tag,
      options as unknown as Environment extends 'web'
        ? StyledOptions<OuterProps & Props>
        : StyledNativeOptions<OuterProps & Props>,
      css<OuterProps & Props>(initialStyles, ...interpolations) as RuleSet<OuterProps & Props>
    ) as ReturnType<
      Environment extends 'web'
        ? IStyledComponentFactory<Target, OuterProps & Props, OuterStatics & Statics>
        : // @ts-expect-error compiler is not narrowing properly
          IStyledNativeComponentFactory<Target, OuterProps & Props, OuterStatics & Statics>
    >;

  /* Modify/inject new props at runtime */
  templateFunction.attrs = (attrs: Attrs<OuterProps>) =>
    constructWithOptions<Environment, Target, OuterProps, OuterStatics>(componentConstructor, tag, {
      ...options,
      attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
    });

  /**
   * If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = (
    config: Environment extends 'web' ? StyledOptions<OuterProps> : StyledNativeOptions<OuterProps>
  ) =>
    constructWithOptions<Environment, Target, OuterProps, OuterStatics>(componentConstructor, tag, {
      ...options,
      ...config,
    });

  return templateFunction;
}
