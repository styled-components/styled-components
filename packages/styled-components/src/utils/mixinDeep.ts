import isPlainObject from './isPlainObject';

function mixinRecursively(target: any, source: any, forceMerge = false) {
  /* only merge into POJOs, Arrays, but for top level objects only
   * allow to merge into anything by passing forceMerge = true */
  if (!forceMerge && !isPlainObject(target) && !Array.isArray(target)) {
    return source;
  }

  if (Array.isArray(source)) {
    for (let key = 0; key < source.length; key++) {
      target[key] = mixinRecursively(target[key], source[key]);
    }
  } else if (isPlainObject(source)) {
    for (const key in source) {
      target[key] = mixinRecursively(target[key], source[key]);
    }
  }

  return target;
}

/**
 * Arrays & POJOs merged recursively, other objects and value types are overridden
 * If target is not a POJO or an Array, it will get source properties injected via shallow merge
 * Source objects applied left to right.  Mutates & returns target.  Similar to lodash merge.
 */
export default function mixinDeep(target: any, ...sources: any[]) {
  for (const source of sources) {
    mixinRecursively(target, source, true);
  }

  return target;
}
