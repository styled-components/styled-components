// @flow
import interleave from '../interleave';

describe('interleave', () => {
  it('blindly interleave', () => {
    expect(interleave([], [])).toEqual([undefined]);
    expect(interleave(['foo'], [])).toEqual(['foo']);
    expect(interleave(['foo'], [1])).toEqual(['foo', 1, undefined]);
    expect(interleave(['foo', 'bar'], [1])).toEqual(['foo', 1, 'bar']);
  });
  it('should be driven off the number of interpolations', () => {
    expect(interleave(['foo', 'bar'], [])).toEqual(['foo']);
    expect(interleave(['foo', 'bar', 'baz'], [1])).toEqual(['foo', 1, 'bar']);
    expect(interleave([], [1])).toEqual([undefined, 1, undefined]);
    expect(interleave(['foo'], [1, 2, 3])).toEqual([
      'foo',
      1,
      undefined,
      2,
      undefined,
      3,
      undefined,
    ]);
  });
});
