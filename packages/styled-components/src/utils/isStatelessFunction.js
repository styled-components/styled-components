// @flow
export default function isStatelessFunction(test: any): boolean {
  return (
    typeof test === 'function'
    && !(
      test.prototype
      && test.prototype.isReactComponent
    )
  );
}
