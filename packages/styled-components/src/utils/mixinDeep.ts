import { ExtensibleObject } from '../types';
import isPlainObject from './isPlainObject'

function isRecursible(obj: any) {
  return isPlainObject(obj) || Array.isArray(obj);
}

function mixinRecursively(target: any, source: any) {
  const isRecursive = isRecursible(target);
  for (const [key, sourceVal] of Object.entries(source)) {
    const targetVal = target[key];
    if (isRecursive && isRecursible(targetVal) && isRecursible(sourceVal)) {
      target[key] = mixinRecursively(targetVal, sourceVal);
    } else {
      target[key] = sourceVal;
    }
  };

  return target;
}

/**
 * Arrays & POJOs merged recursively, other objects and value types are overridden
 * Source objects applied left to right.  Mutates & returns target.  Similar to lodash merge.
 */
export default function mixinDeep(target: ExtensibleObject = {}, ...sources: any[]) {
  for (const source of sources) {
    if (isRecursible(source)) {
      mixinRecursively(target, source);
    }
  };
  return target;
}
