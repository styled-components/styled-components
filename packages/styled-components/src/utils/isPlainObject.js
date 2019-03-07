// @flow
export const isPlainObject = (x: any): boolean => typeof x === 'object' && x.constructor === Object;
