import { Dict } from '../../../types';
import { getReactNativePlatformOS, warnOnce } from '../dev';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `hyphens: none | manual | auto`. Initial: `manual`. Applies to text.
 *
 * RN 0.85 mapping (verified against Text.d.ts):
 *   - Android exposes `android_hyphenationFrequency: 'none' | 'normal' | 'full'`
 *     as a Text component prop (not a style prop). Lifted via the
 *     special-case-props mechanism, identical to how `numberOfLines` is
 *     lifted by line-clamp / text-wrap polyfills.
 *   - iOS has no equivalent style or prop in 0.85. Soft-hyphens (U+00AD)
 *     in source text still hyphenate naturally on both platforms;
 *     `manual` therefore matches iOS native behavior with no extra work.
 *
 * Mapping to Android prop:
 *   none   → 'none'     (no automatic hyphenation; conditional hyphens
 *                        in source still create soft-wrap opportunities)
 *   manual → 'none'     (UA hyphenates only at explicit U+00AD; Android's
 *                        text engine does this regardless of the
 *                        `android_hyphenationFrequency` setting)
 *   auto   → 'normal'   (Android's balanced strategy; 'full' is reserved
 *                        for justified text which we can't detect at
 *                        transform time)
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
  if (__NATIVE_WEB__) {
    // Browser ships hyphens end-to-end; the Android prop lift and the
    // iOS-limitation warn are native-only.
    return { hyphens: name };
  }
  const out: Dict<any> = {
    hyphens: name,
    android_hyphenationFrequency: SPEC_TO_ANDROID[name],
  };
  if (__DEV__ && name === 'auto' && getReactNativePlatformOS() === 'ios') {
    warnOnce(
      'native-hyphens-ios',
      '`hyphens: auto` cannot enable automatic hyphenation on iOS in React Native. On iOS, add soft hyphens (U+00AD) where words may break.'
    );
  }
  return out;
}

register('hyphens', hyphensShorthand);
