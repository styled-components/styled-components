import {
  BaseObject,
  Interpolation,
  NoInfer,
  RuleSet,
  StyledObject,
  StyleFunction,
  Styles,
} from '../types';
import { EMPTY_ARRAY } from '../utils/empties';
import flatten from '../utils/flatten';
import interleave from '../utils/interleave';
import isFunction from '../utils/isFunction';
import isPlainObject from '../utils/isPlainObject';

/**
 * Used when flattening object styles to determine if we should
 * expand an array of styles.
 */
const addTag = <T extends RuleSet<any>>(arg: T): T & { isCss: true } =>
  Object.assign(arg, { isCss: true } as const);

function css(styles: Styles<object>, ...interpolations: Interpolation<object>[]): RuleSet<object>;
function css<Props extends object>(
  styles: Styles<NoInfer<Props>>,
  ...interpolations: Interpolation<NoInfer<Props>>[]
): RuleSet<NoInfer<Props>>;
function css<Props extends object = BaseObject>(
  styles: Styles<NoInfer<Props>>,
  ...interpolations: Interpolation<NoInfer<Props>>[]
): RuleSet<NoInfer<Props>> {
  if (isFunction(styles) || isPlainObject(styles)) {
    const styleFunctionOrObject = styles as StyleFunction<Props> | StyledObject<Props>;

    return addTag(
      flatten<Props>(
        interleave<Props>(EMPTY_ARRAY, [
          styleFunctionOrObject,
          ...interpolations,
        ]) as Interpolation<object>
      )
    );
  }

  const styleStringArray = styles as TemplateStringsArray;

  if (
    interpolations.length === 0 &&
    styleStringArray.length === 1 &&
    typeof styleStringArray[0] === 'string'
  ) {
    return flatten<Props>(styleStringArray);
  }

  return addTag(
    flatten<Props>(interleave<Props>(styleStringArray, interpolations) as Interpolation<object>)
  );
}

export default css;
