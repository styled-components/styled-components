import { tokenize, TokenType } from '@csstools/css-tokenizer';
import { ANY_DEPTH, BRACKETS, COMMENTS, isUrlCall, removeComments, scan, stops } from './reader';

const SEMICOLON = stops(';');

/**
 * The tokens CSS Syntax 3 reads from `text` (type and source text), comments
 * dropped and each whitespace run read as one space; `null` when a string
 * ends at a raw newline.
 */
function cssTokens(text: string): string[] | null {
  const out: string[] = [];
  for (const token of tokenize({ css: text })) {
    const type = token[0];
    if (type === TokenType.Comment || type === TokenType.EOF) continue;
    if (type === TokenType.BadString) return null;
    if (type === TokenType.Whitespace) {
      if (out[out.length - 1] !== ' ') out.push(' ');
      continue;
    }
    out.push(type + ' ' + token[1]);
  }
  return out;
}

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

    it.each([
      ['an escaped backslash before an escape', '\\\\\\75rl(', false],
      ['an escaped `(` inside the identifier', 'u\\(rl(', false],
    ])('reads backslash runs by their parity: %s', (_, text, expected) => {
      expect(isUrlCall(text, text.length - 1)).toBe(expected);
    });

    /**
     * CSS Syntax 3 §4.3.1 Consume a token, "U+003C LESS-THAN SIGN (<): If the
     * next 3 input code points are U+0021 EXCLAMATION MARK U+002D
     * HYPHEN-MINUS U+002D HYPHEN-MINUS (!--), consume them and return a
     * <CDO-token>." The hyphens after `<!` belong to that token, not to the
     * identifier after it.
     */
    it.each([
      ['<!--url(', true],
      ['a<!--url(', true],
      ['<!--\\75rl(', true],
      ['<!---url(', false],
      ['\\<!--url(', false],
      ['!--url(', false],
    ])('reads `%s` as url( %s after the text `<!--` makes one token of', (text, expected) => {
      expect(isUrlCall(text, text.length - 1)).toBe(expected);
    });

    /** Every reading is linear in the length of the text: a backslash run is read once. */
    describe('reads a backslash run once', () => {
      const n = 200_000;
      it.each([
        ['a run of escaped backslashes before `l(`', '\\'.repeat(n) + 'l('],
        ['a run ending in an escaped `(` before `l(`', '\\'.repeat(n + 1) + '(l('],
      ])('%s', (_, text) => {
        const start = performance.now();
        expect(isUrlCall(text, text.length - 1)).toBe(false);
        expect(performance.now() - start).toBeLessThan(200);
      });
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
      expect(removeComments('f(a /*x*/b) url(a/*x*/b)', false)).toBe('f(a b) url(a/*x*/b)');
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
      expect(removeComments('//*x*/*&*/ b', false)).toBe('//**/*&*/ b');
    });

    it('removes an unclosed comment to the end', () => {
      expect(removeComments('a /* b', false)).toBe('a ');
    });

    /**
     * CSS Syntax 3 §9 Serialization: "For any consecutive pair of tokens, if
     * the first token shows up in the row headings of the following table,
     * and the second token shows up in the column headings, and there’s a ✗
     * in the cell denoted by the intersection of the chosen row and column,
     * the pair of tokens must be serialized with a comment between them. If
     * the tokenizer preserves comments, and there were comments originally
     * between the token pair, the preserved comment(s) should be used;
     * otherwise, an empty comment (/**\/) must be inserted."
     */
    describe('keeps an empty comment where removal would join two tokens', () => {
      it.each([
        ['an identifier and the rest of url(', 'u/*x*/rl(a)', 'u/**/rl(a)'],
        ['two identifiers', 'a/*x*/b', 'a/**/b'],
        ['an identifier and (', 'url/*x*/(a)', 'url/**/(a)'],
        ['a number and a unit', '1/*x*/px', '1/**/px'],
        ['a number and %', '1/*x*/%', '1/**/%'],
        ['a number and a fraction', '1/*x*/.5', '1/**/.5'],
        ['a unit and an exponent sign', '1e/*x*/+2', '1e/**/+2'],
        ['# and a name', '#/*x*/a', '#/**/a'],
        ['@ and a name', '@/*x*/media', '@/**/media'],
        ['. and a digit', './*x*/5', './**/5'],
        ['+ and a digit', '+/*x*/5', '+/**/5'],
        ['- and a digit', '-/*x*/5', '-/**/5'],
        ['-- and >', '--/*x*/>', '--/**/>'],
        ['< and !', '</*x*/!--', '</**/!--'],
        ['/ and *', '//*x*/*', '//**/*'],
        ['an escape and an identifier', 'a\\{/*x*/b', 'a\\{/**/b'],
        ['an escaped space and an identifier', 'a\\ /*x*/b', 'a\\ /**/b'],
        ['a hex escape and a hex digit', '\\4/*x*/1', '\\4/**/1'],
        ['a hex escape and the space that would end it', '\\41/*x*/ b', '\\41/**/ b'],
        ['a hex escape’s space and an identifier', '\\41 /*x*/b', '\\41 /**/b'],
        ['an identifier and an escape', 'a/*x*/\\62', 'a/**/\\62'],
      ])('%s', (_, text, expected) => {
        expect(removeComments(text, false)).toBe(expected);
      });

      it('keeps one empty comment for a run of comments', () => {
        expect(removeComments('a/*x*//*y*/b', false)).toBe('a/**/b');
      });

      it('keeps an empty comment where a line comment’s removal would let a hex escape take the newline', () => {
        expect(removeComments('\\41// x\nb', true)).toBe('\\41/**/\nb');
      });
    });

    describe('removes a comment where the tokens on either side stay apart', () => {
      it.each([
        ['whitespace before', 'a /*x*/b', 'a b'],
        ['whitespace after', 'a/*x*/ b', 'a b'],
        ['a colon', 'color:/*x*/red', 'color:red'],
        ['a closing parenthesis', 'f(a)/*x*/b', 'f(a)b'],
        ['a string', '"a"/*x*/b', '"a"b'],
        ['a comma', 'a,/*x*/b', 'a,b'],
        ['an identifier and a string', 'a/*x*/"b"', 'a"b"'],
        ['whitespace after the space that ends a hex escape', '\\62 /*x*/ c', '\\62  c'],
      ])('%s', (_, text, expected) => {
        expect(removeComments(text, false)).toBe(expected);
      });
    });

    /**
     * The tokens CSS Syntax 3 reads from the text, comments dropped and each
     * whitespace run read as one space: removing comments must leave them
     * unchanged, with `@csstools/css-tokenizer` as the independent reader.
     */
    it('leaves every token as CSS reads it, across seeded random text', () => {
      const alphabet = [
        'a',
        'e',
        'u',
        'rl(',
        '1',
        '5',
        '-',
        '+',
        '.',
        '#',
        '@',
        '%',
        '<',
        '!',
        '>',
        '/',
        '*',
        '/*',
        '*/',
        '/*x*/',
        '\\',
        '\\41',
        '\\4',
        ' ',
        '\n',
        '(',
        ')',
        '"',
        ',',
        ':',
        'é',
        '\0',
      ];
      let seed = 11;
      const next = (n: number) => {
        seed = (Math.imul(seed, 1103515245) + 12345) | 0;
        return ((seed >>> 8) & 0xffffff) % n;
      };
      const failures: string[] = [];
      let compared = 0;
      for (let k = 0; k < 4000; k++) {
        let text = '';
        const parts = 1 + next(10);
        for (let p = 0; p < parts; p++) text += alphabet[next(alphabet.length)];
        const before = cssTokens(text);
        // A string CSS ends at a raw newline, where template text reads on.
        if (before === null) continue;
        compared++;
        const after = cssTokens(removeComments(text, false));
        if (JSON.stringify(after) !== JSON.stringify(before)) failures.push(JSON.stringify(text));
      }
      expect(failures).toEqual([]);
      expect(compared).toBeGreaterThan(3000);
    });
  });
});
