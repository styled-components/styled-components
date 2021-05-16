export default function isStatelessFunction(test: any) {
  return typeof test === 'function' && !(test.prototype && test.prototype.isReactComponent);
}
