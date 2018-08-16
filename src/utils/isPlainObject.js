// @flow
export default function isPlainObject(x: any) /* : boolean %checks */ {
  return typeof x === 'object' && x !== null && x.constructor === Object
}
