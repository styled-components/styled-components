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

/**
 * It's falsish not falsy because 0 is allowed.
 */
const isFalsish = chunk => chunk === undefined || chunk === null || chunk === false || chunk === '';

/**
 * Reduces over the object converting into a template string args array.
 */
export const objToCssArray = (
  obj: Object,
  styleSheet: ?Object,
  executionContext: ?Object,
  prevKey?: string
): Array<string | Function> => {
  const rules = Object.keys(obj).reduce((acc, key) => {
    const val = obj[key];
    if (isFalsish(val)) return acc;

    if (isPlainObject(val)) {
      return acc.concat(objToCssArray(val, styleSheet, executionContext, key));
    } else if (isFunction(val)) {
      return acc.concat(`${hyphenate(key)}:`, val, ';');
    } else if (Array.isArray(val) && val.isCss) {
      return acc.concat(
        `${hyphenate(key)}:`,
        // eslint-disable-next-line no-use-before-define
        flatten(val, executionContext, styleSheet),
        prevKey ? ';}' : ';'
      );
    }
    return acc.concat(`${hyphenate(key)}: ${addUnitIfNeeded(key, val)};`);
  }, []);
  return prevKey ? [`${prevKey} {`, ...rules, '}'] : rules;
};

export default function flatten(chunk: any, executionContext: ?Object, styleSheet: ?Object): any {
  if (Array.isArray(chunk)) {
    const ruleSet = [];

    for (let i = 0, len = chunk.length, result; i < len; i += 1) {
      result = flatten(chunk[i], executionContext, styleSheet);

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

      return flatten(result, executionContext, styleSheet);
    } else return chunk;
  }

  if (chunk instanceof Keyframes) {
    if (styleSheet) {
      chunk.inject(styleSheet);
      return chunk.getName();
    } else return chunk;
  }

  /* Handle objects */
  return isPlainObject(chunk)
    ? objToCssArray(chunk, styleSheet, executionContext)
    : chunk.toString();
}
