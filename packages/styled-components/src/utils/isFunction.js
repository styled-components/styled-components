// @flow
export default function isFunction(test: any): boolean %checks {
  return typeof test === 'function';
}
