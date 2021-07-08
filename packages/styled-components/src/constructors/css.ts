import { ExtensibleObject, FlattenerResult, Interpolation, Styles } from '../types';
import { EMPTY_ARRAY } from '../utils/empties';
import flatten from '../utils/flatten';
import interleave from '../utils/interleave';
import isFunction from '../utils/isFunction';
import isPlainObject from '../utils/isPlainObject';

/**
 * Used when flattening object styles to determine if we should
 * expand an array of styles.
 */
const addTag = (arg: ReturnType<typeof flatten> & { isCss?: boolean }) => {
  if (Array.isArray(arg)) {
    // eslint-disable-next-line no-param-reassign
    arg.isCss = true;
  }
  return arg;
};

export default function css(
  styles: Styles,
  ...interpolations: Array<Interpolation>
): FlattenerResult {
  if (isFunction(styles) || isPlainObject(styles)) {
    const styleFunctionOrObject = styles as Function | ExtensibleObject;

    return addTag(
      flatten(interleave(EMPTY_ARRAY as string[], [styleFunctionOrObject, ...interpolations]))
    );
  }

  const styleStringArray = styles as string[];

  if (
    interpolations.length === 0 &&
    styleStringArray.length === 1 &&
    typeof styleStringArray[0] === 'string'
  ) {
    return styleStringArray;
  }

  return addTag(flatten(interleave(styleStringArray, interpolations)));
}
