export default function isPlainObject(x: unknown): x is Record<string, unknown> {
  return (
    x !== null &&
    typeof x === 'object' &&
    x.constructor.name === Object.name &&
    /* every React object (element, forwardRef, memo, lazy, context) carries `$$typeof` */
    !('$$typeof' in x && x.$$typeof)
  );
}
