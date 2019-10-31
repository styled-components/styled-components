/* eslint-disable */
/* inlined from https://github.com/jonschlinkert/mixin-deep such that it will be transpiled for all the browser targets we support; thanks Jon! */

const isObject = val => {
  return (
    typeof val === 'function' || (typeof val === 'object' && val !== null && !Array.isArray(val))
  );
};

const isValidKey = key => {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
};

function mixin(target, val, key) {
  const obj = target[key];
  if (isObject(val) && isObject(obj)) {
    mixinDeep(obj, val);
  } else {
    target[key] = val;
  }
}

export default function mixinDeep(target, ...rest) {
  for (const obj of rest) {
    if (isObject(obj)) {
      for (const key in obj) {
        if (isValidKey(key)) {
          mixin(target, obj[key], key);
        }
      }
    }
  }

  return target;
}
