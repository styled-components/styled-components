import Keyframes from '../models/Keyframes';
import { BaseObject, Interpolation, Styles } from '../types';
import generateComponentId from '../utils/generateComponentId';
import { joinStringArray } from '../utils/joinStrings';
import css from './css';

export default function keyframes<
  Props extends object = BaseObject,
  Theme extends object = BaseObject,
>(strings: Styles<Props, Theme>, ...interpolations: Array<Interpolation<Props, Theme>>): Keyframes {
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

  const rules = joinStringArray(css<Props, Theme>(strings, ...interpolations) as string[]);
  const name = generateComponentId(rules);
  return new Keyframes(name, rules);
}
