import { Dict } from '../../../types';
import { getReactNativePlatformOS, warnOnce } from '../dev';
import { colorTokenToRnStyleValue, consumeColor } from '../shorthandHelpers';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `caret-color: auto | <color> [auto | <color>]?`. `auto` resolves to
 * currentColor.
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

  const v = colorTokenToRnStyleValue(first);
  if (getReactNativePlatformOS() === 'ios') {
    if (__DEV__) {
      warnOnce(
        'native-caret-color-ios',
        '`caret-color` also tints the text-selection highlight on iOS because iOS exposes a single `selectionColor` for both surfaces. Android and rn-web keep the spec semantics where only the caret is colored.'
      );
    }
    return { caretColor: v, cursorColor: v, selectionColor: v };
  }
  return { caretColor: v, cursorColor: v };
}

register('caretColor', caretColorShorthand);
