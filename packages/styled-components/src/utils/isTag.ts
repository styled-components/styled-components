import type { StyledTarget } from '../types';

/** Module-level const so V8 speculatively folds the lowercase check on the
 *  per-prop hot path in dev jest runs (where `__DEV__` is a mutable global,
 *  not a const). In production rollup substitutes `__DEV__` to `false` and
 *  terser drops the lowercase branch entirely. */
const IS_DEV = __DEV__;

export default function isTag(target: StyledTarget<'web'>): target is string {
  if (typeof target !== 'string') return false;
  if (!IS_DEV) return true;
  return target.charAt(0) === target.charAt(0).toLowerCase();
}
