import isFunction from './isFunction';

export default function isStatelessFunction(test: any): test is Function {
  return isFunction(test) && !(test.prototype && test.prototype.isReactComponent);
}
