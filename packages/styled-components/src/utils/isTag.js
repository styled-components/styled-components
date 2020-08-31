// @flow
import type { IStyledComponent, Target } from '../types';

export default function isTag(target: Target | IStyledComponent): boolean %checks {
  return (
    typeof target === 'string' &&
    (process.env.NODE_ENV !== 'production'
      ? target.charAt(0) === target.charAt(0).toLowerCase()
      : true)
  );
}
