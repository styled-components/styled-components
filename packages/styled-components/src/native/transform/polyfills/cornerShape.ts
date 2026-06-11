import { Dict } from '../../../types';
import { getReactNativePlatformOS, warnOnce } from '../dev';
import { register } from '../shorthands';
import { tokenizeFunctionArgs } from '../tokenize';
import { Token, TokenKind } from '../tokens';
import { TokenStream } from '../tokenStream';

/**
 * `corner-shape` shorthand (CSS Borders 4). Authors describe a corner
 * contour with a superellipse; React Native exposes only `borderCurve:
 * 'circular' | 'continuous'` (iOS-only at the platform layer; Android
 * ignores it). The polyfill maps the two contours RN can actually draw
 * (`round` -> circular, `squircle` -> Apple's continuous curve) and warns
 * for every other contour the platform can't approximate.
 *
 * `borderCurve` is a single per-view prop, so a value that maps different
 * corners to different curves cannot be applied truthfully; that drops
 * with a warning rather than guessing.
 *
 * rn-web passes the raw value through: Chrome 139+ ships `corner-shape`.
 */

// Contours RN can draw, expressed as their borderCurve target.
type Curve = 'circular' | 'continuous';

// superellipse() parameter proximity bands. round == superellipse(1),
// squircle == superellipse(2). Values near 1 read as circular; values
// near 2 read as Apple-smooth (continuous). Anything outside both bands
// has no faithful RN contour.
const CIRCULAR_MIN = 0.75;
const CIRCULAR_MAX = 1.25;
const CONTINUOUS_MIN = 1.5;
const CONTINUOUS_MAX = 2.5;

const KEYWORD_CURVE: Record<string, Curve> = Object.create(null);
KEYWORD_CURVE.round = 'circular';
KEYWORD_CURVE.squircle = 'continuous';

// Keywords with a defined contour that RN cannot render at all.
const UNSUPPORTED_KEYWORDS = new Set(['scoop', 'bevel', 'notch', 'square']);

function warnUnsupported(raw: string): void {
  if (!__DEV__) return;
  warnOnce(
    'native-corner-shape-unsupported',
    '`corner-shape: ' +
      raw +
      '` has no React Native equivalent. iOS and Android can only render circular or Apple-smooth corners. Use `round` or `squircle`.',
    raw
  );
}

function warnAndroid(): void {
  if (!__DEV__) return;
  if (getReactNativePlatformOS() !== 'android') return;
  warnOnce(
    'native-corner-shape-android',
    '`corner-shape` renders circular corners on Android. The `borderCurve` it maps to only takes effect on iOS; Android ignores it and falls back to the default rounded corner.'
  );
}

// Resolve one `<corner-shape-value>` token (keyword or superellipse())
// to a Curve, or `null` when no faithful RN contour exists.
function resolveValue(t: Token): Curve | null {
  if (t.kind === TokenKind.Ident && t.name !== undefined) {
    const curve = KEYWORD_CURVE[t.name];
    if (curve !== undefined) return curve;
    return null;
  }
  if (t.kind === TokenKind.Function && t.name === 'superellipse') {
    const args = tokenizeFunctionArgs(t);
    // superellipse() takes a single <number> | infinity | -infinity.
    // infinity / -infinity are square / notch, which RN can't draw.
    if (args.length !== 1) return null;
    const arg = args[0];
    if (arg.kind !== TokenKind.Number || arg.value === undefined) return null;
    const k = arg.value;
    if (k >= CONTINUOUS_MIN && k <= CONTINUOUS_MAX) return 'continuous';
    if (k >= CIRCULAR_MIN && k <= CIRCULAR_MAX) return 'circular';
    return null;
  }
  return null;
}

export function cornerShapeShorthand(tokens: Token[]): Dict<any> | null {
  const stream = new TokenStream(tokens);
  const values: Token[] = [];
  while (!stream.eof()) {
    const t = stream.consume();
    if (!t) return null;
    const isValueToken =
      (t.kind === TokenKind.Ident && t.name !== undefined) ||
      (t.kind === TokenKind.Function && t.name === 'superellipse');
    if (!isValueToken) return null;
    values.push(t);
  }
  // Grammar is `<corner-shape-value>{1,4}`.
  if (values.length === 0 || values.length > 4) return null;

  const raw = values.map(t => t.raw).join(' ');

  if (__NATIVE_WEB__) {
    // Chrome 139+ renders corner-shape natively; pass the authored value
    // straight through and let the browser draw the contour.
    return { cornerShape: raw };
  }

  const curves: (Curve | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const t = values[i];
    // Validate the token shape before resolving so a bogus keyword is a
    // hard parse failure (null), not a silent drop with a warning.
    if (t.kind === TokenKind.Ident && t.name !== undefined) {
      if (KEYWORD_CURVE[t.name] === undefined && !UNSUPPORTED_KEYWORDS.has(t.name)) return null;
    }
    curves.push(resolveValue(t));
  }

  // A null in the resolved list means at least one corner has no RN
  // contour. Whether the rest map cleanly or not, the whole declaration
  // drops: borderCurve is per-view, so a partial application would lie.
  if (curves.indexOf(null) !== -1) {
    warnUnsupported(raw);
    return {};
  }

  // Every corner resolved. If they don't all agree, borderCurve still
  // can't represent the mix; drop with the mixed warning.
  const first = curves[0];
  for (let i = 1; i < curves.length; i++) {
    if (curves[i] !== first) {
      if (__DEV__) {
        warnOnce(
          'native-corner-shape-mixed',
          '`corner-shape: ' +
            raw +
            '` mixes different corner contours, but React Native applies one `borderCurve` to the whole view. Give every corner the same shape (`round` or `squircle`), or split the corners onto separate wrapping Views.',
          raw
        );
      }
      return {};
    }
  }

  warnAndroid();
  return { borderCurve: first! };
}

register('cornerShape', cornerShapeShorthand);
