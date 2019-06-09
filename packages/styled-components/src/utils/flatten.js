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

type ObjectToCSSArrayProps = {
  chunk: Object,
  executionContext?: Object,
  prevKey?: string,
  styleSheet?: Object,
};

/**
 * It's falsish not falsy because 0 is allowed.
 */
function isFalsish(chunk: any): boolean {
  return chunk === undefined || chunk === null || chunk === false || chunk === '';
}

function objToCssArray(args: ObjectToCSSArrayProps): Array<string | Function> {
  const rules = [];
  const keys = Object.keys(args.chunk);

  keys.forEach(key => {
    const value = args.chunk[key];

    if (!isFalsish(value)) {
      if (Array.isArray(value) /* likely usage of `css` tagged template literal */) {
        /* eslint-disable no-use-before-define */
        return rules.push(
          `${hyphenate(key)}: ${flatten(value, args.executionContext, args.styleSheet).join('')};`
        );
        /* eslint-enable no-use-before-define */
      } else if (isPlainObject(value)) {
        rules.push(...objToCssArray({ ...args, chunk: value, prevKey: key }));

        return rules;
      } else if (isFunction(value)) {
        rules.push(`${hyphenate(key)}:`, value, ';');

        return rules;
      }

      rules.push(`${hyphenate(key)}: ${addUnitIfNeeded(key, value)};`);
    }

    return rules;
  });

  return args.prevKey ? [`${args.prevKey} {`, ...rules, '}'] : rules;
}

export default function flatten(
  chunk: any,
  executionContext: Object | void,
  styleSheet: Object | void
): any {
  if (isFalsish(chunk)) {
    return null;
  }

  if (Array.isArray(chunk)) {
    const ruleSet = [];

    for (let i = 0, len = chunk.length, result; i < len; i += 1) {
      result = flatten(chunk[i], executionContext, styleSheet);

      if (result === null) continue;
      else if (Array.isArray(result)) ruleSet.push(...result);
      else ruleSet.push(result);
    }

    return ruleSet;
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
    ? objToCssArray({ chunk, executionContext, styleSheet })
    : chunk.toString();
}
