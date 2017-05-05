// @flow

import generateAlphabeticName from '../generateAlphabeticName';
import expect from 'expect';

describe('generateAlphabeticName', () => {
  it('should create alphabetic names for number input data', () => {
    expect(generateAlphabeticName(1000000000)).toEqual('cGNYzm');
    expect(generateAlphabeticName(2000000000)).toEqual('fnBWYy');
  });
  it('should return the exact class name', () => {
    expect(generateAlphabeticName(2000000000, 'class_name')).toEqual('class_name');
  });
});
