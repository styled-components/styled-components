import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `hyphens` per CSS Text Module Level 4 §6.3.1
 * (drafts.csswg.org/css-text-4/#hyphens-property):
 *
 *   Name:        hyphens
 *   Value:       none | manual | auto
 *   Initial:     manual
 *   Applies to:  text
 *
 * Spec values (verbatim):
 *   none  ;"Words are not hyphenated, even if characters inside the
 *            word explicitly define hyphenation opportunities."
 *   manual;"Words are only hyphenated where there are characters
 *            inside the word that explicitly suggest hyphenation
 *            opportunities."
 *   auto  ;"Words may be broken at hyphenation opportunities
 *            determined automatically by a language-appropriate
 *            hyphenation resource in addition to those indicated
 *            explicitly by a conditional hyphen."
 *
 * RN 0.85 mapping (verified against Text.d.ts):
 *   - Android exposes `android_hyphenationFrequency: 'none' | 'normal' | 'full'`
 *     as a Text component prop (not a style prop). Lifted via the
 *     special-case-props mechanism, identical to how `numberOfLines` is
 *     lifted by line-clamp / text-wrap polyfills.
 *   - iOS has no equivalent style or prop in 0.85. Soft-hyphens (U+00AD)
 *     in source text still hyphenate naturally on both platforms; spec
 *     `manual` therefore matches iOS native behavior with no extra work.
 *   - rn-web honors the `hyphens` style key natively (browser CSS).
 *
 * Spec → Android prop:
 *   none   → 'none'     (no automatic hyphenation; conditional hyphens
 *                        in source still create soft-wrap opportunities
 *                        per spec note about U+002D and U+2010)
 *   manual → 'none'     (UA hyphenates only at explicit U+00AD; Android's
 *                        text engine does this regardless of the
 *                        `android_hyphenationFrequency` setting)
 *   auto   → 'normal'   (Android's balanced strategy; 'full' is reserved
 *                        for justified text which we can't detect at
 *                        transform time)
 *
 * `hyphens` is preserved on the style object so rn-web's browser engine
 * still applies it directly; on RN the unknown style key is silently dropped.
 */

const VALUES = new Set(['none', 'manual', 'auto']);

const SPEC_TO_ANDROID: Record<string, 'none' | 'normal' | 'full'> = {
  none: 'none',
  manual: 'none',
  auto: 'normal',
};

function hyphensShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name!;
  if (!VALUES.has(name)) return null;
  // rn-web: emit the style key only; the browser handles `hyphens`
  // natively. The Android prop lift and the iOS limitation warn are
  // native-only concerns.
  if (__NATIVE_WEB__) return { hyphens: name };
  const out: Dict<any> = {
    hyphens: name,
    android_hyphenationFrequency: SPEC_TO_ANDROID[name],
  };
  if (__DEV__ && name === 'auto') {
    warnOnce(
      'native-hyphens-ios',
      "`hyphens: auto` maps to Android's `android_hyphenationFrequency` but iOS has no equivalent in RN 0.85 (auto-hyphenation cannot be enabled programmatically). The declaration still reaches rn-web where it works as expected; on iOS, embed soft-hyphens (U+00AD) in source text to control break points."
    );
  }
  return out;
}

register('hyphens', hyphensShorthand);
