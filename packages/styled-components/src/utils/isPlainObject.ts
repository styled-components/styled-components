export default function isPlainObject(x: any): boolean {
  return (
    x !== null &&
    typeof x === 'object' &&
    /* a check for empty prototype would be more typical, but that
       doesn't play well with objects created in different vm contexts */
    (!x.constructor || x.constructor.name === 'Object') &&
    (x.toString ? x.toString() : Object.prototype.toString.call(x)) === '[object Object]' &&
    /* check for reasonable markers that the object isn't an element for react & preact/compat */
    !('props' in x && (x.$$typeof || x.constructor === undefined))
  );
}
