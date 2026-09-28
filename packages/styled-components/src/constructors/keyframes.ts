import Keyframes from '../models/Keyframes';
import { Interpolation, Styles } from '../types';
import generateComponentId from '../utils/generateComponentId';
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
  const parts: ReadonlyArray<unknown> = css<Props>(strings, ...interpolations);
  const rules = parts.join('');
  const name = generateComponentId(rules);
  if (__DEV__) {
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof part === 'function' && !isStyledComponent(part)) {
        warnOnce(
          'keyframes-function',
          `\`keyframes\` \`${name}\` holds a function interpolation, which was written as its source text: keyframes are not rendered, so there are no props or theme to call it with. Interpolate the value itself, such as a string or number.`,
          name
        );
        break;
      }
    }
  }
  return new Keyframes(name, rules);
}
