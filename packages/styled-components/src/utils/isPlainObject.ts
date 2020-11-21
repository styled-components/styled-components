import { typeOf } from 'react-is';

export default function isPlainObject(x: any): boolean {
  return (
    x !== null &&
    typeof x === 'object' &&
    (x.toString ? x.toString() : Object.prototype.toString.call(x)) === '[object Object]' &&
    !typeOf(x)
  );
}
