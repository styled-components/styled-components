import type { StyledTarget } from '../types';

/** Module-level dev gate so V8 can speculatively fold the lowercase check
 *  when this resolves to `false`. Without the hoist the `process.env.NODE_ENV`
 *  access happens on every call. */
const IS_DEV = process.env.NODE_ENV !== 'production';

export default function isTag(target: StyledTarget<'web'>): target is string {
  if (typeof target !== 'string') return false;
  if (!IS_DEV) return true;
  return target.charAt(0) === target.charAt(0).toLowerCase();
}
