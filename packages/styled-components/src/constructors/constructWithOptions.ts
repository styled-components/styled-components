import createStyledComponent from '../models/StyledComponent';
import {
  Attrs,
  Interpolation,
  IStyledComponent,
  IStyledComponentFactory,
  RuleSet,
  StyledOptions,
  StyledTarget,
  Styles,
} from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import styledError from '../utils/error';
import css from './css';

export interface Styled<Target extends StyledTarget, OuterProps = {}, OuterStatics = {}> {
  <Props = {}, Statics = {}>(
    initialStyles: Styles<OuterProps & Props>,
    ...interpolations: Interpolation<OuterProps & Props>[]
  ): IStyledComponent<Target, OuterProps & Props> & OuterStatics & Statics;
  attrs<Props = OuterProps, Statics = {}>(
    attrs: Attrs<OuterProps & Props>
  ): Styled<Target, OuterProps & Props, OuterStatics & Statics>;
  withConfig<Props = OuterProps, Statics = {}>(
    config: StyledOptions<OuterProps & Props>
  ): Styled<Target, OuterProps & Props, OuterStatics & Statics>;
}
export interface Construct<
  Target extends StyledTarget,
  OuterProps = {}, // used for styled<{}>().attrs() so attrs() gets the generic prop context,
  OuterStatics = {}
> {
  <Props = {}, Statics = {}>(
    componentConstructor: IStyledComponentFactory<Target, OuterProps & Props>,
    tag: Target,
    options?: StyledOptions<OuterProps & Props>
  ): Styled<Target, OuterProps & Props, OuterStatics & Statics>;
  attrs<Props = {}, Statics = {}>(
    attrs: Attrs<OuterProps & Props>
  ): Construct<Target, OuterProps & Props, Statics>;
  withConfig<Props = {}, Statics = {}>(
    config: StyledOptions<OuterProps & Props>
  ): Construct<Target, OuterProps & Props, OuterStatics & Statics>;
}

export default function constructWithOptions<
  Target extends StyledTarget,
  OuterProps = {}, // used for styled<{}>().attrs() so attrs() gets the generic prop context
  OuterStatics = {}
>(
  componentConstructor: typeof createStyledComponent,
  tag: Target,
  options: StyledOptions<OuterProps> = EMPTY_OBJECT as StyledOptions<OuterProps>
) {
  // We trust that the tag is a valid component as long as it isn't falsish
  // Typically the tag here is a string or function (i.e. class or pure function component)
  // However a component may also be an object if it uses another utility, e.g. React.memo
  // React will output an appropriate warning however if the `tag` isn't valid
  if (!tag) {
    throw styledError(1, tag);
  }

  /* This is callable directly as a template function */
  const templateFunction = <Props = {}, Statics = {}>(
    initialStyles: Styles<OuterProps & Props>,
    ...interpolations: Interpolation<OuterProps & Props>[]
  ) =>
    componentConstructor<Target, OuterProps & Props, OuterStatics & Statics>(
      tag,
      options as unknown as StyledOptions<OuterProps & Props>,
      css<OuterProps & Props>(initialStyles, ...interpolations) as RuleSet<OuterProps & Props>
    );

  /* Modify/inject new props at runtime */
  templateFunction.attrs = <Props = {}, Statics = {}>(attrs: Attrs<OuterProps & Props>) =>
    constructWithOptions<Target, OuterProps & Props, OuterStatics & Statics>(
      componentConstructor,
      tag,
      {
        ...options,
        attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
      }
    );

  /**
   * If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = <Props = {}, Statics = {}>(
    config: StyledOptions<OuterProps & Props>
  ) =>
    constructWithOptions<Target, OuterProps & Props, OuterStatics & Statics>(
      componentConstructor,
      tag,
      {
        ...options,
        ...config,
      } as StyledOptions<OuterProps & Props>
    );

  return templateFunction;
}
