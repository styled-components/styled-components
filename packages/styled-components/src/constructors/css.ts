import { attachSourceInputs, isCssProduct } from '../parser/source';
import { BaseObject, Interpolation, RuleSet, StyleFunction, Styles } from '../types';
import interleave from '../utils/interleave';
import isFunction from '../utils/isFunction';
import isPlainObject from '../utils/isPlainObject';
import objectToTemplate from '../utils/objectToCSS';

export { getSource } from '../parser/source';

/**
 * Flatten only the array structure (un-nest), dropping `false` / `null` /
 * `undefined` / `''` slots. No function evaluation; that's deferred to
 * the per-render Source path.
 */
function flattenStructure<T>(input: ReadonlyArray<unknown>, out: T[] = [] as T[]): T[] {
  for (let i = 0; i < input.length; i++) {
    const chunk = input[i];
    if (chunk === undefined || chunk === null || chunk === false || chunk === '') continue;
    if (Array.isArray(chunk) && !isCssProduct(chunk)) {
      flattenStructure<T>(chunk, out);
    } else {
      out.push(chunk as T);
    }
  }
  return out;
}

/** Internal `css(...)` body for callers that already have an interpolation array. */
export function cssWithInterpolations<Props extends object = BaseObject>(
  styles: Styles<NoInfer<Props>>,
  interpolations: Interpolation<NoInfer<Props>>[]
): RuleSet<NoInfer<Props>> {
  if (isPlainObject(styles)) {
    // Object styles use the same Source/fast-path pipeline as template literals.
    const objTemplate = objectToTemplate(styles as Record<string, unknown>);
    const allStrings = objTemplate.strings.slice();
    const allInterps: Interpolation<NoInfer<Props>>[] =
      objTemplate.interpolations.slice() as Interpolation<NoInfer<Props>>[];
    for (let i = 0; i < interpolations.length; i++) {
      allInterps.push(interpolations[i]);
      allStrings.push('');
    }
    const rules = flattenStructure<Interpolation<NoInfer<Props>>>(
      interleave<Props>(allStrings, allInterps) as ReadonlyArray<unknown>
    );
    attachSourceInputs(rules, allStrings, allInterps);
    return rules as RuleSet<NoInfer<Props>>;
  }

  if (isFunction(styles)) {
    // Treat function input as a block-level interpolation.
    const slots = [styles as StyleFunction<Props>, ...interpolations];
    const synthesizedStrings: string[] = new Array(slots.length + 1).fill('');
    const rules = flattenStructure<Interpolation<NoInfer<Props>>>(
      interleave<Props>(synthesizedStrings, slots) as ReadonlyArray<unknown>
    );
    attachSourceInputs(rules, synthesizedStrings, slots);
    return rules as RuleSet<NoInfer<Props>>;
  }

  const styleStringArray = styles as TemplateStringsArray;

  if (
    interpolations.length === 0 &&
    styleStringArray.length === 1 &&
    typeof styleStringArray[0] === 'string'
  ) {
    // Pure-static templates (no interpolations): skip flattenStructure
    // while still attaching Source metadata for `${staticMixin}` reuse.
    const rules: Interpolation<NoInfer<Props>>[] = [
      styleStringArray[0] as Interpolation<NoInfer<Props>>,
    ];
    attachSourceInputs(rules, styleStringArray, interpolations);
    return rules as RuleSet<NoInfer<Props>>;
  }

  const rules = flattenStructure<Interpolation<NoInfer<Props>>>(
    interleave<Props>(styleStringArray, interpolations) as ReadonlyArray<unknown>
  );
  attachSourceInputs(rules, styleStringArray, interpolations);
  return rules as RuleSet<NoInfer<Props>>;
}

/**
 * Tag a CSS template literal for use in styled components, createGlobalStyle, or attrs.
 * Enables interpolation type-checking and shared style blocks.
 *
 * ```tsx
 * const truncate = css`
 *   white-space: nowrap;
 *   overflow: hidden;
 *   text-overflow: ellipsis;
 * `;
 * ```
 */
function css(styles: Styles<object>, ...interpolations: Interpolation<object>[]): RuleSet<object>;
function css<Props extends object>(
  styles: Styles<NoInfer<Props>>,
  ...interpolations: Interpolation<NoInfer<Props>>[]
): RuleSet<NoInfer<Props>>;
function css<Props extends object = BaseObject>(
  styles: Styles<NoInfer<Props>>,
  ...interpolations: Interpolation<NoInfer<Props>>[]
): RuleSet<NoInfer<Props>> {
  return cssWithInterpolations<Props>(styles, interpolations);
}

export default css;
