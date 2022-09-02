import { StyledTarget } from '../types';

export default function isTag(target: StyledTarget<'web'>): target is string {
  return (
    typeof target === 'string' &&
    (process.env.NODE_ENV !== 'production'
      ? target.charAt(0) === target.charAt(0).toLowerCase()
      : true)
  );
}
