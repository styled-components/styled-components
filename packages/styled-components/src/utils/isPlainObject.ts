export default function isPlainObject(x: unknown): x is Record<string, unknown> {
  return (
    x !== null &&
    typeof x === 'object' &&
    /* an object with no prototype, or a `constructor` key holding nothing, reads as `Object` */
    (x.constructor ?? Object).name === Object.name &&
    /* every React object (element, forwardRef, memo, lazy, context) carries `$$typeof` */
    !('$$typeof' in x && x.$$typeof)
  );
}
