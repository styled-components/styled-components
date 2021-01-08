// @flow

export default (x: any): boolean =>
  x !== null &&
  typeof x === 'object' &&
  (x.toString ? x.toString() : Object.prototype.toString.call(x)) === '[object Object]' &&
  /* check for reasonable markers that the object isn't an element for react & preact/compat */
  !(x.$$typeof && (x._owner || (x.__v && x.__o)));
