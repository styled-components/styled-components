import { tokenize, tokenizeFunctionArgs } from '../tokenize';
import { TokenKind } from '../tokens';
import { isSafeThemePath, sanitizeValue } from '../sanitize';
import { resetWarningsForTest } from '../dev';

describe('native transform tokenizer', () => {
  it('tokenizes unitless numbers', () => {
    const tokens = tokenize('1.5');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ kind: TokenKind.Number, value: 1.5, unit: '' });
  });

  it('tokenizes lengths with px', () => {
    const tokens = tokenize('10px');
    expect(tokens[0]).toMatchObject({ kind: TokenKind.Length, value: 10, unit: 'px' });
  });

  it('tokenizes relative and absolute lengths', () => {
    const tokens = tokenize('1em 2rem 3ch 4vh 5vw');
    expect(tokens.map(t => ({ kind: t.kind, value: t.value, unit: t.unit }))).toEqual([
      { kind: TokenKind.Length, value: 1, unit: 'em' },
      { kind: TokenKind.Length, value: 2, unit: 'rem' },
      { kind: TokenKind.Length, value: 3, unit: 'ch' },
      { kind: TokenKind.Length, value: 4, unit: 'vh' },
      { kind: TokenKind.Length, value: 5, unit: 'vw' },
    ]);
  });

  it('tokenizes percentages', () => {
    const tokens = tokenize('50%');
    expect(tokens[0]).toMatchObject({ kind: TokenKind.Percent, value: 50, unit: '%' });
  });

  it('tokenizes angles', () => {
    const tokens = tokenize('45deg 0.5rad 0.25turn 100grad');
    expect(tokens.map(t => t.kind)).toEqual([
      TokenKind.Angle,
      TokenKind.Angle,
      TokenKind.Angle,
      TokenKind.Angle,
    ]);
    expect(tokens.map(t => t.unit)).toEqual(['deg', 'rad', 'turn', 'grad']);
  });

  it('tokenizes times', () => {
    const tokens = tokenize('300ms 0.5s');
    expect(tokens.map(t => t.kind)).toEqual([TokenKind.Time, TokenKind.Time]);
  });

  it('handles signed numbers and scientific notation', () => {
    const tokens = tokenize('-1.5 +2px 1e3 -1.5e-2');
    expect(tokens.map(t => t.value)).toEqual([-1.5, 2, 1000, -0.015]);
  });

  it('tokenizes hex colors of all lengths', () => {
    const tokens = tokenize('#fff #abcd #112233 #11223344');
    expect(tokens.map(t => t.kind)).toEqual([
      TokenKind.Hash,
      TokenKind.Hash,
      TokenKind.Hash,
      TokenKind.Hash,
    ]);
    expect(tokens.map(t => t.raw)).toEqual(['#fff', '#abcd', '#112233', '#11223344']);
  });

  it('tokenizes identifiers', () => {
    const tokens = tokenize('solid red auto none sans-serif');
    expect(tokens.map(t => t.kind)).toEqual([
      TokenKind.Ident,
      TokenKind.Ident,
      TokenKind.Ident,
      TokenKind.Ident,
      TokenKind.Ident,
    ]);
    expect(tokens.map(t => t.name)).toEqual(['solid', 'red', 'auto', 'none', 'sans-serif']);
  });

  it('tokenizes function calls and captures args', () => {
    const tokens = tokenize('translateX(10px)');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      kind: TokenKind.Function,
      name: 'translatex',
      args: '10px',
    });
  });

  it('handles nested function calls via lazy tokenization', () => {
    const tokens = tokenize('drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe(TokenKind.Function);
    expect(tokens[0].name).toBe('drop-shadow');
    // Nested rgba should survive via paren-depth tracking
    const inner = tokenizeFunctionArgs(tokens[0]);
    expect(inner.some(t => t.kind === TokenKind.Function && t.name === 'rgba')).toBe(true);
  });

  it('parses comma- and slash-separated values', () => {
    const tokens = tokenize('rgb(255 128 0 / 0.5)');
    expect(tokens[0].kind).toBe(TokenKind.Function);
    const args = tokenizeFunctionArgs(tokens[0]);
    expect(args.some(t => t.kind === TokenKind.Slash)).toBe(true);
  });

  it('parses top-level commas', () => {
    const tokens = tokenize('"Helvetica Neue", "Arial", sans-serif');
    const commas = tokens.filter(t => t.kind === TokenKind.Comma);
    expect(commas).toHaveLength(2);
  });

  it('tokenizes string literals with escapes', () => {
    const tokens = tokenize('"hello \\"world\\""');
    expect(tokens[0]).toMatchObject({
      kind: TokenKind.String,
      quote: 34, // "
    });
    expect(tokens[0].text).toBe('hello "world"');
    expect(tokens[0].raw).toBe('"hello \\"world\\""');
  });

  // CSS Syntax, "Consume a string token", U+005C: "If the next input code point is EOF,
  // do nothing. Otherwise, if the next input code point is a newline, consume it.
  // Otherwise, (the stream starts with a valid escape) consume an escaped code point and
  // append the returned code point to the <string-token>'s value."
  //
  // "Consume an escaped code point", hex digit: "Consume as many hex digits as possible,
  // but no more than 5. Note that this means 1-6 hex digits have been consumed in total.
  // If the next input code point is whitespace, consume it as well. Interpret the hex
  // digits as a hexadecimal number. If this number is zero, or is for a surrogate, or is
  // greater than the maximum allowed code point, return U+FFFD REPLACEMENT CHARACTER (\uFFFD).
  // Otherwise, return the code point with that value." Anything else: "Return the current
  // input code point."
  //
  // "Preprocessing the input stream": "Replace any U+000D CARRIAGE RETURN (CR) code points,
  // U+000C FORM FEED (FF) code points, or pairs of U+000D CARRIAGE RETURN (CR) followed by
  // U+000A LINE FEED (LF) in input by a single U+000A LINE FEED (LF) code point." So each
  // of those spellings is a newline to the clauses above.
  it.each([
    ['a line continuation with LF', '"a\\\nb"', 'ab'],
    ['a line continuation with CR LF', '"a\\\r\nb"', 'ab'],
    ['a line continuation with CR', '"a\\\rb"', 'ab'],
    ['a line continuation with a form feed', '"a\\\fb"', 'ab'],
    ['an escaped quote', '"a\\"b"', 'a"b'],
    ['an escaped backslash', '"a\\\\b"', 'a\\b'],
    ['an escaped letter past hex', '"\\gh"', 'gh'],
    ['a hex escape ended by a space', '"\\41 b"', 'Ab'],
    ['a hex escape ended by CR LF', '"\\41\r\nb"', 'Ab'],
    ['a hex escape ended by a non-hex letter', '"\\41g"', 'Ag'],
    ['a six digit hex escape with a digit after it', '"\\0000411"', 'A1'],
    ['a code point past the 16 bit range', '"\\1f600"', '\u{1f600}'],
    ['a zero code point', '"\\0"', '\uFFFD'],
    ['a surrogate code point', '"\\d800"', '\uFFFD'],
    ['a code point past the maximum', '"\\110000"', '\uFFFD'],
    ['an unterminated string ending in a backslash', '"a\\', 'a'],
  ])('decodes %s in string text and keeps the source in raw', (_label, source, text) => {
    const [token] = tokenize(source);

    expect(token).toMatchObject({ kind: TokenKind.String, raw: source, text });
  });

  it.each([
    ['a control character', '"\\7 abc"'],
    ['a bidi override', '"\\202e abc"'],
    ['a bidi isolate', '"\\2066 abc"'],
    ['an annotation character', '"\\fff9 abc"'],
    ['a delete character', '"\\7f abc"'],
  ])('strips %s spelled by an escape, the same as one written literally', (_label, source) => {
    const [token] = tokenize(source);

    expect(token).toMatchObject({ kind: TokenKind.String, text: 'abc' });
  });

  it('handles single-quoted strings', () => {
    const tokens = tokenize("'Arial'");
    expect(tokens[0]).toMatchObject({ kind: TokenKind.String, quote: 39 });
    expect(tokens[0].text).toBe('Arial');
  });

  it('recognizes calc operators', () => {
    const tokens = tokenize('100% - 20px');
    const ops = tokens.filter(t => t.kind === TokenKind.Op);
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('-');
  });

  it('distinguishes negative number from minus operator', () => {
    // `-10px` → single length token; `100% - 20px` → Percent, Op(-), Length
    const a = tokenize('-10px');
    expect(a).toHaveLength(1);
    expect(a[0].kind).toBe(TokenKind.Length);
    expect(a[0].value).toBe(-10);

    const b = tokenize('100% - 20px');
    expect(b.map(t => t.kind)).toEqual([TokenKind.Percent, TokenKind.Op, TokenKind.Length]);
  });

  it('captures createTheme sentinel tokens', () => {
    const tokens = tokenize('\0sc:colors.bg:#ffffff');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({
      kind: TokenKind.Sentinel,
      path: 'colors.bg',
      fallback: '#ffffff',
    });
  });

  it('captures sentinel with empty fallback', () => {
    const tokens = tokenize('\0sc:colors.bg');
    expect(tokens[0]).toMatchObject({
      kind: TokenKind.Sentinel,
      path: 'colors.bg',
      fallback: '',
    });
  });

  it('splits sentinel from surrounding tokens', () => {
    const tokens = tokenize('1px solid \0sc:colors.border:red');
    expect(tokens.map(t => t.kind)).toEqual([
      TokenKind.Length,
      TokenKind.Ident,
      TokenKind.Sentinel,
    ]);
  });

  it('ignores whitespace but preserves token boundaries', () => {
    const tokens = tokenize('  10px    20px   ');
    expect(tokens).toHaveLength(2);
    expect(tokens.map(t => t.value)).toEqual([10, 20]);
  });

  it('tolerates tabs, form-feed, vertical tab, CRLF', () => {
    const tokens = tokenize('10px\t20px\r\n30px\f40px\v50px');
    expect(tokens.map(t => t.value)).toEqual([10, 20, 30, 40, 50]);
  });

  it('treats NBSP and narrow-NBSP as whitespace (paste artifacts)', () => {
    const tokens = tokenize('10px 20px 30px');
    expect(tokens.map(t => t.value)).toEqual([10, 20, 30]);
  });

  it('treats zero-width and BOM as whitespace (paste artifacts)', () => {
    const tokens = tokenize('﻿10px​20px‌30px‍40px');
    expect(tokens.map(t => t.value)).toEqual([10, 20, 30, 40]);
  });

  it('treats en-quad family and line/para separators as whitespace', () => {
    const tokens = tokenize('10px 20px 30px 40px 50px');
    expect(tokens.map(t => t.value)).toEqual([10, 20, 30, 40, 50]);
  });

  it('handles ideographic space, ogham space, medium math space', () => {
    const tokens = tokenize('10px　20px 30px 40px');
    expect(tokens.map(t => t.value)).toEqual([10, 20, 30, 40]);
  });

  it('handles empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('handles only-whitespace string', () => {
    expect(tokenize('   \t\n\r\f\v ﻿   ')).toEqual([]);
  });

  it('tolerates a BOM at the very start of input', () => {
    const tokens = tokenize('﻿10px 20px');
    expect(tokens.map(t => t.value)).toEqual([10, 20]);
  });

  it('handles tab inside a function body', () => {
    const tokens = tokenize('translate(10px,\t20px)');
    expect(tokens[0].kind).toBe(TokenKind.Function);
    const inner = tokenizeFunctionArgs(tokens[0]);
    expect(inner.filter(t => t.kind === TokenKind.Length).map(t => t.value)).toEqual([10, 20]);
  });
});

describe('sanitization', () => {
  beforeEach(() => resetWarningsForTest());

  it('strips bidi LTR / RTL marks from CSS values', () => {
    const tokens = tokenize('‎10px‏ 20px');
    expect(tokens.map(t => t.value)).toEqual([10, 20]);
  });

  it('strips bidi override / isolate controls (Trojan-Source-style)', () => {
    const tokens = tokenize('red‮');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe(TokenKind.Ident);
    expect(tokens[0].name).toBe('red');
  });

  it('strips isolate controls U+2066..U+2069', () => {
    const tokens = tokenize('⁦red⁩');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('red');
  });

  it('rejects disallowed C0 controls (U+0001..U+0008, U+000E..U+001F)', () => {
    const tokens = tokenize('redblue');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe('redblue');
  });

  it('strips DEL (U+007F) and non-character U+FFFF', () => {
    const tokens = tokenize('red￿');
    expect(tokens[0].name).toBe('red');
  });

  it('keeps NUL bytes so createTheme sentinels continue to parse', () => {
    const tokens = tokenize('\0sc:colors.bg:#fff');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe(TokenKind.Sentinel);
  });

  it('rejects prototype-pollution theme paths', () => {
    const tokens = tokenize('\0sc:__proto__.polluted:0');
    expect(tokens.some(t => t.kind === TokenKind.Sentinel)).toBe(false);
  });

  it('rejects constructor and prototype segments', () => {
    expect(isSafeThemePath('colors.bg')).toBe(true);
    expect(isSafeThemePath('__proto__')).toBe(false);
    expect(isSafeThemePath('a.constructor.b')).toBe(false);
    expect(isSafeThemePath('a.prototype')).toBe(false);
    expect(isSafeThemePath('')).toBe(false);
  });

  it('does not silently truncate large (but valid) input', () => {
    const huge = 'a'.repeat(200_000);
    expect(sanitizeValue(huge).length).toBe(200_000);
  });

  it('is idempotent for clean input (no allocation in hot path)', () => {
    const clean = 'margin: 10px solid rgba(0, 0, 0, 0.5)';
    expect(sanitizeValue(clean)).toBe(clean);
  });

  it('treats zero-width joiner / non-joiner / BOM as whitespace (paste artifacts, not malicious)', () => {
    const tokens = tokenize('10px​20px‌30px‍40px﻿50px');
    expect(tokens.map(t => t.value)).toEqual([10, 20, 30, 40, 50]);
  });
});
