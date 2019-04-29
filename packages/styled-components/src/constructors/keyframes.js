// @flow

import css from './css';
import stringifyRules from '../utils/stringifyRules';
import hasher from '../utils/hasher';
import Keyframes from '../models/Keyframes';

import type { Interpolation, Styles } from '../types';

const replaceWhitespace = (str: string): string => str.replace(/\s|\\n/g, '');

export default function keyframes(
  strings: Styles,
  ...interpolations: Array<Interpolation>
): Keyframes {
  /* Warning if you've used keyframes on React Native */
  if (
    process.env.NODE_ENV !== 'production' &&
    typeof navigator !== 'undefined' &&
    navigator.product === 'ReactNative'
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      '`keyframes` cannot be used on ReactNative, only on the web. To do animation in ReactNative please use Animated.'
    );
  }

  const rules = css(strings, ...interpolations);
  const name = hasher(replaceWhitespace(JSON.stringify(rules)));
  return new Keyframes(name, stringifyRules(rules, name, '@keyframes'));
}
