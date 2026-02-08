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

export const objToCssArray = (obj: Dict<any>): string[] => {
  const rules = [];

  for (const key in obj) {
    const val = obj[key];
    if (!obj.hasOwnProperty(key) || isFalsish(val)) continue;

    // @ts-expect-error Property 'isCss' does not exist on type 'any[]'
    if ((Array.isArray(val) && val.isCss) || isFunction(val)) {
      rules.push(`${hyphenate(key)}:`, val, ';');
    } else if (isPlainObject(val)) {
      rules.push(`${key} {`, ...objToCssArray(val), '}');
    } else {
      rules.push(`${hyphenate(key)}: ${addUnitIfNeeded(key, val)};`);
    }
  }

  return rules;
};

export default function flatten<Props extends object>(
  chunk: Interpolation<object>,
  executionContext?: (ExecutionContext & Props) | undefined,
  styleSheet?: StyleSheet | undefined,
  stylisInstance?: Stringifier | undefined,
  result: RuleSet<Props> = []
): RuleSet<Props> {
  if (typeof chunk === 'string') {
    if (chunk) result.push(chunk);
    return result;
  }

  if (isFalsish(chunk)) {
    return result;
  }

  /* Handle other components */
  if (isStyledComponent(chunk)) {
    result.push(`.${(chunk as unknown as IStyledComponent<'web', any>).styledComponentId}`);
    return result;
  }

  /* Either execute or defer the function */
  if (isFunction(chunk)) {
    if (isStatelessFunction(chunk) && executionContext) {
      const fnResult = chunk(executionContext);

      if (
        process.env.NODE_ENV !== 'production' &&
        typeof fnResult === 'object' &&
        !Array.isArray(fnResult) &&
        !(fnResult instanceof Keyframes) &&
        !isPlainObject(fnResult) &&
        fnResult !== null
      ) {
        console.error(
          `${getComponentName(
            chunk as AnyComponent
          )} is not a styled component and cannot be referred to via component selector. See https://www.styled-components.com/docs/advanced#referring-to-other-components for more details.`
        );
      }

      return flatten<Props>(fnResult, executionContext, styleSheet, stylisInstance, result);
    } else {
      result.push(chunk as unknown as IStyledComponent<'web'>);
      return result;
    }
  }

  if (chunk instanceof Keyframes) {
    if (styleSheet) {
      chunk.inject(styleSheet, stylisInstance);
      result.push(chunk.getName(stylisInstance));
    } else {
      result.push(chunk);
    }
    return result;
  }

  /* Handle objects */
  if (isPlainObject(chunk)) {
    const cssArr = objToCssArray(chunk as StyledObject<Props>);
    for (let i = 0; i < cssArr.length; i++) result.push(cssArr[i]);
    return result;
  }

  if (!Array.isArray(chunk)) {
    result.push(chunk.toString());
    return result;
  }

  for (let i = 0; i < chunk.length; i++) {
    flatten<Props>(chunk[i], executionContext, styleSheet, stylisInstance, result);
  }

  return result;
}
