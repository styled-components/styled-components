// @flow
import type { Target } from '../types';

export default function isTag(target: Target) /* : %checks */ {
  return process.env.NODE_ENV !== 'production'
    ? typeof target === 'string' && target.charAt(0) === target.charAt(0).toLowerCase()
    : typeof target === 'string'
}
