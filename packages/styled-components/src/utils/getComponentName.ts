import type { StyledTarget } from '../types';

export default function getComponentName(target: StyledTarget<any>) {
  if (process.env.NODE_ENV !== 'production' && typeof target === 'string') return target;
  if (typeof target !== 'string') {
    return target.displayName || (target as { name?: string }).name || 'Component';
  }
  return 'Component';
}
