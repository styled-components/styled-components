// @flow
import React from 'react';
import isFunction from './isFunction';
import isDerivedReactComponent from './isDerivedReactComponent';
import isStyledComponent from './isStyledComponent';
import type { Attrs, Context } from '../types';

export default function processAttrs(attrs?: Attrs, context: Context): Object {
  if (typeof attrs === 'function') {
    return attrs(context);
  }

  // TODO: add object-attrs deprecation warning maybe?

  const finalAttrs = {};
  let attr;
  let key;
  // eslint-disable-next-line guard-for-in
  for (key in attrs) {
    attr = attrs[key];

    if (isFunction(attr) && !isDerivedReactComponent(attr) && !isStyledComponent(attr)) {
      attr = attr(context);

      if (process.env.NODE_ENV !== 'production' && React.isValidElement(attr)) {
        // eslint-disable-next-line no-console
        console.warn(
          `It looks like you've used a component as value for the ${key} prop in the attrs constructor.\n` +
            "You'll need to wrap it in a function to make it available inside the styled component.\n" +
            `For example, { ${key}: () => InnerComponent } instead of { ${key}: InnerComponent }`
        );
      }
    }

    finalAttrs[key] = attr;
  }

  return finalAttrs;
}
