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
 * ignores it). The polyfill maps the contours RN can actually draw and
 * warns for the rest.
 *
 * Three contours are reachable:
 *
 * - `round` -> `borderCurve: 'circular'`, which is also RN's default, so
 *   this is exact on every platform.
 * - `squircle` -> Apple's continuous curve. An approximation, and a loose
 *   one: `continuous` smooths curvature rather than squaring the corner,
 *   so it moves the outline roughly an eighth as far as the exponent-4
 *   superellipse the spec asks for, and Android drops `borderCurve`
 *   entirely.
 * - `square` -> a zero radius on the affected corners. The spec notes that
 *   `square` "looks identical to the 'normal' square corner you get from
 *   `border-radius: 0`", so this one is exact rather than approximate, and
 *   it works on Android too.
 *
 * `square` cannot be emitted as a radius directly from here: `corner-shape`
 * and `border-radius` are independent properties, so a later `border-radius`
 * declaration must not undo it. The handler emits a corner mask under
 * {@link CORNER_SQUARE_SENTINEL_KEY} and `compileNative` folds it into the
 * per-corner radii once the whole block has merged.
 *
 * `borderCurve` is a single per-view prop, so a value that asks two
 * *curved* corners for different curves cannot be applied truthfully and
 * drops with a warning. Mixing `square` with one curve is fine, because the
 * square corners are expressed as radii instead of as a curve.
 *
 * rn-web passes the raw value through: Chrome 139+ ships `corner-shape`.
 */

// Contours RN can draw, expressed as their borderCurve target.
type Curve = 'circular' | 'continuous';

// A resolved corner: a curve, or a zero radius for `square`.
type Treatment = Curve | 'square';

/**
 * Key carrying a 4-bit corner mask (bit 0 top-left, then clockwise,
 * matching `BORDER_RADIUS_KEYS`) for corners that resolved to `square`.
 * Folded into per-corner radii by `compileNative` after the declaration
 * block merges, never emitted to the host.
 */
export const CORNER_SQUARE_SENTINEL_KEY = '__sc_cornerSquare';

// superellipse() parameter proximity bands. round == superellipse(1),
// squircle == superellipse(2). Values near 1 read as circular; values
// near 2 read as Apple-smooth (continuous). Anything outside both bands
// has no faithful RN contour.
const CIRCULAR_MIN = 0.75;
const CIRCULAR_MAX = 1.25;
const CONTINUOUS_MIN = 1.5;
const CONTINUOUS_MAX = 2.5;

const KEYWORD_TREATMENT: Record<string, Treatment> = Object.create(null);
KEYWORD_TREATMENT.round = 'circular';
KEYWORD_TREATMENT.squircle = 'continuous';
KEYWORD_TREATMENT.square = 'square';

// Keywords with a defined contour that RN cannot render at all.
const UNSUPPORTED_KEYWORDS = new Set(['scoop', 'bevel', 'notch']);

function warnUnsupported(raw: string): void {
  if (!__DEV__) return;
  warnOnce(
    'native-corner-shape-unsupported',
    '`corner-shape: ' +
      raw +
      '` has no React Native equivalent. Concave and beveled contours cannot be drawn; the reachable shapes are `round`, `squircle`, and `square`.',
    raw
  );
}

// Only `continuous` is iOS-only; `circular` is RN's default everywhere and
// `square` becomes a radius, so neither warrants an Android warning.
function warnAndroid(): void {
  if (!__DEV__) return;
  if (getReactNativePlatformOS() !== 'android') return;
  warnOnce(
    'native-corner-shape-android',
    'The Apple-smooth corner curve (`corner-shape: squircle`, or a `superellipse()` value near 2) renders as an ordinary circular corner on Android. The `borderCurve` it maps to is absent from the Android view config, so the prop is dropped. Use `corner-shape: square` for a contour Android draws, or accept the circular fallback.'
  );
}

// Resolve one `<corner-shape-value>` token (keyword or superellipse())
// to a Treatment, or `null` when no faithful RN contour exists.
function resolveValue(t: Token): Treatment | null {
  if (t.kind === TokenKind.Ident && t.name !== undefined) {
    const treatment = KEYWORD_TREATMENT[t.name];
    if (treatment !== undefined) return treatment;
    return null;
  }
  if (t.kind === TokenKind.Function && t.name === 'superellipse') {
    const args = tokenizeFunctionArgs(t);
    // superellipse() takes a single <number> | infinity | -infinity.
    if (args.length !== 1) return null;
    const arg = args[0];
    // superellipse(infinity) is `square`, a 90deg convex corner, which a
    // zero radius draws exactly. -infinity is `notch` (concave) and has no
    // RN equivalent, so it falls through to the unsupported path.
    if (arg.kind === TokenKind.Ident && arg.name === 'infinity') return 'square';
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

  const resolved: (Treatment | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const t = values[i];
    // Validate the token shape before resolving so a bogus keyword is a
    // hard parse failure (null), not a silent drop with a warning.
    if (t.kind === TokenKind.Ident && t.name !== undefined) {
      if (KEYWORD_TREATMENT[t.name] === undefined && !UNSUPPORTED_KEYWORDS.has(t.name)) return null;
    }
    resolved.push(resolveValue(t));
  }

  // A null in the resolved list means at least one corner has no RN
  // contour. Whether the rest map cleanly or not, the whole declaration
  // drops: a partial application would lie about the corners it skipped.
  if (resolved.indexOf(null) !== -1) {
    warnUnsupported(raw);
    return {};
  }

  // Expand `<corner-shape-value>{1,4}` across the four corners in the CSS
  // corner order (top-left, top-right, bottom-right, bottom-left), using
  // the same 1->aaaa / 2->abab / 3->abcb / 4->abcd rule as `border-radius`.
  const a = resolved[0]!;
  const b = resolved.length >= 2 ? resolved[1]! : a;
  const c = resolved.length >= 3 ? resolved[2]! : a;
  const d = resolved.length === 4 ? resolved[3]! : b;
  const corners: Treatment[] = [a, b, c, d];

  // Square corners become radii, so only the curved corners have to agree
  // on the single per-view `borderCurve`.
  let squareMask = 0;
  let curve: Curve | null = null;
  for (let i = 0; i < 4; i++) {
    const t = corners[i];
    if (t === 'square') {
      squareMask |= 1 << i;
      continue;
    }
    if (curve === null) {
      curve = t;
      continue;
    }
    if (curve !== t) {
      if (__DEV__) {
        warnOnce(
          'native-corner-shape-mixed',
          '`corner-shape: ' +
            raw +
            '` gives two corners different curves, but React Native applies one `borderCurve` to the whole view. Use one curve for every non-`square` corner, or split the corners onto separate wrapping Views.',
          raw
        );
      }
      return {};
    }
  }

  const out: Dict<any> = {};
  if (squareMask !== 0) out[CORNER_SQUARE_SENTINEL_KEY] = squareMask;
  // An all-`square` value needs no curve at all, and skipping it keeps the
  // Android warning quiet for a value Android renders exactly.
  if (curve !== null) {
    out.borderCurve = curve;
    if (curve === 'continuous') warnAndroid();
  }
  return out;
}

register('cornerShape', cornerShapeShorthand);
