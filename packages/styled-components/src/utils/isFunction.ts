export default function isFunction(test: unknown): test is Function {
  return typeof test === 'function';
}
