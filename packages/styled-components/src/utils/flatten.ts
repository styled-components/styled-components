import type StyleSheet from '../sheet';
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
import { cssTagged } from './cssTagged';
import addUnitIfNeeded from './addUnitIfNeeded';
import getComponentName from './getComponentName';
import hyphenate from './hyphenateStyleName';
import isFunction from './isFunction';
import isKeyframes from './isKeyframes';
import isPlainObject from './isPlainObject';
import isStatelessFunction from './isStatelessFunction';
import isStyledComponent from './isStyledComponent';

/**
 * It's falsish not falsy because 0 is allowed.
 */
const isFalsish = (chunk: any): chunk is undefined | null | false | '' =>
  chunk === undefined || chunk === null || chunk === false || chunk === '';

const CLIENT_REFERENCE = Symbol.for('react.client.reference');

interface ClientReference {
  $$typeof: symbol;
  $$id?: string;
  $$async?: boolean;
  name?: string;
}

function isClientReference(chunk: unknown): chunk is ClientReference {
  return (chunk as any).$$typeof === CLIENT_REFERENCE;
}

// React encodes $$id as "modulePath#exportName"
function warnClientReference(ref: ClientReference): void {
  const id = ref.$$id;
  const label = (id && id.includes('#') ? id.split('#').pop() : id) || ref.name || 'unknown';
  console.warn(
    `Interpolating a client component (${label}) as a selector is not supported in server components. The component selector pattern requires access to the component's internal class name, which is not available across the server/client boundary. Use a plain CSS class selector instead.`
  );
}

export const objToCssArray = (obj: Dict<any>): string[] => {
  const rules = [];

  for (const key in obj) {
    const val = obj[key];
    if (!obj.hasOwnProperty(key) || isFalsish(val)) continue;

    if ((Array.isArray(val) && cssTagged.has(val)) || isFunction(val)) {
      rules.push(hyphenate(key) + ':', val, ';');
    } else if (isPlainObject(val)) {
      rules.push(key + ' {', ...objToCssArray(val), '}');
    } else {
      rules.push(hyphenate(key) + ': ' + addUnitIfNeeded(key, val) + ';');
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
  if (isFalsish(chunk)) {
    return result;
  }

  const t = typeof chunk;

  if (t === 'string') {
    result.push(chunk as string);
    return result;
  }

  if (t === 'function') {
    if (isClientReference(chunk)) {
      if (process.env.NODE_ENV !== 'production') warnClientReference(chunk);
      return result;
    }

    if (isStatelessFunction(chunk) && executionContext) {
      const fnResult = (chunk as Function)(executionContext);

      if (
        process.env.NODE_ENV !== 'production' &&
        typeof fnResult === 'object' &&
        !Array.isArray(fnResult) &&
        !isKeyframes(fnResult) &&
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

  if (Array.isArray(chunk)) {
    for (let i = 0; i < chunk.length; i++) {
      flatten<Props>(chunk[i], executionContext, styleSheet, stylisInstance, result);
    }
    return result;
  }

  if (isStyledComponent(chunk)) {
    result.push(`.${(chunk as unknown as IStyledComponent<'web', any>).styledComponentId}`);
    return result;
  }

  if (isKeyframes(chunk)) {
    if (styleSheet) {
      chunk.inject(styleSheet, stylisInstance);
      result.push(chunk.getName(stylisInstance));
    } else {
      result.push(chunk);
    }
    return result;
  }

  // Module-level client reference proxies (typeof 'object') pass isPlainObject — catch before
  if (isClientReference(chunk)) {
    if (process.env.NODE_ENV !== 'production') warnClientReference(chunk);
    return result;
  }

  if (isPlainObject(chunk)) {
    const cssArr = objToCssArray(chunk as StyledObject<Props>);
    for (let i = 0; i < cssArr.length; i++) result.push(cssArr[i]);
    return result;
  }

  result.push((chunk as any).toString());
  return result;
}
