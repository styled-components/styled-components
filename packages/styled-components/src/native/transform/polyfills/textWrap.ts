import { Dict } from '../../../types';
import { warnOnce } from '../dev';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `text-wrap` shorthand (CSS Text 4 §5.5). Verified against RN 0.85.2:
 * `numberOfLines` is the nowrap analogue; `textBreakStrategy` (Android
 * API 23+) maps to balance / pretty; iOS has no platform line-breaking
 * control. Both Text props are lifted via SPECIAL_CASE_PROPS.
 */

const MODES = new Set(['wrap', 'nowrap']);
const STYLES = new Set(['auto', 'balance', 'stable', 'pretty']);

function textWrapShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  let mode: string | null = null;
  let style: string | null = null;

  while (!stream.eof()) {
    const t = stream.consume();
    if (!t || t.kind !== TokenKind.Ident) return null;
    const name = t.name;
    if (name === undefined) return null;
    if (MODES.has(name)) {
      if (mode !== null) return null;
      mode = name;
    } else if (STYLES.has(name)) {
      if (style !== null) return null;
      style = name;
    } else {
      return null;
    }
  }
  if (mode === null && style === null) return null;

  const value = mode !== null && style !== null ? mode + ' ' + style : mode !== null ? mode : style;
  const out: Dict<any> = { textWrap: value };

  if (mode === 'nowrap') out.numberOfLines = 1;
  if (style === 'balance') {
    out.textBreakStrategy = 'balanced';
    warnIosNoTextWrap(style);
  } else if (style === 'pretty') {
    out.textBreakStrategy = 'highQuality';
    warnIosNoTextWrap(style);
  } else if (style === 'stable') {
    warnNoTextWrapStable();
  }
  return out;
}

function warnIosNoTextWrap(style: string): void {
  if (!__DEV__) return;
  warnOnce(
    'native-text-wrap-ios',
    '`text-wrap: ' +
      style +
      "` maps to Android's `textBreakStrategy` but iOS has no equivalent in RN 0.85 (silently rendered with default line-breaking). The declaration still reaches rn-web where it works as expected.",
    style
  );
}

function warnNoTextWrapStable(): void {
  if (!__DEV__) return;
  warnOnce(
    'native-text-wrap-stable',
    '`text-wrap: stable` has no React Native equivalent on iOS or Android in 0.85 (no platform API for re-flow stability). The declaration still reaches rn-web where it works as expected.'
  );
}

register('textWrap', textWrapShorthand);
