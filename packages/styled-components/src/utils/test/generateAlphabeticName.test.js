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

  it('explicitly does not emit names containing "ad" to avoid adblockers', () => {
    // d -> -
    // D -> _
    expect(generateAlphabeticName(1355)).toMatchInlineSnapshot(`"A-"`);
    expect(generateAlphabeticName(1381)).toMatchInlineSnapshot(`"A_"`);
    expect(generateAlphabeticName(2707)).toMatchInlineSnapshot(`"a-"`);
    expect(generateAlphabeticName(2733)).toMatchInlineSnapshot(`"a_"`);
    expect(generateAlphabeticName(7390035)).toMatchInlineSnapshot(`"a_a-"`);
  });
});
