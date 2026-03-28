import Keyframes from '../models/Keyframes';
import { Interpolation, Styles } from '../types';
import generateComponentId from '../utils/generateComponentId';
import { joinStringArray } from '../utils/joinStrings';
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
  /* Warning if you've used keyframes on React Native */
  if (
    process.env.NODE_ENV !== 'production' &&
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  ) {
    console.warn(
      '`keyframes` cannot be used on ReactNative, only on the web. To do animation in ReactNative please use Animated.'
    );
  }

  const rules = joinStringArray(css<Props>(strings, ...interpolations) as string[]);
  const name = generateComponentId(rules);
  return new Keyframes(name, rules);
}
