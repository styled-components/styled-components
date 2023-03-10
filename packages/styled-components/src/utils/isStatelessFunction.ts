import isFunction from './isFunction';

export default function isStatelessFunction(test: any) {
  return isFunction(test) && !(test.prototype && test.prototype.isReactComponent);
}
