// @flow
import { isValidElementType } from 'react-is';
import css from './css';
import throwStyledError from '../utils/error';
import { EMPTY_OBJECT } from '../utils/empties';

import type {RealmScope, Target} from '../types';

export default function constructWithOptions(
  componentConstructor: Function,
  tag: Target,
  options: Object = EMPTY_OBJECT,
  realm: RealmScope | null = null
) {
  if (!isValidElementType(tag)) {
    return throwStyledError(1, String(tag));
  }

  /* This is callable directly as a template function */
  // $FlowFixMe: Not typed to avoid destructuring arguments
  const templateFunction = (...args) => componentConstructor(tag, options, css(...args), realm);

  /* If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = config =>
    constructWithOptions(componentConstructor, tag, { ...options, ...config }, realm);

  /* Modify/inject new props at runtime */
  templateFunction.attrs = attrs =>
    constructWithOptions(componentConstructor, tag, {
      ...options,
      attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
    }, realm);

  return templateFunction;
}
