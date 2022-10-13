import { Interpolation } from '../types';

export default function interleave<Props extends object>(
  strings: readonly string[],
  interpolations: Interpolation<Props>[]
): Interpolation<Props>[] {
  const result: Interpolation<Props>[] = [strings[0]];

  for (let i = 0, len = interpolations.length; i < len; i += 1) {
    result.push(interpolations[i], strings[i + 1]);
  }

  return result;
}
