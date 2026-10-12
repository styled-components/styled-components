export default function isPlainObject(x: unknown): x is Record<string, unknown> {
  return (
    x !== null &&
    typeof x === 'object' &&
    x.constructor.name === Object.name &&
    /* check for reasonable markers that the object isn't an element for react & preact/compat */
    !('props' in x && '$$typeof' in x && x.$$typeof)
  );
}
