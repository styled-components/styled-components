import { Dict } from '../../../types';
import { withoutSlashes } from '../shorthandHelpers';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

const FONT_STYLES = new Set(['italic', 'oblique']);
const FONT_WEIGHTS = new Set([
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  'bold',
  'bolder',
  'lighter',
  'normal',
]);
const FONT_VARIANTS = new Set(['small-caps']);

/**
 * `font: [<style>] [<weight>] [<variant>] <size>[/<line-height>] <family>`
 * Slash handled inline — pre-stripping loses line-height association.
 */
export function fontShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);

  let fontStyle: string | undefined;
  let fontWeight: string | number | undefined;
  let fontVariant: string[] | undefined;

  // Up to 3 leading keywords (style/weight/variant), any order
  for (let i = 0; i < 3 && !stream.eof(); i++) {
    const t = stream.peek()!;
    if (t.kind === TokenKind.Ident && t.name === 'normal') {
      stream.consume();
      continue;
    }
    if (fontStyle === undefined && t.kind === TokenKind.Ident && FONT_STYLES.has(t.name!)) {
      fontStyle = t.name!;
      stream.consume();
      continue;
    }
    if (
      fontWeight === undefined &&
      ((t.kind === TokenKind.Ident && FONT_WEIGHTS.has(t.name!)) ||
        (t.kind === TokenKind.Number && FONT_WEIGHTS.has(String(t.value))))
    ) {
      fontWeight = t.kind === TokenKind.Number ? t.value! : t.name!;
      stream.consume();
      continue;
    }
    if (fontVariant === undefined && t.kind === TokenKind.Ident && FONT_VARIANTS.has(t.name!)) {
      fontVariant = [t.name!];
      stream.consume();
      continue;
    }
    break;
  }

  // Required: font-size
  const sizeTok = stream.consume();
  if (!sizeTok || (sizeTok.kind !== TokenKind.Length && sizeTok.kind !== TokenKind.Percent)) {
    return null;
  }
  const fontSize = tokenLength(sizeTok);

  let lineHeight: number | string | undefined;
  if (!stream.eof() && stream.peek()!.kind === TokenKind.Slash) {
    stream.consume();
    const lhTok = stream.consume();
    if (!lhTok) return null;
    if (lhTok.kind === TokenKind.Number) lineHeight = lhTok.value!;
    else if (lhTok.kind === TokenKind.Length || lhTok.kind === TokenKind.Percent) {
      lineHeight = tokenLength(lhTok);
    } else return null;
  }

  // Required: font-family (one or more idents/strings)
  const fontFamily = readFontFamily(stream);
  if (fontFamily === null) return null;

  const out: Dict<any> = {
    fontStyle: fontStyle !== undefined ? fontStyle : 'normal',
    fontWeight: fontWeight !== undefined ? fontWeight : 'normal',
    fontVariant: fontVariant !== undefined ? fontVariant : [],
    fontSize,
    fontFamily,
  };
  if (lineHeight !== undefined) out.lineHeight = lineHeight;
  return out;
}

/** `font-family: <string> | <ident>+, …`. */
export function fontFamilyShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const family = readFontFamily(stream);
  if (family === null) return null;
  return { fontFamily: family };
}

/** `font-variant: <ident>+`. RN keeps the array form. */
export function fontVariantShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(withoutSlashes(tokens));
  const out: string[] = [];
  while (!stream.eof()) {
    const t = stream.consume();
    if (!t || (t.kind !== TokenKind.Ident && t.kind !== TokenKind.Comma)) return null;
    if (t.kind === TokenKind.Ident) out.push(t.name!);
  }
  if (out.length === 0) return null;
  return { fontVariant: out };
}

/** `aspect-ratio: <number> [/ <number>]`. */
export function aspectRatioShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const first = stream.consume();
  if (!first || first.kind !== TokenKind.Number) return null;
  let aspectRatio = first.value!;
  if (!stream.eof()) {
    const slash = stream.consume();
    if (!slash || slash.kind !== TokenKind.Slash) return null;
    const divisor = stream.consume();
    if (!divisor || divisor.kind !== TokenKind.Number || divisor.value === 0) return null;
    aspectRatio = aspectRatio / divisor.value!;
  }
  if (!stream.eof()) return null;
  return { aspectRatio };
}

function tokenLength(t: Token): number | string {
  if (t.kind === TokenKind.Length) {
    if (t.unit === 'px' || t.unit === '') return t.value!;
    if (t.value === 0) return 0;
    return t.raw;
  }
  if (t.kind === TokenKind.Percent) return t.raw;
  return t.raw;
}

function readFontFamily(stream: TokenStream): string | null {
  // Read the first family name. CSS allows multiple fallback families
  // separated by commas; RN's `fontFamily` is a single string — we
  // return the first family and document the limitation. Use `raw` not
  // `name` so the family's original casing is preserved (RN is
  // case-sensitive when matching platform fonts).
  const t = stream.consume();
  if (!t) return null;
  if (t.kind === TokenKind.String) return t.text!;
  if (t.kind === TokenKind.Ident) {
    const parts = [t.raw];
    while (!stream.eof()) {
      const next = stream.peek()!;
      if (next.kind === TokenKind.Ident) {
        parts.push(next.raw);
        stream.consume();
        continue;
      }
      break;
    }
    return parts.join(' ');
  }
  return null;
}
