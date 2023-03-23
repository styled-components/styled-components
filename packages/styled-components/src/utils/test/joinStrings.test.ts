import { joinStringArray, joinStrings } from '../joinStrings';

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

describe('joinStringArray(string[], string?)', () => {
  it('joins the strings with the separator between', () => {
    expect(joinStringArray(['a', 'b'], ' ')).toBe('a b');
    expect(joinStringArray(['a ', 'b'], ' ')).toBe('a  b');
    expect(joinStringArray(['a ', ' b'], ' ')).toBe('a   b');
  });

  it('joins the strings with no separator when separator is falsy', () => {
    expect(joinStringArray(['a', 'b'])).toBe('ab');
    expect(joinStringArray(['a', 'b'], '')).toBe('ab');
  });

  it('returns the string unmodified if only one in array', () => {
    expect(joinStringArray(['a'])).toBe('a');
    expect(joinStringArray(['a'], ' ')).toBe('a');
  });

  it('returns an empty string for an empty array', () => {
    expect(joinStringArray([])).toBe('');
  });
});
