import { Dict } from '../../../types';
import { getReactNativePlatformOS, warnOnce } from '../dev';
import { register } from '../shorthands';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * CSS UI 4 §6.3 (`interactivity`). Syntax: `auto | inert`. Initial: `auto`.
 *
 * `inert` makes the element and its subtree non-interactive: no pointer
 * events, no focus, no text-selection, no hit-testing. RN has no single
 * `inert` prop; the polyfill lifts six top-level props (all force-override
 * the author value per SPECIAL_CASE_PROPS, since CSS UI 4 §6.3 mandates
 * "regardless of its actual value" for each surface):
 *
 *   pointerEvents="none"                          — blocks touch on root + descendants
 *   accessibilityElementsHidden={true}            — iOS: hide subtree from VoiceOver
 *   importantForAccessibility="no-hide-descendants" — Android: hide subtree from TalkBack
 *   focusable={false}                              — root: prevent D-pad/keyboard focus
 *   selectable={false}                             — Text/TextInput: no text selection
 *   editable={false}                               — TextInput: not editable
 *
 * Known limitation: RN doesn't propagate `focusable={false}` to
 * descendants, so a focusable child inside an inert subtree may still
 * receive D-pad / keyboard focus on Android. A future refactor could
 * traverse the subtree at render time; for now the lift covers the
 * common case. rn-web honors
 * `interactivity: inert` natively via the browser's HTML inert
 * attribute (passes through unchanged).
 */
function interactivityHandler(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const t = stream.consume();
  if (!t || t.kind !== TokenKind.Ident || !stream.eof()) return null;
  const value = t.name;
  if (value !== 'auto' && value !== 'inert') return null;

  if (__NATIVE_WEB__) {
    // Lift the HTML `inert` attribute (forwarded by rn-web via
    // `accessibilityProps`). The browser handles all five inert spec
    // bullets — hit-testing, focus, selection, edit-suppression, a11y
    // subtree hiding — in a single attribute. `auto` clears it.
    return value === 'auto' ? { inert: false } : { inert: true };
  }

  if (value === 'auto') return {};

  // inert: lift six top-level props via SPECIAL_CASE_PROPS.
  if (__DEV__) {
    const platform = getReactNativePlatformOS();
    if (platform === 'android') {
      warnOnce(
        'native-interactivity-inert-focusable-leak',
        '`interactivity: inert` cannot stop focus on every descendant on Android. A focusable child inside the inert subtree may still receive D-pad or keyboard focus; touch and screen-reader blocking still apply to the subtree.',
        'inert'
      );
    }
  }
  return {
    pointerEvents: 'none',
    accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
    focusable: false,
    selectable: false,
    editable: false,
  };
}

register('interactivity', interactivityHandler);
