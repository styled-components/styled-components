import { StyledTarget } from '../types';

export default function getComponentName(target: StyledTarget) {
  return (
    (process.env.NODE_ENV !== 'production' ? typeof target === 'string' && target : false) ||
    (target as Exclude<StyledTarget, string>).displayName ||
    (target as Function).name ||
    'Component'
  );
}
