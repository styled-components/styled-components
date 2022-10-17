import Keyframes from '../models/Keyframes';
import StyleSheet from '../sheet';
import {
  AnyComponent,
  Dict,
  ExecutionContext,
  Interpolation,
  IStyledComponent,
  RuleSet,
  Stringifier,
  StyledObject,
} from '../types';
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
const isFalsish = (chunk: any): chunk is undefined | null | false | '' =>
  chunk === undefined || chunk === null || chunk === false || chunk === '';

export const objToCssArray = (obj: Dict<any>, prevKey?: string): string[] => {
  const rules = [];

  for (const key in obj) {
    if (!obj.hasOwnProperty(key) || isFalsish(obj[key])) continue;

    if ((Array.isArray(obj[key]) && obj[key].isCss) || isFunction(obj[key])) {
      rules.push(`${hyphenate(key)}:`, obj[key], ';');
    } else if (isPlainObject(obj[key])) {
      rules.push(...objToCssArray(obj[key], key));
    } else {
      rules.push(`${hyphenate(key)}: ${addUnitIfNeeded(key, obj[key])};`);
    }
  }

  return prevKey ? [`${prevKey} {`, ...rules, '}'] : rules;
};

export default function flatten<Props extends object>(
  chunk: Interpolation<Props>,
  executionContext?: ExecutionContext & Props,
  styleSheet?: StyleSheet,
  stylisInstance?: Stringifier
): RuleSet<Props> {
  if (Array.isArray(chunk)) {
    const ruleSet: RuleSet<Props> = [];

    for (let i = 0, len = chunk.length, result; i < len; i += 1) {
      result = flatten<Props>(chunk[i], executionContext, styleSheet, stylisInstance);

      if (result.length === 0) continue;

      ruleSet.push(...result);
    }

    return ruleSet;
  }

  if (isFalsish(chunk)) {
    return [];
  }

  /* Handle other components */
  if (isStyledComponent(chunk)) {
    return [`.${(chunk as unknown as IStyledComponent<'web', 'div', any>).styledComponentId}`];
  }

  /* Either execute or defer the function */
  if (isFunction(chunk)) {
    if (isStatelessFunction(chunk) && executionContext) {
      const chunkFn = chunk as (props: {}) => Interpolation<Props>;
      const result = chunkFn(executionContext);

      if (
        process.env.NODE_ENV !== 'production' &&
        typeof result === 'object' &&
        !Array.isArray(result) &&
        !(result instanceof Keyframes) &&
        !isPlainObject(result)
      ) {
        // eslint-disable-next-line no-console
        console.error(
          `${getComponentName(
            chunkFn as AnyComponent
          )} is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.`
        );
      }

      return flatten(result, executionContext, styleSheet, stylisInstance);
    } else {
      return [chunk as unknown as IStyledComponent<'web', 'div', any>];
    }
  }

  if (chunk instanceof Keyframes) {
    if (styleSheet) {
      chunk.inject(styleSheet, stylisInstance);
      return [chunk.getName(stylisInstance)];
    } else {
      return [chunk];
    }
  }

  /* Handle objects */
  return isPlainObject(chunk) ? objToCssArray(chunk as StyledObject<Props>) : [chunk.toString()];
}
