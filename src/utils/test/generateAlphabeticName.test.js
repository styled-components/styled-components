// @flow
import generateAlphabeticName from '../generateAlphabeticName';

describe('generateAlphabeticName', () => {
  it('should create alphabetic names for number input data', () => {
    expect(generateAlphabeticName(1000000000)).toEqual('cGNYzm');
    expect(generateAlphabeticName(2000000000)).toEqual('fnBWYy');
  });

  it('should not fail for numbers above int32 limit', () => {
    expect(generateAlphabeticName(3819806601)).toEqual('kcwstn');
  });
});
