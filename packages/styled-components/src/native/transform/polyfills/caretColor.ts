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
    if (!__NATIVE_WEB__ && __DEV__) {
      warnOnce(
        'native-caret-color-block',
        "`caret-color`'s second value (text color overlapping the caret) requires `caret-shape: block`, which React Native does not render on iOS or Android in 0.85. The first value is applied; the second has no effect. rn-web honors both natively."
      );
    }
  }

  if (firstIsAuto) return { caretColor: 'auto' };

  if (__NATIVE_WEB__) return { caretColor: first.raw };

  if (__DEV__ && getReactNativePlatformOS() === 'ios') {
    warnOnce(
      'native-caret-color-ios',
      "`caret-color` maps to Android's `cursorColor` TextInput prop but iOS has no equivalent: RN's `selectionColor` would tint the selection range as well, violating the spec. iOS will use its default caret color. The declaration reaches rn-web and Android where it works as expected."
    );
  }
  return { caretColor: first.raw, cursorColor: first.raw };
}

register('caretColor', caretColorShorthand);
