import { ComputeFunction } from '../types';
import isFunction from './isFunction';

export default function isComputeFunction<Props extends object>(
  test: any
): test is ComputeFunction<Props> {
  return isFunction(test) && test.var;
}
