import { Interpolation, StyledObject, StyleFunction, Styles } from '../types';
import { EMPTY_ARRAY } from '../utils/empties';
import flatten from '../utils/flatten';
import interleave from '../utils/interleave';
import isFunction from '../utils/isFunction';
import isPlainObject from '../utils/isPlainObject';

/**
 * Used when flattening object styles to determine if we should
 * expand an array of styles.
 */
const addTag = <T>(arg: T): T extends any[] ? T & { isCss: true } : T =>
  // @ts-expect-error isArray doesn't guard any[] properly
  Array.isArray(arg) ? Object.assign(arg, { isCss: true }) : arg;

export default function css<Props extends object>(
  styles: Styles<Props>,
  ...interpolations: Interpolation<Props>[]
) {
  if (isFunction(styles) || isPlainObject(styles)) {
    const styleFunctionOrObject = styles as StyleFunction<Props> | StyledObject<Props>;

    return addTag(
      flatten<Props>(
        interleave<Props>(EMPTY_ARRAY, [
          styleFunctionOrObject,
          ...interpolations,
        ])
      )
    );
  }

  const styleStringArray = styles as TemplateStringsArray;

  if (
    interpolations.length === 0 &&
    styleStringArray.length === 1 &&
    typeof styleStringArray[0] === 'string'
  ) {
    return styleStringArray;
  }

  return addTag(flatten<Props>(interleave<Props>(styleStringArray, interpolations)));
}
