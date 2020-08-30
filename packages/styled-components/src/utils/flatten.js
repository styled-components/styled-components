// @flow
import { isElement } from 'react-is';
import getComponentName from './getComponentName';
import isFunction from './isFunction';
import isStatelessFunction from './isStatelessFunction';
import isPlainObject from './isPlainObject';
import isStyledComponent from './isStyledComponent';
import Keyframes from '../models/Keyframes';
import hyphenate from './hyphenateStyleName';
import addUnitIfNeeded from './addUnitIfNeeded';
import { type Stringifier } from '../types';

/**
 * It's falsish not falsy because 0 is allowed.
 */
const isFalsish = chunk => chunk === undefined || chunk === null || chunk === false || chunk === '';

export const objToCssArray = (obj: Object, prevKey?: string): Array<string | Function> => {
  const rules = [];

  for (const key in obj) {
    if (!obj.hasOwnProperty(key) || isFalsish(obj[key])) continue;

    if (isPlainObject(obj[key])) {
      rules.push(...objToCssArray(obj[key], key));
    } else if (isFunction(obj[key])) {
      rules.push(`${hyphenate(key)}:`, obj[key], ';');
    } else {
      rules.push(`${hyphenate(key)}: ${addUnitIfNeeded(key, obj[key])};`);
    }
  }

  return prevKey ? [`${prevKey} {`, ...rules, '}'] : rules;
};

export default function flatten(
  chunk: any,
  executionContext: ?Object,
  styleSheet: ?Object,
  stylisInstance: ?Stringifier
): any {
  if (Array.isArray(chunk)) {
    const ruleSet = [];

    for (let i = 0, len = chunk.length, result; i < len; i += 1) {
      result = flatten(chunk[i], executionContext, styleSheet, stylisInstance);

      if (result === '') continue;
      else if (Array.isArray(result)) ruleSet.push(...result);
      else ruleSet.push(result);
    }

    return ruleSet;
  }

  if (isFalsish(chunk)) {
    return '';
  }

  /* Handle other components */
  if (isStyledComponent(chunk)) {
    return `.${chunk.styledComponentId}`;
  }

  /* Either execute or defer the function */
  if (isFunction(chunk)) {
    if (isStatelessFunction(chunk) && executionContext) {
      const result = chunk(executionContext);

      if (process.env.NODE_ENV !== 'production' && isElement(result)) {
        // eslint-disable-next-line no-console
        console.warn(
          `${getComponentName(
            chunk
          )} is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.`
        );
      }

      return flatten(result, executionContext, styleSheet, stylisInstance);
    } else return chunk;
  }

  if (chunk instanceof Keyframes) {
    if (styleSheet) {
      chunk.inject(styleSheet, stylisInstance);
      return chunk.getName(stylisInstance);
    } else return chunk;
  }

  /* Handle objects */
  return isPlainObject(chunk) ? objToCssArray(chunk) : chunk.toString();
}
