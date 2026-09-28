import { ANY_DEPTH, BRACKETS, COMMENTS, isUrlCall, removeComments, scan, stops } from './reader';

const SEMICOLON = stops(';');

/** Index of the first `;` {@link scan} reads in `text`, from the start, at the top level. */
const firstSemicolon = (text: string, mode = 0) => scan(text, 0, text.length, SEMICOLON, mode, 0);

describe('reader', () => {
  /**
   * CSS Syntax 3 §4.3.4 Consume an ident-like token: "Consume an ident
   * sequence, and let string be the result. If string’s value is an ASCII
   * case-insensitive match for "url", and the next input code point is
   * U+0028 LEFT PARENTHESIS ((), consume it."
   */
  describe('isUrlCall', () => {
    it.each([
      ['url(', true],
      ['URL(', true],
      ['x url(', true],
      ['1.url(', true],
      ['\\75rl(', true],
      ['\\75 rl(', true],
      ['u\\72l(', true],
      ['\\55\r\nrl(', true],
      ['xurl(', false],
      ['éurl(', false],
      ['\0url(', false],
      ['#url(', false],
      ['@url(', false],
      ['5url(', false],
      ['-url(', false],
      ['\\41 url(', false],
      ['\\\\url(', false],
      ['\\#url(', false],
      ['calc(', false],
    ])('reads `%s` as url( %s', (text, expected) => {
      expect(isUrlCall(text, text.length - 1)).toBe(expected);
    });

    it('reads `\\41  url(` as a separate url( after the whitespace the escape does not take', () => {
      const text = '\\41  url(';
      expect(isUrlCall(text, text.length - 1)).toBe(true);
    });
  });

  describe('scan', () => {
    it('stops at the first stop outside strings, url text, escapes, and parentheses', () => {
      expect(firstSemicolon('a"; "\\;(;)url(;);b')).toBe(16);
    });

    it('reads a quote inside unquoted url( text as url text', () => {
      expect(firstSemicolon('url(a"b);')).toBe(8);
    });

    it('reads a quoted url( argument as a string', () => {
      expect(firstSemicolon('url("a;b");')).toBe(10);
    });

    it('reads a backslash before a newline outside a string as itself', () => {
      const newline = stops('\n');
      expect(scan('a\\\nb', 0, 4, newline, 0, 0)).toBe(2);
    });

    it('reads brackets as nesting only with BRACKETS', () => {
      expect(firstSemicolon('[a;b];')).toBe(2);
      expect(firstSemicolon('[a;b];', BRACKETS)).toBe(5);
    });

    it('closes a nesting level only with its own closer', () => {
      expect(firstSemicolon('([)];x);', BRACKETS)).toBe(7);
    });

    it('skips comments only with COMMENTS', () => {
      expect(firstSemicolon('/*;*/;')).toBe(2);
      expect(firstSemicolon('/*;*/;', COMMENTS)).toBe(5);
    });

    it('stops inside parentheses with ANY_DEPTH', () => {
      expect(firstSemicolon('f(;);', ANY_DEPTH)).toBe(2);
    });
  });

  describe('removeComments', () => {
    it('removes a comment inside parentheses but not inside url(', () => {
      expect(removeComments('f(a/*x*/b) url(a/*x*/b)', false)).toBe('f(ab) url(a/*x*/b)');
    });

    it('removes `//` to the end of the line only with lineComments, outside parentheses', () => {
      expect(removeComments('a // x\nb f(c // d\n)', true)).toBe('a \nb f(c // d\n)');
      expect(removeComments('a // x\nb', false)).toBe('a // x\nb');
    });

    it('keeps `//` after a colon', () => {
      expect(removeComments('a: https://x', true)).toBe('a: https://x');
    });

    it('keeps the first of two whitespace runs a comment separates', () => {
      expect(removeComments('a /* x */ b', false)).toBe('a b');
    });

    it('never joins `/` and `*` into a new comment', () => {
      expect(removeComments('//**/*&*/ b', false)).toBe('/ *&*/ b');
    });

    it('removes an unclosed comment to the end', () => {
      expect(removeComments('a /* b', false)).toBe('a ');
    });
  });
});
