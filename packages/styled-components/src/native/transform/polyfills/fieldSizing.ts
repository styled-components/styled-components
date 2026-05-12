import { Dict } from '../../../types';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * CSS Form Control Styling 1 §7.1 (`field-sizing`).
 * Syntax: `fixed | content`. Initial: `fixed`. Inherited: no.
 *
 * `content` makes form controls autosize to their content;`fixed` keeps
 * the author-specified dimensions (the default).
 *
 * On native, the polyfill lifts `multiline: true` (via SPECIAL_CASE_PROPS).
 * RN's shadow-view measure callback (`RCTBaseTextInputShadowView.sizeThatFits`)
 * returns the natural text content size with `maximumSize.height = CGFLOAT_MAX`
 * for multiline inputs, so Yoga sizes the view to its text. As the user types
 * the shadow view dirties, Yoga re-measures, and the view grows on its own —
 * no JS-side `onContentSizeChange` wiring required. Setting an explicit
 * `height` on the input would defeat that natural growth, so the polyfill
 * intentionally only flips `multiline`. Author-declared `min-height` and
 * `max-height` still apply.
 *
 * On rn-web the polyfill also lifts `multiline: true` so the TextInput
 * renders as `<textarea>` (otherwise `<input>` has nothing to vertically
 * autosize) and keeps the `field-sizing` CSS in the base for the browser
 * to honor natively (Chrome 123+).
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
    // rn-web emits the declaration so the browser sees the explicit
    // `field-sizing: fixed` (defends against a cascaded `content` from
    // an ancestor). Native has no surface to honor on `fixed`.
    return __NATIVE_WEB__ ? { fieldSizing: 'fixed' } : {};
  }

  if (__NATIVE_WEB__) {
    // Browser handles autosize natively (Chrome 123+). Lift multiline
    // so rn-web renders a textarea (the only element field-sizing can
    // vertically autosize).
    return { multiline: true, fieldSizing: 'content' };
  }

  // Native: lift `multiline` only. Yoga + RN's shadow-view measure
  // callback do the actual growth;a flag stays on the compile output
  // so the render path can warn when user `multiline={false}` voids
  // the lift.
  return { multiline: true, fieldSizing: 'content' };
}

register('fieldSizing', fieldSizingHandler);
