import { isValidElementType } from 'react-is';
import { Attrs, Interpolation, StyledObject, WebTarget } from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import styledError from '../utils/error';
import css from './css';

type Options = {
  attrs?: Attrs[];
  componentId?: string;
  displayName?: string;
};

export default function constructWithOptions<
  Constructor extends (...args: any[]) => React.ComponentType<any>
>(componentConstructor: Constructor, tag: WebTarget, options: Options = EMPTY_OBJECT as Object) {
  if (!isValidElementType(tag)) {
    throw styledError(1, tag);
  }

  /* This is callable directly as a template function */
  const templateFunction = (
    initialStyles: TemplateStringsArray | StyledObject,
    ...interpolations: Interpolation[]
  ) =>
    componentConstructor(
      tag,
      options,
      css(initialStyles, ...interpolations)
    ) as ReturnType<Constructor>;

  /**
   * If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = (config: Options) =>
    constructWithOptions<Constructor>(componentConstructor, tag, { ...options, ...config });

  /* Modify/inject new props at runtime */
  templateFunction.attrs = (attrs: Attrs) =>
    constructWithOptions<Constructor>(componentConstructor, tag, {
      ...options,
      attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
    });

  return templateFunction;
}
