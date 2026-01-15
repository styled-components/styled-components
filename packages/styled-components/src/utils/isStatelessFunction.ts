import isFunction from './isFunction';
import isStyledComponent from './isStyledComponent';

export default function isStatelessFunction(test: any): test is Function {
  return (
    isFunction(test) &&
    !(test.prototype && test.prototype.isReactComponent) &&
    !isStyledComponent(test)
  );
}
