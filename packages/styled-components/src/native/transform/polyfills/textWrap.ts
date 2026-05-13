import { Dict } from '../../../types';
import { getReactNativePlatformOS, warnOnce } from '../dev';
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

function warnIosTextWrapBalancePretty(style: string): void {
  if (!__DEV__) return;
  if (getReactNativePlatformOS() !== 'ios') return;
  warnOnce(
    'native-text-wrap-ios',
    '`text-wrap: ' +
      style +
      "` maps to Android's `textBreakStrategy` but iOS has no equivalent in RN 0.85 (silently rendered with default line-breaking). The declaration still reaches rn-web where it works as expected.",
    style
  );
}

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
  // rn-web: the browser implements `text-wrap` (mode + style) natively
  // via Chromium / WebKit / Gecko. Emit only the shorthand and skip the
  // RN-prop lifts (numberOfLines, ellipsizeMode, textBreakStrategy) so
  // we don't fight the browser's own line-breaking implementation.
  if (__NATIVE_WEB__) return { textWrap: value };

  const out: Dict<any> = { textWrap: value };
  if (mode === 'nowrap') {
    // `numberOfLines: 1` + `ellipsizeMode: 'clip'` is the closest spec
    // approximation RN exposes (the line cannot truly overflow
    // horizontally; we clip instead of ellipsise). Applied silently
    // because the user-observed behavior matches the spec intent.
    out.numberOfLines = 1;
    out.ellipsizeMode = 'clip';
  }
  if (style === 'balance') {
    out.textBreakStrategy = 'balanced';
    if (__DEV__) warnIosTextWrapBalancePretty(style);
  } else if (style === 'pretty') {
    out.textBreakStrategy = 'highQuality';
    if (__DEV__) warnIosTextWrapBalancePretty(style);
  } else if (style === 'stable') {
    if (__DEV__) {
      warnOnce(
        'native-text-wrap-stable',
        '`text-wrap: stable` has no React Native equivalent on iOS or Android in 0.85 (no platform API for re-flow stability). The declaration still reaches rn-web where it works as expected.'
      );
    }
  }
  return out;
}

/**
 * `text-wrap-mode: wrap | nowrap` (CSS Text 4 §5.4). Initial `wrap`,
 * inherited. The `nowrap` value is mirrored to `numberOfLines: 1` for
 * RN's Text lift.
 */
function textWrapModeLonghand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name === undefined || !MODES.has(name)) return null;
  if (__NATIVE_WEB__) return { textWrapMode: name };
  const out: Dict<any> = { textWrapMode: name };
  if (name === 'nowrap') {
    // Same nowrap approximation as the shorthand path, applied silently.
    out.numberOfLines = 1;
    out.ellipsizeMode = 'clip';
  }
  return out;
}

/**
 * `text-wrap-style: auto | balance | stable | pretty` (CSS Text 4 §5.5).
 * Initial `auto`, inherited. `balance` and `pretty` map to Android's
 * `textBreakStrategy`; iOS has no equivalent (warns once). `stable` has
 * no native equivalent at all (warns once).
 */
function textWrapStyleLonghand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const name = t.name;
  if (name === undefined || !STYLES.has(name)) return null;
  if (__NATIVE_WEB__) return { textWrapStyle: name };
  const out: Dict<any> = { textWrapStyle: name };
  if (name === 'balance') {
    out.textBreakStrategy = 'balanced';
    if (__DEV__) warnIosTextWrapBalancePretty(name);
  } else if (name === 'pretty') {
    out.textBreakStrategy = 'highQuality';
    if (__DEV__) warnIosTextWrapBalancePretty(name);
  } else if (name === 'stable') {
    if (__DEV__) {
      warnOnce(
        'native-text-wrap-stable',
        '`text-wrap: stable` has no React Native equivalent on iOS or Android in 0.85 (no platform API for re-flow stability). The declaration still reaches rn-web where it works as expected.'
      );
    }
  }
  return out;
}

register('textWrap', textWrapShorthand);
register('textWrapMode', textWrapModeLonghand);
register('textWrapStyle', textWrapStyleLonghand);
