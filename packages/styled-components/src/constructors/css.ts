import { attachSourceInputs, isCssProduct } from '../parser/source';
import { BaseObject, Interpolation, RuleSet, StyleFunction, Styles } from '../types';
import isFunction from '../utils/isFunction';
import isPlainObject from '../utils/isPlainObject';
import objectToTemplate from '../utils/objectToCSS';

/**
 * Append `chunk` to `out`, un-nesting plain arrays and dropping `false` /
 * `null` / `undefined` / `''`. No function evaluation; that's deferred to
 * the per-render Source path.
 */
function pushFlat(out: unknown[], chunk: unknown): void {
  if (chunk === undefined || chunk === null || chunk === false || chunk === '') return;
  if (Array.isArray(chunk) && !isCssProduct(chunk)) {
    for (let i = 0; i < chunk.length; i++) pushFlat(out, chunk[i]);
  } else {
    out.push(chunk);
  }
}

/**
 * The `RuleSet` for a template: strings and slots interleaved and
 * flattened, with the template inputs attached for the lazy `Source`.
 */
function rulesFor<Props extends object>(
  strings: ReadonlyArray<string>,
  interpolations: ReadonlyArray<unknown>
): RuleSet<NoInfer<Props>> {
  const rules: unknown[] = [];
  pushFlat(rules, strings[0]);
  for (let i = 0; i < interpolations.length; i++) {
    pushFlat(rules, interpolations[i]);
    pushFlat(rules, strings[i + 1]);
  }
  return attachSourceInputs(rules as RuleSet<NoInfer<Props>>, strings, interpolations);
}

/** Internal `css(...)` body for callers that already have an interpolation array. */
export function cssWithInterpolations<Props extends object = BaseObject>(
  styles: Styles<NoInfer<Props>>,
  interpolations: Interpolation<NoInfer<Props>>[]
): RuleSet<NoInfer<Props>> {
  if (isPlainObject(styles)) {
    // Object styles use the same Source/fast-path pipeline as template literals.
    const objTemplate = objectToTemplate(styles as Record<string, unknown>);
    const allStrings = objTemplate.strings;
    const allInterps = objTemplate.interpolations;
    for (let i = 0; i < interpolations.length; i++) {
      allInterps.push(interpolations[i]);
      allStrings.push('');
    }
    return rulesFor<Props>(allStrings, allInterps);
  }

  if (isFunction(styles)) {
    // Treat function input as a block-level interpolation.
    const slots = [styles as StyleFunction<Props>, ...interpolations];
    return rulesFor<Props>(new Array<string>(slots.length + 1).fill(''), slots);
  }

  return rulesFor<Props>(styles as TemplateStringsArray, interpolations);
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
