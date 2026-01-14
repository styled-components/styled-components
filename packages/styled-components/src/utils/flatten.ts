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
const isFalsish = (chunk: unknown): chunk is undefined | null | false | '' =>
  chunk === undefined || chunk === null || chunk === false || chunk === '';

export function objToCssArray(obj: Dict<unknown>, result: unknown[] = []): unknown[] {
  for (const key in obj) {
    const val = obj[key];
    if (!obj.hasOwnProperty(key) || isFalsish(val)) continue;

    if ((Array.isArray(val) && (val as unknown[] & { isCss?: boolean }).isCss) || isFunction(val)) {
      result.push(`${hyphenate(key)}:`, val, ';');
    } else if (isPlainObject(val)) {
      result.push(`${key} {`);
      objToCssArray(val as Dict<unknown>, result);
      result.push('}');
    } else {
      result.push(`${hyphenate(key)}: ${addUnitIfNeeded(key, val)};`);
    }
  }

  return result;
}

function flattenInto<Props extends object>(
  chunk: Interpolation<object>,
  result: RuleSet<Props>,
  executionContext: (ExecutionContext & Props) | undefined,
  styleSheet: StyleSheet | undefined,
  stylisInstance: Stringifier | undefined
): void {
  if (isFalsish(chunk)) {
    return;
  }

  if (isStyledComponent(chunk)) {
    result.push(`.${(chunk as unknown as IStyledComponent<'web', Props>).styledComponentId}`);
    return;
  }

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

      flattenInto(fnResult, result, executionContext, styleSheet, stylisInstance);
    } else {
      result.push(chunk as unknown as IStyledComponent<'web'>);
    }
    return;
  }

  if (chunk instanceof Keyframes) {
    if (styleSheet) {
      chunk.inject(styleSheet, stylisInstance);
      result.push(chunk.getName(stylisInstance));
    } else {
      result.push(chunk);
    }
    return;
  }

  if (isPlainObject(chunk)) {
    objToCssArray(chunk as Dict<unknown>, result as unknown[]);
    return;
  }

  if (!Array.isArray(chunk)) {
    result.push(chunk.toString());
    return;
  }

  for (let i = 0; i < chunk.length; i++) {
    flattenInto(chunk[i], result, executionContext, styleSheet, stylisInstance);
  }
}

export default function flatten<Props extends object>(
  chunk: Interpolation<object>,
  executionContext?: (ExecutionContext & Props) | undefined,
  styleSheet?: StyleSheet | undefined,
  stylisInstance?: Stringifier | undefined
): RuleSet<Props> {
  if (isFalsish(chunk)) {
    return [];
  }

  if (isStyledComponent(chunk)) {
    return [`.${(chunk as unknown as IStyledComponent<'web', Props>).styledComponentId}`];
  }

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

      return flatten<Props>(fnResult, executionContext, styleSheet, stylisInstance);
    } else {
      return [chunk as unknown as IStyledComponent<'web'>];
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

  if (isPlainObject(chunk)) {
    return objToCssArray(chunk as Dict<unknown>) as RuleSet<Props>;
  }

  if (!Array.isArray(chunk)) {
    return [chunk.toString()];
  }

  const result: RuleSet<Props> = [];
  for (let i = 0; i < chunk.length; i++) {
    flattenInto(chunk[i], result, executionContext, styleSheet, stylisInstance);
  }
  return result;
}
