import { attachSourceInputs, isCssProduct } from '../parser/source';
import { BaseObject, Interpolation, RuleSet, StyleFunction, Styles } from '../types';
import interleave from '../utils/interleave';
import isFunction from '../utils/isFunction';
import isPlainObject from '../utils/isPlainObject';
import objectToTemplate from '../utils/objectToCSS';

export { getSource } from '../parser/source';

/**
 * Flatten only the array structure (un-nest), dropping `false` / `null` /
 * `undefined` / `''` slots. No function evaluation — that's deferred to
 * the per-render Source path. Cheaper and simpler than the legacy
 * `flatten` helper, which also had to register keyframes and resolve
 * styled-component selectors at this layer.
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
  if (isPlainObject(styles)) {
    // Object input becomes a synthetic template literal. `objectToTemplate`
    // walks the object and produces (strings, interpolations) where any
    // function or fragment values become block-position slots; the rest of
    // the pipeline (Source, fast path) handles it identically to
    // `css\`...\``. Trailing call-site interpolations append as additional
    // block-level slots after the object body.
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
    // Function input becomes a single block-level interpolation slot at
    // the head of the template. The function evaluates per-render and its
    // return (string, object, fragment) is resolved by the Source path.
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
    // entirely — the input is already a one-element string array, so we
    // just allocate a fresh array literal for `attachSourceInputs` to mark.
    // Without the source attached, every `${staticMixin}` referencing this
    // RuleSet would force a bail to the legacy path even though the body
    // is fixed.
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

export default css;
