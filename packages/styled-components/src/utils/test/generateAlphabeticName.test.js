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

  it('breaks up substrings of "ad" case-insensitive to avoid adblocker issues', () => {
    expect(generateAlphabeticName(1355)).toMatchInlineSnapshot(`"A-d"`);
    expect(generateAlphabeticName(1381)).toMatchInlineSnapshot(`"A-D"`);
    expect(generateAlphabeticName(2707)).toMatchInlineSnapshot(`"a-d"`);
    expect(generateAlphabeticName(2733)).toMatchInlineSnapshot(`"a-D"`);
    expect(generateAlphabeticName(7390035)).toMatchInlineSnapshot(`"a-Da-d"`);
  });

  describe('with SC_CLASS_PREFIX', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should concat SC_CLASS_PREFIX with generated alphabetic names', () => {
      jest.doMock('../../constants', () => ({ SC_CLASS_PREFIX: 'custom-class-prefix' }))
      const generateAlphabeticName = require('../generateAlphabeticName');

      expect(generateAlphabeticName(1000000000)).toEqual('custom-class-prefix_cGNYzm');
      expect(generateAlphabeticName(2000000000)).toEqual('custom-class-prefix_fnBWYy');
    });
  })
});
