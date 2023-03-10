export default function isFunction(test: any): test is Function {
  return typeof test === 'function';
}
