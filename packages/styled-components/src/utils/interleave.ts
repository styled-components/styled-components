import { DefaultTheme, Interpolation } from '../types';

export default function interleave<Props extends object, Theme extends object = DefaultTheme>(
  strings: readonly string[],
  interpolations: Interpolation<Props, Theme>[]
): Interpolation<Props, Theme>[] {
  const result: Interpolation<Props, Theme>[] = [strings[0]];

  for (let i = 0, len = interpolations.length; i < len; i += 1) {
    result.push(interpolations[i], strings[i + 1]);
  }

  return result;
}
