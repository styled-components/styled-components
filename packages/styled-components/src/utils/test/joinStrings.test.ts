import joinStrings from '../joinStrings';

describe('joinStrings(string?, string?)', () => {
  it('joins the two strings with a space between', () => {
    expect(joinStrings('a', 'b')).toBe('a b');
    expect(joinStrings('a ', 'b')).toBe('a  b');
    expect(joinStrings('a ', ' b')).toBe('a   b');
  });

  it('ignores falsy inputs', () => {
    expect(joinStrings('a')).toBe('a');
    expect(joinStrings('a', null)).toBe('a');
    expect(joinStrings('a', '')).toBe('a');
    expect(joinStrings(null, 'b')).toBe('b');
    expect(joinStrings('', 'b')).toBe('b');
  });
});
