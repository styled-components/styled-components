import {
  Attrs,
  ExecutionContext,
  ExtensibleObject,
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

export interface Styled<
  R extends Runtime,
  Target extends StyledTarget<R>,
  DerivedProps = Target extends KnownTarget ? React.ComponentProps<Target> : unknown,
  OuterProps extends {} = {},
  OuterStatics = unknown
> {
  <Props = unknown, Statics = unknown>(
    initialStyles: Styles<DerivedProps & OuterProps & Props>,
    ...interpolations: Interpolation<ExecutionContext & DerivedProps & OuterProps & Props>[]
  ): IStyledComponent<R, Target, DerivedProps & OuterProps & Props> & OuterStatics & Statics;
  attrs(
    attrs: Attrs<ExtensibleObject & DerivedProps & OuterProps>
  ): Styled<R, Target, DerivedProps, OuterProps, OuterStatics>;
  withConfig(
    config: StyledOptions<R, DerivedProps & OuterProps>
  ): Styled<R, Target, DerivedProps, OuterProps, OuterStatics>;
}

export default function constructWithOptions<
  R extends Runtime,
  Target extends StyledTarget<R>,
  DerivedProps = Target extends KnownTarget ? React.ComponentProps<Target> : unknown,
  OuterProps = unknown, // used for styled<{}>().attrs() so attrs() gets the generic prop context
  OuterStatics = unknown
>(
  componentConstructor: IStyledComponentFactory<R, any, any, any>,
  tag: Target,
  options: StyledOptions<R, DerivedProps & OuterProps> = EMPTY_OBJECT as StyledOptions<
    R,
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
  const templateFunction = <Props extends {} = {}, Statics = unknown>(
    initialStyles: Styles<DerivedProps & OuterProps & Props>,
    ...interpolations: Interpolation<ExecutionContext & DerivedProps & OuterProps & Props>[]
  ) =>
    componentConstructor(
      tag,
      options as unknown as StyledOptions<R, DerivedProps & OuterProps & Props>,
      css<ExecutionContext & DerivedProps & OuterProps & Props>(
        initialStyles,
        ...interpolations
      ) as RuleSet<DerivedProps & OuterProps & Props>
    ) as ReturnType<
      IStyledComponentFactory<R, Target, DerivedProps & OuterProps & Props, OuterStatics & Statics>
    >;

  /* Modify/inject new props at runtime */
  templateFunction.attrs = (attrs: Attrs<ExtensibleObject & DerivedProps & OuterProps>) =>
    constructWithOptions<R, Target, DerivedProps & OuterProps, OuterStatics>(
      componentConstructor,
      tag,
      {
        ...options,
        attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
      }
    );

  /**
   * If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = (config: StyledOptions<R, DerivedProps & OuterProps>) =>
    constructWithOptions<R, Target, DerivedProps, OuterProps, OuterStatics>(
      componentConstructor,
      tag,
      {
        ...options,
        ...config,
      }
    );

  return templateFunction;
}
