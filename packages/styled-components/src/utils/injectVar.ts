import { Interpolation, Var } from '../types';

function isObject(value: unknown) {
  return value != null && typeof value === 'object' && Array.isArray(value) === false;
}

function isVar<Props extends object>(item: any): item is Var<Props> {
  return isObject(item) && item.var && item.compute;
}

export default function injectVar<Props extends object>(
  chunk: Interpolation<Props>[]
): Interpolation<Props>[] {
  const result: Interpolation<Props>[] = [];

  for (let i = 0, len = chunk.length; i < len; i += 1) {
    const next = chunk[i];
    if (isVar(next)) {
      result[i - 1] = result[i - 1] + 'var(--' + next.var + ')';
      next.compute.var = next.var;
      result.push(next.compute);
    } else {
      result.push(next);
    }
  }

  return result;
}
