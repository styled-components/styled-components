import {
  Attrs,
  ExecutionContext,
  Interpolation,
  IStyledComponent,
  IStyledComponentFactory,
  IStyledNativeComponent,
  IStyledNativeComponentFactory,
  KnownTarget,
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
  DerivedProps = Target extends KnownTarget ? React.ComponentProps<Target> : unknown,
  OuterProps = unknown,
  OuterStatics = unknown
> {
  <Props = unknown, Statics = unknown>(
    initialStyles: Styles<DerivedProps & OuterProps & Props>,
    ...interpolations: Exclude<
      Interpolation<ExecutionContext & DerivedProps & OuterProps & Props>,
      IStyledComponent<any>
    >[]
  ): IStyledNativeComponent<Target, DerivedProps & OuterProps & Props> & OuterStatics & Statics;
  attrs(
    attrs: Attrs<ExecutionContext & DerivedProps & OuterProps>
  ): NativeStyled<Target, DerivedProps, OuterProps, OuterStatics>;
  withConfig(
    config: StyledNativeOptions<DerivedProps & OuterProps>
  ): NativeStyled<Target, DerivedProps, OuterProps, OuterStatics>;
}

export interface WebStyled<
  Target extends WebTarget,
  DerivedProps = Target extends KnownTarget ? React.ComponentProps<Target> : unknown,
  OuterProps = unknown,
  OuterStatics = unknown
> {
  <Props = unknown, Statics = unknown>(
    initialStyles: Styles<DerivedProps & OuterProps & Props>,
    ...interpolations: Interpolation<ExecutionContext & DerivedProps & OuterProps & Props>[]
  ): IStyledComponent<Target, DerivedProps & OuterProps & Props> & OuterStatics & Statics;
  attrs(
    attrs: Attrs<ExecutionContext & DerivedProps & OuterProps>
  ): WebStyled<Target, DerivedProps, OuterProps, OuterStatics>;
  withConfig(
    config: StyledOptions<DerivedProps & OuterProps>
  ): WebStyled<Target, DerivedProps, OuterProps, OuterStatics>;
}

export default function constructWithOptions<
  Environment extends 'web' | 'native',
  Target extends StyledTarget,
  DerivedProps = Target extends KnownTarget ? React.ComponentProps<Target> : unknown,
  OuterProps = unknown, // used for styled<{}>().attrs() so attrs() gets the generic prop context
  OuterStatics = unknown
>(
  componentConstructor: Environment extends 'web'
    ? IStyledComponentFactory<any, any, any>
    : IStyledNativeComponentFactory<any, any, any>,
  tag: Target,
  options: Environment extends 'web'
    ? StyledOptions<DerivedProps & OuterProps>
    : StyledNativeOptions<DerivedProps & OuterProps> = EMPTY_OBJECT as StyledOptions<
    DerivedProps & OuterProps
  >
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
    initialStyles: Styles<DerivedProps & OuterProps & Props>,
    ...interpolations: Interpolation<ExecutionContext & DerivedProps & OuterProps & Props>[]
  ) =>
    componentConstructor(
      tag,
      options as unknown as Environment extends 'web'
        ? StyledOptions<DerivedProps & OuterProps & Props>
        : StyledNativeOptions<DerivedProps & OuterProps & Props>,
      css<ExecutionContext & DerivedProps & OuterProps & Props>(
        initialStyles,
        ...interpolations
      ) as RuleSet<DerivedProps & OuterProps & Props>
    ) as ReturnType<
      Environment extends 'web'
        ? IStyledComponentFactory<Target, DerivedProps & OuterProps & Props, OuterStatics & Statics>
        : IStyledNativeComponentFactory<
            // @ts-expect-error compiler is not narrowing properly
            Target,
            DerivedProps & OuterProps & Props,
            OuterStatics & Statics
          >
    >;

  /* Modify/inject new props at runtime */
  templateFunction.attrs = (attrs: Attrs<ExecutionContext & DerivedProps & OuterProps>) =>
    constructWithOptions<Environment, Target, DerivedProps & OuterProps, OuterStatics>(
      componentConstructor,
      tag,
      {
        ...options,
        attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
      }
    );

  /**
   * If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = (
    config: Environment extends 'web'
      ? StyledOptions<DerivedProps & OuterProps>
      : StyledNativeOptions<DerivedProps & OuterProps>
  ) =>
    constructWithOptions<Environment, Target, DerivedProps, OuterProps, OuterStatics>(
      componentConstructor,
      tag,
      {
        ...options,
        ...config,
      }
    );

  return templateFunction;
}
