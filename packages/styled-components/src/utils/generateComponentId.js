// @flow
/* eslint-disable */
import generateAlphabeticName from './generateAlphabeticName';
import { hash } from './hash';

export default (str: string): string => {
  return generateAlphabeticName(hash(str) >>> 0);
};
