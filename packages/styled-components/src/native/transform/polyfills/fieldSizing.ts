import { Dict } from '../../../types';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `field-sizing: fixed | content`. Initial: `fixed`. Inherited: no.
 *
 * `content` makes form controls autosize to their content; `fixed` keeps
 * the author-specified dimensions (the default).
 *
 * The polyfill lifts `multiline: true` (via SPECIAL_CASE_PROPS).
 * RN's shadow-view measure callback (`RCTBaseTextInputShadowView.sizeThatFits`)
 * returns the natural text content size with `maximumSize.height = CGFLOAT_MAX`
 * for multiline inputs, so Yoga sizes the view to its text. As the user types
 * the shadow view dirties, Yoga re-measures, and the view grows on its own;
 * no JS-side `onContentSizeChange` wiring required. Setting an explicit
 * `height` on the input would defeat that natural growth, so the polyfill
 * intentionally only flips `multiline`. Author-declared `min-height` and
 * `max-height` still apply.
 *
 * If the user explicitly passes `multiline={false}` they bypass the lift;
 * the render path warns once so the missing autosize behavior is visible
 * in dev.
 */
function fieldSizingHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const value = t.name;
  if (value !== 'content' && value !== 'fixed') return null;

  if (value === 'fixed') {
    // Browser ships field-sizing; native has no surface to honor on `fixed`.
    return __NATIVE_WEB__ ? { fieldSizing: 'fixed' } : {};
  }

  // Lift `multiline` so Yoga + RN's shadow-view measure callback do the
  // actual growth; a flag stays on the compile output so the render
  // path can warn when user `multiline={false}` voids the lift.
  return { multiline: true, fieldSizing: 'content' };
}

register('fieldSizing', fieldSizingHandler);
