import { AT, BACKSLASH, OPEN_PAREN } from '../utils/charCodes';
import { fifoSet } from '../utils/fifoMap';
import type { StaticDeclNode } from './ast';
import { NodeKind } from './ast';
import { isCustomProperty, trimRange } from './parser';
import {
  BRACKETS,
  codeTable,
  COMMENTS,
  isEscaped,
  isIdentCode,
  isSpace,
  readField,
  scan,
  skipOrdinary,
  stops,
} from './reader';

/**
 * Code points whose presence in a value can change how its field reads: the
 * ones the reading acts on outside strings, `*` (a comment after `/`), NUL
 * (an identifier code point), and newlines (which end a string).
 */
const PRESENCE = codeTable('{}()[];"\'\\/*\0\n\r\f', false);

/**
 * Whether a value substituted between `before` and `after` (the template
 * text around it in its field) leaves the field reading as the template does
 * with any other plain text in its place, so the field needs no reading: the
 * value is not empty, holds no code point the reading depends on, does not
 * follow an escaping backslash, and does not end an identifier that runs on
 * to a `(`, where it could spell `url(`.
 */
export function isPlainValue(value: string, before: string, after: string): boolean {
  const len = value.length;
  if (len === 0 || skipOrdinary(value, 0, len, PRESENCE) !== len) return false;
  if (isEscaped(before, before.length)) return false;
  if (!isIdentCode(value.charCodeAt(len - 1))) return true;
  for (let i = 0; i < after.length; i++) {
    const c = after.charCodeAt(i);
    if (c === OPEN_PAREN || c === BACKSLASH) return false;
    if (!isIdentCode(c)) return true;
  }
  return true;
}

/** Code points a style object value is read for before it is written into its template as text. */
const TEMPLATE_SPECIAL = codeTable('{}()[];"\'\\/\0', false);
/**
 * Code points the template reading takes differently from a declaration
 * value's own reading: a bracket does not nest there, `/` may start a `//`
 * line comment, and NUL starts a slot marker.
 */
const TEMPLATE_UNSAFE = codeTable('[]{}/\0', false);
const WHOLE_VALUE = [0, 0];

/**
 * Whether a style object value can be written into its template as text:
 * it reads as a whole declaration value of its own (see {@link readField})
 * with no top-level `;`, and holds no {@link TEMPLATE_UNSAFE} code point.
 */
export function readsAsTemplateValue(value: string): boolean {
  const len = value.length;
  const special = skipOrdinary(value, 0, len, TEMPLATE_SPECIAL);
  if (special === len) return true;
  if (skipOrdinary(value, special, len, TEMPLATE_UNSAFE) !== len) return false;
  WHOLE_VALUE[1] = len;
  return readField(value, WHOLE_VALUE, 1) === 0;
}

const DECLARATION_END = stops(';');
const DECLARATION_COLON = stops(':');

const splitCache = new Map<string, StaticDeclNode[]>();
const SPLIT_CACHE_LIMIT = 200;

/**
 * Split a realized declaration whose fields passed {@link readField} into
 * its declarations at every top-level `;`. Each part keeps its own text, cut
 * only at a top-level `;` or `:`, so a part that is dropped (no `:`, or an
 * empty value on a regular property) never leaves another part reading
 * differently.
 */
export function splitDeclarations(text: string): StaticDeclNode[] {
  const cached = splitCache.get(text);
  if (cached !== undefined) return cached;
  const decls: StaticDeclNode[] = [];
  const len = text.length;
  let start = 0;
  while (start <= len) {
    const end = scan(text, start, len, DECLARATION_END, COMMENTS | BRACKETS, 0);
    const colon = scan(text, start, end, DECLARATION_COLON, COMMENTS | BRACKETS, 0);
    if (colon < end) {
      const prop = trimRange(text, start, colon);
      const value = trimRange(text, colon + 1, end);
      if (prop !== '' && (value !== '' || isCustomProperty(prop))) {
        decls.push({ kind: NodeKind.Decl, prop, value });
      }
    }
    start = end + 1;
  }
  fifoSet(splitCache, text, decls, SPLIT_CACHE_LIMIT);
  return decls;
}

/** Index of the first code point of `text` outside leading whitespace and comments. */
export function leadingCode(text: string): number {
  let i = 0;
  for (;;) {
    while (i < text.length && isSpace(text.charCodeAt(i))) i++;
    if (!text.startsWith('/*', i)) return i;
    const close = text.indexOf('*/', i + 2);
    if (close === -1) return text.length;
    i = close + 2;
  }
}

/**
 * The pieces a realized declaration splits into at top-level `;`, as
 * {@link splitDeclarations} splits it, whose text starts with an at-keyword.
 */
export function atKeywordPieces(text: string): string[] {
  const pieces: string[] = [];
  const len = text.length;
  let start = 0;
  while (start <= len) {
    const end = scan(text, start, len, DECLARATION_END, COMMENTS | BRACKETS, 0);
    const piece = trimRange(text, start, end);
    if (piece.charCodeAt(leadingCode(piece)) === AT) pieces.push(piece);
    start = end + 1;
  }
  return pieces;
}
