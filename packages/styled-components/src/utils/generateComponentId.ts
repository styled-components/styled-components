import generateAlphabeticName from './generateAlphabeticName';
import { hash } from './hash';

export default (str: string) => {
  return generateAlphabeticName(hash(str) >>> 0);
};
