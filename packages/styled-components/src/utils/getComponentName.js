// @flow
import type { IStyledComponent, Target } from '../types';

export default function getComponentName(target: Target | IStyledComponent): string {
  return (
    (process.env.NODE_ENV !== 'production' ? typeof target === 'string' && target : false) ||
    // $FlowFixMe
    target.displayName ||
    // $FlowFixMe
    target.name ||
    'Component'
  );
}
