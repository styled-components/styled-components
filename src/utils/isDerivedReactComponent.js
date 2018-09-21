// @flow
export default function isDerivedReactComponent(fn: any): boolean {
  return !!(fn && fn.prototype && fn.prototype.isReactComponent);
}
