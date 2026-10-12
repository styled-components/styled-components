/**
 * Token kinds for the native CSS value tokenizer. Numeric const enum ;
 * JSC/V8 inline the literals and these identifiers never appear in the bundle.
 */
export const enum TokenKind {
  Number = 1,
  Length = 2,
  Percent = 3,
  Angle = 4,
  Time = 5,
  Ident = 6,
  String = 7,
  Function = 8,
  Comma = 9,
  Slash = 10,
  Hash = 11,
  Op = 12,
  Sentinel = 13,
}

/**
 * Fields no token kind uses stay present and `undefined` so every token
 * carries the same 12 properties. The "always present, possibly undefined"
 * shape (rather than `field?:` optional) is deliberate: it forces every
 * token factory to produce the same property-add order, which is what V8
 * keys hidden classes off of. Per-kind sparse shapes produced 8+ distinct
 * hidden classes and turned the hot `tok.kind` / `tok.value` reads
 * megamorphic.
 *
 * Per-token memory cost is ~12 slots (~96 bytes) vs ~32-48 bytes for the
 * narrow shape. For typical 4-token CSS values the extra ~256 bytes per
 * tokenize is well within budget for the IC win.
 *
 * {@link Token} is a union keyed on `kind`, so a `kind` check narrows the
 * fields that kind populates from `T | undefined` to `T`. The union is a
 * compile-time view only; the runtime shape is identical for every kind.
 */
interface UnusedFields {
  args: undefined;
  fallback: undefined;
  name: undefined;
  op: undefined;
  path: undefined;
  quote: undefined;
  text: undefined;
  unit: undefined;
  value: undefined;
}

interface TokenBase {
  /** Exact source substring; useful for pass-through emission. */
  raw: string;
  /**
   * Function: lazily tokenized argument tokens. Populated on demand by
   * {@link tokenize} when callers dive into nested content. Top-level
   * tokenization leaves this `null` to avoid wasted work on pass-through values.
   */
  argTokens: Token[] | null;
}

type TokenOf<Kind extends TokenKind, Fields> = TokenBase &
  Omit<UnusedFields, keyof Fields> &
  Fields & { kind: Kind };

/** Numeric value plus unit (e.g. "px", "em", "deg", "ms"; `%` for Percent; empty for Number). */
interface UnitFields {
  unit: string;
  value: number;
}

export type NumberToken = TokenOf<TokenKind.Number, UnitFields>;
export type LengthToken = TokenOf<TokenKind.Length, UnitFields>;
export type PercentToken = TokenOf<TokenKind.Percent, UnitFields>;
export type AngleToken = TokenOf<TokenKind.Angle, UnitFields>;
export type TimeToken = TokenOf<TokenKind.Time, UnitFields>;
/** `name` is the lowercased identifier. */
export type IdentToken = TokenOf<TokenKind.Ident, { name: string }>;
/** `text` is the unescaped content minus enclosing quotes; `quote` is the original quote's char code. */
export type StringToken = TokenOf<TokenKind.String, { quote: number; text: string }>;
/** `name` is the lowercased function name; `args` the raw substring between the parens. */
export type FunctionToken = TokenOf<TokenKind.Function, { args: string; name: string }>;
/** `name` holds the hex digits without `#`. */
export type HashToken = TokenOf<TokenKind.Hash, { name: string }>;
/** `op` is `+` | `-` | `*` | `/`. */
export type OpToken = TokenOf<TokenKind.Op, { op: string }>;
/** createTheme leaf: dot-path into the theme and the fallback literal after the final colon. */
export type SentinelToken = TokenOf<TokenKind.Sentinel, { fallback: string; path: string }>;
export type CommaToken = TokenOf<TokenKind.Comma, {}>;
export type SlashToken = TokenOf<TokenKind.Slash, {}>;

/** A single token produced by tokenize(). */
export type Token =
  | NumberToken
  | LengthToken
  | PercentToken
  | AngleToken
  | TimeToken
  | IdentToken
  | StringToken
  | FunctionToken
  | HashToken
  | OpToken
  | SentinelToken
  | CommaToken
  | SlashToken;

/**
 * Every factory below writes the same 12 properties in the same order
 * (kind, raw, value, unit, name, args, argTokens, text, quote, op, path,
 * fallback); that's what V8 keys hidden classes off of. Per-kind property
 * orders would produce 8+ distinct hidden classes and turn the hot
 * `.kind` / `.value` / `.unit` reads in shorthand and polyfill handlers
 * megamorphic.
 */
export function numberToken(raw: string, value: number): NumberToken {
  return {
    kind: TokenKind.Number,
    raw,
    value,
    unit: '',
    name: undefined,
    args: undefined,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op: undefined,
    path: undefined,
    fallback: undefined,
  };
}

export function lengthToken(raw: string, value: number, unit: string): LengthToken {
  return {
    kind: TokenKind.Length,
    raw,
    value,
    unit,
    name: undefined,
    args: undefined,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op: undefined,
    path: undefined,
    fallback: undefined,
  };
}

export function percentToken(raw: string, value: number): PercentToken {
  return {
    kind: TokenKind.Percent,
    raw,
    value,
    unit: '%',
    name: undefined,
    args: undefined,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op: undefined,
    path: undefined,
    fallback: undefined,
  };
}

export function angleToken(raw: string, value: number, unit: string): AngleToken {
  return {
    kind: TokenKind.Angle,
    raw,
    value,
    unit,
    name: undefined,
    args: undefined,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op: undefined,
    path: undefined,
    fallback: undefined,
  };
}

export function timeToken(raw: string, value: number, unit: string): TimeToken {
  return {
    kind: TokenKind.Time,
    raw,
    value,
    unit,
    name: undefined,
    args: undefined,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op: undefined,
    path: undefined,
    fallback: undefined,
  };
}

/**
 * Idempotent ASCII-lowercase. `String.prototype.toLowerCase` always
 * allocates a fresh string. The overwhelming majority of CSS authored
 * in the wild is already lowercase (function names like `oklch(` /
 * idents like `solid`), so we scan for any uppercase ASCII byte first
 * and skip the allocation when the input is pure-lowercase. Only
 * ASCII `A–Z` triggers `toLowerCase`, matching CSS identifiers’
 * ASCII case-insensitivity; other code units are returned unchanged.
 *
 * Co-located with the token factories rather than tokenize.ts to avoid
 * a circular import (tokenize → tokens, but tokens needs the helper
 * for identToken's lowercased `name` field).
 *
 * Adding a memoization cache over this scan regressed bench numbers
 * (Map / prototypeless-object lookup overhead exceeded the cost of
 * the short-string scan for the typical 2-6-char CSS ident / unit).
 * The inline form is the fast path.
 */
export function toLowerIfMixed(s: string): string {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0x41 && c <= 0x5a) return s.toLowerCase();
  }
  return s;
}

export function identToken(raw: string): IdentToken {
  return {
    kind: TokenKind.Ident,
    raw,
    value: undefined,
    unit: undefined,
    name: toLowerIfMixed(raw),
    args: undefined,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op: undefined,
    path: undefined,
    fallback: undefined,
  };
}

export function stringToken(raw: string, text: string, quote: number): StringToken {
  return {
    kind: TokenKind.String,
    raw,
    value: undefined,
    unit: undefined,
    name: undefined,
    args: undefined,
    argTokens: null,
    text,
    quote,
    op: undefined,
    path: undefined,
    fallback: undefined,
  };
}

export function functionToken(raw: string, name: string, args: string): FunctionToken {
  return {
    kind: TokenKind.Function,
    raw,
    value: undefined,
    unit: undefined,
    name: toLowerIfMixed(name),
    args,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op: undefined,
    path: undefined,
    fallback: undefined,
  };
}

export function hashToken(raw: string, hex: string): HashToken {
  return {
    kind: TokenKind.Hash,
    raw,
    value: undefined,
    unit: undefined,
    name: hex,
    args: undefined,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op: undefined,
    path: undefined,
    fallback: undefined,
  };
}

export function opToken(op: string): OpToken {
  return {
    kind: TokenKind.Op,
    raw: op,
    value: undefined,
    unit: undefined,
    name: undefined,
    args: undefined,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op,
    path: undefined,
    fallback: undefined,
  };
}

export function sentinelToken(raw: string, path: string, fallback: string): SentinelToken {
  return {
    kind: TokenKind.Sentinel,
    raw,
    value: undefined,
    unit: undefined,
    name: undefined,
    args: undefined,
    argTokens: null,
    text: undefined,
    quote: undefined,
    op: undefined,
    path,
    fallback,
  };
}

export const COMMA_TOKEN: CommaToken = {
  kind: TokenKind.Comma,
  raw: ',',
  value: undefined,
  unit: undefined,
  name: undefined,
  args: undefined,
  argTokens: null,
  text: undefined,
  quote: undefined,
  op: undefined,
  path: undefined,
  fallback: undefined,
};

export const SLASH_TOKEN: SlashToken = {
  kind: TokenKind.Slash,
  raw: '/',
  value: undefined,
  unit: undefined,
  name: undefined,
  args: undefined,
  argTokens: null,
  text: undefined,
  quote: undefined,
  op: undefined,
  path: undefined,
  fallback: undefined,
};
