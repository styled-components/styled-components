// @flow
export default (x: any): boolean =>
  typeof x === 'object' && x.constructor === Object
