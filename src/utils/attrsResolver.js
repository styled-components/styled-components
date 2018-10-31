// @flow
import React from 'react';
import isFunction from './isFunction';
import isDerivedReactComponent from './isDerivedReactComponent';
import isStyledComponent from './isStyledComponent';
import type { Attrs, AttrsResolver, Context } from '../types';

function resolveAttrs(attrs: Attrs, context: Context): Object {
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

/**
 * Creates new attributes resolver function based on given attrs configuration.
 *
 * When the resolver function is invoked, it will return a plain object
 * with keys set as attribute names and their respective evaluated values.
 */
export default function createAttrsResolver(...attrs: Array<?Attrs>): AttrsResolver {
  const nonNullAttrs: Array<Attrs> = attrs.filter(Boolean);
  return function attrsResolver(context: Context): Object {
    return nonNullAttrs.reduce(
      (mergedAttrs, attr) => Object.assign(mergedAttrs, resolveAttrs(attr, context)),
      {}
    );
  };
}
