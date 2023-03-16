export default function isPlainObject(x: any): x is Record<any, any> {
  return (
    x !== null &&
    typeof x === 'object' &&
    x.constructor.name === Object.name &&
    /* check for reasonable markers that the object isn't an element for react & preact/compat */
    !('props' in x && x.$$typeof)
  );
}
