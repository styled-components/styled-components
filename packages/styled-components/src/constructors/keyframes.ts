import Keyframes from '../models/Keyframes';
import { Interpolation, Styles } from '../types';
import generateComponentId from '../utils/generateComponentId';
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
  const rules = (css<Props>(strings, ...interpolations) as string[]).join('');
  const name = generateComponentId(rules);
  return new Keyframes(name, rules);
}
