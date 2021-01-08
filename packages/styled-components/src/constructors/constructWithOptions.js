// @flow
import css from './css';
import throwStyledError from '../utils/error';
import { EMPTY_OBJECT } from '../utils/empties';

import type { Target } from '../types';

export default function constructWithOptions(
  componentConstructor: Function,
  tag: Target,
  options: Object = EMPTY_OBJECT
) {
  // We trust that the tag is a valid component as long as it isn't nullish
  // Typically the tag here is a string or function (i.e. class or pure function component)
  // However a component may also be an object if it uses another utility, e.g. React.memo
  // React will output an appropriate warning however if the `tag` isn't valid
  if (tag == null) {
    return throwStyledError(1, String(tag));
  }

  /* This is callable directly as a template function */
  // $FlowFixMe: Not typed to avoid destructuring arguments
  const templateFunction = (...args) => componentConstructor(tag, options, css(...args));

  /* If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = config =>
    constructWithOptions(componentConstructor, tag, { ...options, ...config });

  /* Modify/inject new props at runtime */
  templateFunction.attrs = attrs =>
    constructWithOptions(componentConstructor, tag, {
      ...options,
      attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
    });

  return templateFunction;
}
