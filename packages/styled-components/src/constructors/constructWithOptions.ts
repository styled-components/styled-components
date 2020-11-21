import { isValidElementType } from 'react-is';
import {
  Attrs,
  Interpolation,
  IStyledComponentFactory,
  StyledObject,
  StyleFunction,
  WebTarget,
} from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import styledError from '../utils/error';
import css from './css';

type Options = {
  attrs?: Attrs[];
  componentId?: string;
  displayName?: string;
};

export default function constructWithOptions<
  Constructor extends Function = IStyledComponentFactory,
  OuterProps = undefined // used for styled<{}>().attrs() so attrs() gets the generic prop context
>(componentConstructor: Constructor, tag: WebTarget, options: Options = EMPTY_OBJECT as Object) {
  if (!isValidElementType(tag)) {
    throw styledError(1, tag);
  }

  /* This is callable directly as a template function */
  const templateFunction = <Props = OuterProps>(
    initialStyles: TemplateStringsArray | StyledObject | StyleFunction<Props>,
    ...interpolations: Interpolation<Props>[]
  ) => componentConstructor(tag, options, css(initialStyles, ...interpolations));

  /* Modify/inject new props at runtime */
  templateFunction.attrs = <Props = OuterProps>(attrs: Attrs<Props>) =>
    constructWithOptions<Constructor, Props>(componentConstructor, tag, {
      ...options,
      attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
    });

  /**
   * If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = (config: Options) =>
    constructWithOptions<Constructor, OuterProps>(componentConstructor, tag, {
      ...options,
      ...config,
    });

  return templateFunction;
}
