import isFunction from './isFunction';

/**
 * A function that's safe to CALL with an execution context during `flatten()`
 * — i.e., a plain interpolation like `(p) => p.theme.primary`. Excludes class
 * components and styled-components (now plain function components in React 19).
 */
export default function isStatelessFunction(test: any): test is Function {
  if (!isFunction(test)) return false;
  if (test.prototype && test.prototype.isReactComponent) return false;
  // Styled components are plain function components in v7. Detect via brand.
  if ('styledComponentId' in test) return false;
  return true;
}
