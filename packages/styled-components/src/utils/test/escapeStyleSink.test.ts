import { escapeCssForStyleTag, escapeHtmlAttribute } from '../escapeStyleSink';

describe('escapeCssForStyleTag', () => {
  it('passes safe CSS through unchanged', () => {
    expect(escapeCssForStyleTag('.a { color: red; }')).toBe('.a { color: red; }');
    expect(escapeCssForStyleTag('')).toBe('');
  });

  it('escapes the leading `<` of `</style` so the HTML tokenizer cannot end the tag', () => {
    expect(escapeCssForStyleTag('color: </style><script>alert(1)</script>;')).toBe(
      'color: \\3C/style><script>alert(1)</script>;'
    );
  });

  it('does not escape `</script` or other tag closers; only `</style` ends a style block', () => {
    expect(escapeCssForStyleTag('content: "</script>"')).toBe('content: "</script>"');
  });

  it('matches case-insensitively', () => {
    expect(escapeCssForStyleTag('a{}</STYLE>')).toBe('a{}\\3C/style>');
    expect(escapeCssForStyleTag('a{}</StYlE>')).toBe('a{}\\3C/style>');
  });

  it('escapes inside CSS string values', () => {
    expect(escapeCssForStyleTag('content: "</style>"')).toBe('content: "\\3C/style>"');
  });

  it('preserves legitimate `</` sequences that are not closing-tag boundaries', () => {
    expect(escapeCssForStyleTag('content: "a</foo>b"')).toBe('content: "a</foo>b"');
    expect(escapeCssForStyleTag('content: "a</bar>b"')).toBe('content: "a</bar>b"');
  });
});

describe('escapeHtmlAttribute', () => {
  it('passes safe values through unchanged', () => {
    expect(escapeHtmlAttribute('abc123_-/+=')).toBe('abc123_-/+=');
    expect(escapeHtmlAttribute('')).toBe('');
  });

  it('escapes the four characters that can break out of a double-quoted attribute', () => {
    expect(escapeHtmlAttribute('">x<')).toBe('&quot;>x&lt;');
    expect(escapeHtmlAttribute('a&b')).toBe('a&amp;b');
  });

  it('escapes a payload that would otherwise close the nonce attribute and inject markup', () => {
    expect(escapeHtmlAttribute('"><script>alert(1)</script>')).toBe(
      '&quot;>&lt;script>alert(1)&lt;/script>'
    );
  });
});
