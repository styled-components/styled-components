import Keyframes, { KeyframesTemplate } from '../models/Keyframes';
import {
  isClientReference,
  isCssProduct,
  ruleSetFromInputs,
  templateInputs,
} from '../parser/source';
import { Interpolation, RuleSet, Styles } from '../types';
import generateComponentId from '../utils/generateComponentId';
import isKeyframes from '../utils/isKeyframes';
import isPlainObject from '../utils/isPlainObject';
import isStyledComponent from '../utils/isStyledComponent';
import { warnOnce } from '../utils/warnOnce';
import css from './css';

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
  const rules = css<Props>(strings, ...interpolations);
  const text = joinText(rules, '');
  const name = generateComponentId(text);
  const inputs = templateInputs(rules);
  if (inputs === undefined) return new Keyframes(name, text);
  const found: FunctionsFound = { any: false };
  const values = functionsAsText(inputs[1], found);
  if (__DEV__ && found.any) {
    warnOnce(
      'keyframes-function',
      `\`keyframes\` \`${name}\` holds a function interpolation, which was written as its source text: keyframes are not rendered, so there are no props or theme to call it with. Interpolate the value itself, such as a string or number.`,
      name
    );
  }
  const template: KeyframesTemplate = {
    interpolations: values,
    shared: inputs[3],
    strings: inputs[0],
  };
  return new Keyframes(name, text, template);
}

/**
 * `parts.join(separator)`, with a keyframes value written as its name and a
 * client reference as nothing rather than throwing: the text the keyframes
 * name is generated from.
 */
function joinText(parts: ReadonlyArray<unknown>, separator: string): string {
  let text = '';
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) text += separator;
    const part = parts[i];
    if (part === null || part === undefined || isClientReference(part)) continue;
    if (Array.isArray(part)) text += joinText(part, ',');
    else if (isKeyframes(part)) text += part.name;
    else text += String(part);
  }
  return text;
}

interface FunctionsFound {
  any: boolean;
}

/**
 * `values` with every function other than a styled component written as its
 * source text, at any depth of arrays, css fragments, and plain objects: a
 * keyframes template has no render context to call one with. Returns
 * `values` itself when it holds no such function.
 */
function functionsAsText(
  values: ReadonlyArray<unknown>,
  found: FunctionsFound
): ReadonlyArray<unknown> {
  let out: unknown[] | null = null;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    const text = valueAsText(value, found);
    if (text !== value && out === null) out = values.slice(0, i);
    if (out !== null) out.push(text);
  }
  return out === null ? values : out;
}

function valueAsText(value: unknown, found: FunctionsFound): unknown {
  const t = typeof value;
  if ((t !== 'function' && t !== 'object') || value === null) return value;
  // A client reference is checked first: its proxy throws on any other read.
  if (isClientReference(value) || isStyledComponent(value)) return value;
  if (t === 'function') {
    found.any = true;
    return String(value);
  }
  if (Array.isArray(value)) {
    if (!isCssProduct(value)) return functionsAsText(value, found);
    const inputs = templateInputs(value as RuleSet<object>);
    if (inputs === undefined) return value;
    const mapped = functionsAsText(inputs[1], found);
    return mapped === inputs[1] ? value : ruleSetFromInputs(inputs[0], mapped, inputs[3]);
  }
  // React elements and component objects carry `$$typeof` and resolve by it, not by their fields.
  if (!isPlainObject(value) || (value as { $$typeof?: unknown }).$$typeof !== undefined) {
    return value;
  }
  let out: Record<string, unknown> | null = null;
  const object = value as Record<string, unknown>;
  for (const key in object) {
    const entry = object[key];
    const text = valueAsText(entry, found);
    if (text !== entry) {
      if (out === null) out = { ...object };
      out[key] = text;
    }
  }
  return out === null ? value : out;
}
