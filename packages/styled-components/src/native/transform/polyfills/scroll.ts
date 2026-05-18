import { Dict } from '../../../types';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

const OVERSCROLL_KEYWORDS = new Set(['contain', 'none', 'auto', 'chain']);
const SCROLLBAR_WIDTH_KEYWORDS = new Set(['auto', 'thin', 'none']);

function overscrollBehaviorShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name === undefined || !OVERSCROLL_KEYWORDS.has(name)) return null;
  const suppress = name === 'contain' || name === 'none';
  return {
    bounces: !suppress,
    overScrollMode: suppress ? 'never' : 'auto',
  };
}

function scrollbarWidthHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name === undefined || !SCROLLBAR_WIDTH_KEYWORDS.has(name)) return null;
  const hide = name === 'none';
  return {
    showsVerticalScrollIndicator: !hide,
    showsHorizontalScrollIndicator: !hide,
  };
}

register('overscrollBehavior', overscrollBehaviorShorthand);
register('scrollbarWidth', scrollbarWidthHandler);
