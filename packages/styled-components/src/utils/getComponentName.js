// @flow
import type { IStyledComponent } from '../types';

export default function getComponentName(
  target: $PropertyType<IStyledComponent, 'target'>
): string {
  return (
    (process.env.NODE_ENV !== 'production' ? typeof target === 'string' && target : false) ||
    // $FlowFixMe
    target.displayName ||
    // $FlowFixMe
    target.name ||
    'Component'
  );
}
