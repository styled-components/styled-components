import { Interpolation } from '../types';

export default (strings: string[], interpolations: Interpolation[]): Interpolation[] => {
  const result: Interpolation[] = [strings[0]];

  for (let i = 0, len = interpolations.length; i < len; i += 1) {
    result.push(interpolations[i], strings[i + 1]);
  }

  return result;
};
