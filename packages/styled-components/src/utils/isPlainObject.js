// @flow
import { typeOf } from 'react-is';

export default (x: any): boolean =>
  x !== null &&
  typeof x === 'object' &&
  x.toString() === '[object Object]' &&
  !typeOf(x);
