import { Dict } from '../../../types';
import { getReactNativePlatformOS, warnOnce } from '../dev';
import { consumeColor } from '../shorthandHelpers';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `caret-color` per CSS UI Module Level 4 §5.2.1
 * (drafts.csswg.org/css-ui-4/#caret-color).
 *
 *   Value: auto | <color> [auto | <color>]?
 *
 * Spec verbatim (first-value definitions):
 *   auto:    "User agents should use currentColor."
 *   <color>: "The caret is colored with the specified color."
 */

function caretColorShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const first = stream.peek();
  if (first === undefined) return null;
  const firstIsAuto = first.kind === TokenKind.Ident && first.name === 'auto';
  if (firstIsAuto) {
    stream.consume();
  } else if (consumeColor(stream) === null) {
    return null;
  }

  if (!stream.eof()) {
    const second = stream.peek();
    if (second === undefined) return null;
    const secondIsAuto = second.kind === TokenKind.Ident && second.name === 'auto';
    if (secondIsAuto) {
      stream.consume();
    } else if (consumeColor(stream) === null) {
      return null;
    }
    if (!stream.eof()) return null;
    if (__DEV__ && !__NATIVE_WEB__) {
      warnOnce(
        'native-caret-color-block',
        "`caret-color`'s second value only affects block carets, which React Native does not render on iOS or Android. The first value still applies; rn-web keeps both values."
      );
    }
  }

  if (firstIsAuto) return { caretColor: 'auto' };

  if (__NATIVE_WEB__) return { caretColor: first.raw };

  if (__DEV__ && getReactNativePlatformOS() === 'ios') {
    warnOnce(
      'native-caret-color-ios',
      '`caret-color` has no caret-only mapping on iOS. iOS will use its default caret color; Android and rn-web keep the authored value.'
    );
  }
  return { caretColor: first.raw, cursorColor: first.raw };
}

register('caretColor', caretColorShorthand);
