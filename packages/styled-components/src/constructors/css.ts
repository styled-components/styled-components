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
const addTag = <T>(arg: T & { isCss?: boolean }) => {
  if (Array.isArray(arg)) {
    // eslint-disable-next-line no-param-reassign
    arg.isCss = true;
  }
  return arg;
};

export default function css<Props>(
  styles: Styles<Props>,
  ...interpolations: Interpolation<Props>[]
) {
  if (isFunction(styles) || isPlainObject(styles)) {
    const styleFunctionOrObject = styles as StyleFunction<Props> | StyledObject;

    return addTag(
      flatten<Props>(
        interleave<Props>(EMPTY_ARRAY as TemplateStringsArray, [
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
