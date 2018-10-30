// @flow
import { isValidElementType } from 'react-is';
import css from './css';
import StyledError from '../utils/error';
import { EMPTY_OBJECT } from '../utils/empties';
import processAttrs from '../utils/processAttrs';
import isStaticAttrsObject from '../utils/isStaticAttrsObject';

import type { Attrs, ConstructorOptions, Context, Target } from '../types';

const defaultOptions = {
  // assume that attrs are static by default - they will be checked anyway
  withStaticAttrs: true,
};

export default function constructWithOptions(
  componentConstructor: Function,
  tag: Target,
  options: ConstructorOptions = defaultOptions
) {
  if (!isValidElementType(tag)) {
    throw new StyledError(1, String(tag));
  }

  /* This is callable directly as a template function */
  // $FlowFixMe: Not typed to avoid destructuring arguments
  const templateFunction = (...args) => componentConstructor(tag, options, css(...args));

  /* If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = config =>
    constructWithOptions(componentConstructor, tag, { ...options, ...config });
  templateFunction.attrs = (attrs?: Attrs) =>
    constructWithOptions(componentConstructor, tag, {
      ...options,
      // eagerly check whether the attrs are static (not dependant on props)
      withStaticAttrs: options.withStaticAttrs && isStaticAttrsObject(attrs),
      // wrap the attrs into a resolver function which knows how to extract attrs
      // either from a plain object or factory function [.attrs(props => ({}))]
      attrs: (context: Context): Object => ({
        ...processAttrs(options.attrs || EMPTY_OBJECT, context),
        ...processAttrs(attrs, context),
      }),
    });

  return templateFunction;
}
