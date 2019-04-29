// @flow

import generateAlphabeticName from './generateAlphabeticName';
import hashStr from '../vendor/glamor/hash';

const hasher = (str: string): string => generateAlphabeticName(hashStr(str));

export default hasher;
