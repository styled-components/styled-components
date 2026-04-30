/**
 * Token kinds for the native CSS value tokenizer. Numeric const enum —
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
 * A single token produced by tokenize(). Every kind populates the same
 * 12 properties; fields irrelevant to the kind are `undefined`.
 *
 * The "always present, possibly undefined" shape (rather than `field?:`
 * optional) is deliberate: it forces every token factory to produce the
 * same property-add order, which is what V8 keys hidden classes off of.
 * Per-kind sparse shapes produced 8+ distinct hidden classes and turned
 * the hot `tok.kind` / `tok.value` reads megamorphic.
 *
 * Per-token memory cost is ~12 slots (~96 bytes) vs ~32-48 bytes for the
 * narrow shape. For typical 4-token CSS values the extra ~256 bytes per
 * tokenize is well within budget for the IC win.
 */
export interface Token {
  kind: TokenKind;
  /** Exact source substring; useful for pass-through emission. */
  raw: string;
  /** Length / Percent / Angle / Time / Number / Op(arithmetic). Numeric value. */
  value: number | undefined;
  /** Length / Angle / Time unit (e.g. "px", "em", "deg", "ms"). `%` for Percent. Empty for Number. */
  unit: string | undefined;
  /** Ident / Function name (lowercased). Hash: hex digits without `#`. */
  name: string | undefined;
  /** Function: raw arg substring between parens. */
  args: string | undefined;
  /**
   * Function: lazily tokenized argument tokens. Populated on demand by
   * {@link tokenize} when callers dive into nested content. Top-level
   * tokenization leaves this `null` to avoid wasted work on pass-through values.
   */
  argTokens: Token[] | null;
  /** String: unescaped content, minus enclosing quotes. */
  text: string | undefined;
  /** String: `"` or `'` char code of the original quote. */
  quote: number | undefined;
  /** Op: `+` | `-` | `*` | `/`. */
  op: string | undefined;
  /** Sentinel (createTheme leaf): dot-path into the theme. */
  path: string | undefined;
  /** Sentinel: fallback literal after the final colon. */
  fallback: string | undefined;
}

/**
 * All token factories funnel through {@link makeToken} to produce objects
 * with the same property-add order; that's what V8 keys hidden classes
 * off of. Per-kind factories would produce 8+ distinct hidden classes
 * and turn the hot `.kind` / `.value` / `.unit` reads in shorthand and
 * polyfill handlers megamorphic.
 *
 * Per-token memory cost is ~12 slots × 8 bytes ≈ 96B (was ~32-48B
 * for narrowly-typed objects). For typical 4-token CSS values the
 * extra ~256B per tokenize is well within budget for the IC win.
 */
function makeToken(
  kind: TokenKind,
  raw: string,
  value: number | undefined,
  unit: string | undefined,
  name: string | undefined,
  args: string | undefined,
  argTokens: Token[] | null,
  text: string | undefined,
  quote: number | undefined,
  op: string | undefined,
  path: string | undefined,
  fallback: string | undefined
): Token {
  return { kind, raw, value, unit, name, args, argTokens, text, quote, op, path, fallback };
}

export function numberToken(raw: string, value: number): Token {
  return makeToken(
    TokenKind.Number,
    raw,
    value,
    '',
    undefined,
    undefined,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
}

export function lengthToken(raw: string, value: number, unit: string): Token {
  return makeToken(
    TokenKind.Length,
    raw,
    value,
    unit,
    undefined,
    undefined,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
}

export function percentToken(raw: string, value: number): Token {
  return makeToken(
    TokenKind.Percent,
    raw,
    value,
    '%',
    undefined,
    undefined,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
}

export function angleToken(raw: string, value: number, unit: string): Token {
  return makeToken(
    TokenKind.Angle,
    raw,
    value,
    unit,
    undefined,
    undefined,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
}

export function timeToken(raw: string, value: number, unit: string): Token {
  return makeToken(
    TokenKind.Time,
    raw,
    value,
    unit,
    undefined,
    undefined,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
}

export function identToken(raw: string): Token {
  return makeToken(
    TokenKind.Ident,
    raw,
    undefined,
    undefined,
    raw.toLowerCase(),
    undefined,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
}

export function stringToken(raw: string, text: string, quote: number): Token {
  return makeToken(
    TokenKind.String,
    raw,
    undefined,
    undefined,
    undefined,
    undefined,
    null,
    text,
    quote,
    undefined,
    undefined,
    undefined
  );
}

export function functionToken(raw: string, name: string, args: string): Token {
  return makeToken(
    TokenKind.Function,
    raw,
    undefined,
    undefined,
    name.toLowerCase(),
    args,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
}

export function hashToken(raw: string, hex: string): Token {
  return makeToken(
    TokenKind.Hash,
    raw,
    undefined,
    undefined,
    hex,
    undefined,
    null,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined
  );
}

export function opToken(op: string): Token {
  return makeToken(
    TokenKind.Op,
    op,
    undefined,
    undefined,
    undefined,
    undefined,
    null,
    undefined,
    undefined,
    op,
    undefined,
    undefined
  );
}

export function sentinelToken(raw: string, path: string, fallback: string): Token {
  return makeToken(
    TokenKind.Sentinel,
    raw,
    undefined,
    undefined,
    undefined,
    undefined,
    null,
    undefined,
    undefined,
    undefined,
    path,
    fallback
  );
}

export const COMMA_TOKEN: Token = makeToken(
  TokenKind.Comma,
  ',',
  undefined,
  undefined,
  undefined,
  undefined,
  null,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined
);
export const SLASH_TOKEN: Token = makeToken(
  TokenKind.Slash,
  '/',
  undefined,
  undefined,
  undefined,
  undefined,
  null,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined
);
