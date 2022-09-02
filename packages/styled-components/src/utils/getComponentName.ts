import { StyledTarget } from '../types';

export default function getComponentName(target: StyledTarget<any>) {
  return (
    (process.env.NODE_ENV !== 'production' ? typeof target === 'string' && target : false) ||
    (target as Exclude<StyledTarget<any>, string>).displayName ||
    (target as Function).name ||
    'Component'
  );
}
