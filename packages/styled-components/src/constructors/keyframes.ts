import Keyframes from '../models/Keyframes';
import { wholeStatements } from '../parser/parser';
import { Interpolation, Styles } from '../types';
import generateComponentId from '../utils/generateComponentId';
import {
  CAN_HOLD_REFERENCE,
  isServerOpaqueReference,
  referenceText,
} from '../utils/serverReference';
import isPlainObject from '../utils/isPlainObject';
import isStyledComponent from '../utils/isStyledComponent';
import objectToTemplate from '../utils/objectToCSS';
import { warnOnce } from '../utils/warnOnce';
import css from './css';

const hasOwn = Object.prototype.hasOwnProperty;

/**
 * The parts concatenated in order. `css` keeps a nested fragment whole, so it is read at every depth.
 * A reference throws when coerced to text; its marker is dropped by `Compiler.compile`.
 */
function textOf(parts: readonly unknown[]): string {
  let text = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (typeof part === 'boolean') continue;
    if (Array.isArray(part)) text += textOf(part);
    else if (CAN_HOLD_REFERENCE && isServerOpaqueReference(part)) text += referenceText(part);
    else if (typeof part === 'function' && !isStyledComponent(part)) {
      if (__DEV__) {
        warnOnce(
          'keyframes-function-interpolation',
          'A function was interpolated into keyframes and was left out: keyframes are built once where they are defined, so there are no props or theme to call it with. For a theme value, interpolate the createTheme value; otherwise interpolate the value itself, or build the keyframes inside the function that has it.'
        );
      }
    } else if (isPlainObject(part) && !hasOwn.call(part, 'toString')) text += objectText(part);
    else text += part;
  }

  return text;
}

/**
 * A style object read the way a styled template reads it: a value with no plain form (a fragment,
 * a function, a reference) is read as an interpolation, and a text value keeps only its whole statements.
 */
function objectText(obj: Record<string, unknown>): string {
  const { interpolations, strings } = objectToTemplate(obj);
  let text = strings[0];

  for (let i = 0; i < interpolations.length; i++) {
    const value = interpolations[i];
    text += (typeof value === 'string' ? wholeStatements(value) : textOf([value])) + strings[i + 1];
  }

  return text;
}

/**
 * Define a CSS `@keyframes` animation with an automatically scoped name.
 *
 * ```tsx
 * const rotate = keyframes`
 *   from { transform: rotate(0deg); }
 *   to { transform: rotate(360deg); }
 * `;
 * const Spinner = styled.div`animation: ${rotate} 1s linear infinite;`;
 * ```
 */
export default function keyframes<Props extends object = {}>(
  strings: Styles<Props>,
  ...interpolations: Array<Interpolation<Props>>
): Keyframes {
  const rules = textOf(css<Props>(strings, ...interpolations));
  const name = generateComponentId(rules);
  return new Keyframes(name, rules);
}
