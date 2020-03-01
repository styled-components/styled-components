// @flow
import type { ComponentType } from 'react';

export default function getComponentName(target: ComponentType<*> | string): string {
  return (
    (process.env.NODE_ENV !== 'production' ? typeof target === 'string' && target : false) ||
    // $FlowFixMe
    target.displayName ||
    // $FlowFixMe
    target.name ||
    'Component'
  );
}
