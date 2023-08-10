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
import { EMPTY_ARRAY } from './empties';
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
  stylisInstance?: Stringifier | undefined
): RuleSet<Props> {
  if (isFalsish(chunk)) {
    return [];
  }

  /* Handle other components */
  if (isStyledComponent(chunk)) {
    return [`.${(chunk as unknown as IStyledComponent<'web', any>).styledComponentId}`];
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

      return flatten<Props>(result, executionContext, styleSheet, stylisInstance);
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

  /* Handle objects */
  if (isPlainObject(chunk)) {
    return objToCssArray(chunk as StyledObject<Props>);
  }

  if (!Array.isArray(chunk)) {
    return [chunk.toString()];
  }

  return flatMap(chunk, chunklet =>
    flatten<Props>(chunklet, executionContext, styleSheet, stylisInstance)
  );
}

function flatMap<T, U>(array: T[], transform: (value: T, index: number, array: T[]) => U[]): U[] {
  return Array.prototype.concat.apply(EMPTY_ARRAY, array.map(transform));
}
