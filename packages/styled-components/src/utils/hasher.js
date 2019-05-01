// @flow
/* eslint-disable */

import generateAlphabeticName from './generateAlphabeticName';

export const hash = (x: string): number => {
  /* prettier-ignore */
  for (var h = 5381 | 0, i = 0, l = x.length | 0; i < l; i++)
    {h = ((h << 5) + h) + x.charCodeAt(i);}
  return h >>> 0;
};

const hasher = (str: string): string => {
  return generateAlphabeticName(hash(str));
};

export default hasher;
