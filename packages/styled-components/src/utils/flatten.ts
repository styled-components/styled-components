import { isElement } from 'react-is';
import Keyframes from '../models/Keyframes';
import StyleSheet from '../sheet';
import { ExtensibleObject, Interpolation, IStyledComponent, RuleSet, Stringifier } from '../types';
import addUnitIfNeeded from './addUnitIfNeeded';
import getComponentName from './getComponentName';
import hyphenate from './hyphenateStyleName';
import isFunction from './isFunction';
import isPlainObject from './isPlainObject';
import isStatelessFunction from './isStatelessFunction';
import isStyledComponent from './isStyledComponent';

/**
 * It's falsish not falsy because 0 is allowed.
 */
const isFalsish = (chunk: any) =>
  chunk === undefined || chunk === null || chunk === false || chunk === '';

export const objToCssArray = (obj: ExtensibleObject, prevKey?: string): string[] => {
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
  chunk: Interpolation,
  executionContext?: ExtensibleObject,
  styleSheet?: StyleSheet,
  stylisInstance?: Stringifier
): RuleSet {
  if (Array.isArray(chunk)) {
    const ruleSet: RuleSet = [];

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
    return `.${(chunk as IStyledComponent).styledComponentId}`;
  }

  /* Either execute or defer the function */
  if (isFunction(chunk)) {
    if (isStatelessFunction(chunk) && executionContext) {
      const chunkFn = chunk as Function;
      const result = chunkFn(executionContext);

      if (process.env.NODE_ENV !== 'production' && isElement(result)) {
        // eslint-disable-next-line no-console
        console.error(
          `${getComponentName(
            chunkFn as React.ComponentType<any>
          )} is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.`
        );
      }

      return flatten(result, executionContext, styleSheet, stylisInstance);
    } else return chunk as IStyledComponent;
  }

  if (chunk instanceof Keyframes) {
    if (styleSheet) {
      chunk.inject(styleSheet, stylisInstance);
      return chunk.getName(stylisInstance);
    } else return chunk;
  }

  /* Handle objects */
  return isPlainObject(chunk) ? objToCssArray(chunk as ExtensibleObject) : chunk.toString();
}
