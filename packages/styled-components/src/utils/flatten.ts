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
      const result = chunk(executionContext);

      if (
        process.env.NODE_ENV !== 'production' &&
        typeof result === 'object' &&
        !Array.isArray(result) &&
        !(result instanceof Keyframes) &&
        !isPlainObject(result) &&
        result !== null
      ) {
        console.error(
          `${getComponentName(
            chunk as AnyComponent
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
  if (isPlainObject(chunk)) {
    return objToCssArray(chunk as StyledObject<Props>);
  }

  if (!Array.isArray(chunk)) {
    return [chunk.toString()];
  }

  /* Handle objects */
  return chunk.flatMap(chunklet =>
    flatten<Props>(chunklet, executionContext, styleSheet, stylisInstance)
  );
}
