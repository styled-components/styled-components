// @flow
export default (x: any): boolean %checks => typeof x === 'object' && x.constructor === Object;
