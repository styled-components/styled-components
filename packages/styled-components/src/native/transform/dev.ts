import { hasWarned, resetWarnOnce, warnOnce as baseWarnOnce, warnKey } from '../../utils/warnOnce';

/**
 * Walk an `Error().stack` and return the first frame that lives outside
 * of styled-components' own source tree (e.g.
 * `at Tile (.../user/widgets/TransformPlayground.tsx:24:12)`). Returns
 * `null` when there's no recognisable user frame.
 *
 * In Metro/Hermes dev bundles, frame URLs point into the concatenated
 * `.bundle` file with no source path or function name (`at anonymous
 * (http://.../entry.bundle/?...:148330:24)`). Those are useless without
 * sourcemap symbolication, which we can't do synchronously, so we skip
 * them and let `null` fall through. The dev tools' LogBox surfaces a
 * symbolicated trace separately when the user opens the warning.
 *
 * `stack` is exposed for tests so they can pin the input; Hermes, V8,
 * and JavaScriptCore order frames slightly differently in real runs.
 */
const SC_FRAME = /styled-components[\\/](?:src|dist|native)[\\/]/;
const BUNDLE_FRAME = /\.bundle(?:\/|\?|:)/;
// Engine intrinsic frames (`at forEach (native)`, `at Array.map (native)`,
// `at <anonymous>`) carry no source-location information; surfacing them
// to the developer is worse than no frame at all.
const INTRINSIC_FRAME = /\((?:native|<anonymous>)\)\s*$/;
export function getUserCallSite(stack?: string | null): string | null {
  if (stack === undefined) {
    if (typeof Error === 'undefined') return null;
    stack = new Error().stack;
  }
  if (!stack) return null;
  const lines = stack.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.indexOf(' at ') === -1) continue;
    if (SC_FRAME.test(line)) continue;
    if (BUNDLE_FRAME.test(line)) continue;
    if (INTRINSIC_FRAME.test(line)) continue;
    if (line.indexOf('node:internal/') !== -1) continue;
    if (line.indexOf('node_modules/jest') !== -1) continue;
    if (line.indexOf('node_modules/@jest') !== -1) continue;
    return line.trim();
  }
  return null;
}

/**
 * Native-side wrapper around the shared `warnOnce`. Adds a "Called from"
 * suffix pointing at the first user-code stack frame so the developer can
 * jump straight to the offending styled-component declaration. The shared
 * utility owns the dedupe Set and the `[sc]` prefix. The `code` is the
 * internal dedupe key only; it does NOT appear in the printed message.
 */
export function warnOnce(code: string, message: string, dedupeSuffix?: string): void {
  if (!__DEV__) return;
  // Skip the `new Error().stack` walk when the warning is already deduped.
  // The user-call-site suffix is only useful the first time the warning fires;
  // dedupe short-circuit lets repeated decls (same css value across many
  // styled components) skip ~80μs of stack parsing per call.
  if (hasWarned(warnKey(code, dedupeSuffix))) return;
  const callSite = getUserCallSite();
  const suffix = callSite === null ? '' : `\n    Called from: ${callSite}`;
  baseWarnOnce(code, message + suffix, dedupeSuffix);
}

/**
 * Test-only reset. Does nothing in production because warnings are
 * already suppressed there.
 */
export function resetWarningsForTest(): void {
  resetWarnOnce();
}

/**
 * Dev-time scan for createTheme sentinel tokens that survived the
 * resolver pipeline and would otherwise reach RN as opaque strings.
 *
 * A "leak" is a sentinel whose `\0` start is glued to a preceding
 * non-boundary character, indicating the sentinel was concatenated with
 * something else in JS land; typically `${p => 47 + t.space.xl}` style
 * arithmetic that coerced the sentinel to a string before the runtime
 * resolver could see it. Boundary characters (whitespace, comma, paren,
 * slash) are normal sentinel separators in multi-value contexts (e.g.
 * `border: ${t.borderWidth} solid ${t.colors.ink}`) and must NOT trigger
 * the warning.
 *
 * Callers must wrap in `if (__DEV__)` so production tree-shakes the call.
 */
export function warnIfSentinelLeak(prop: string, value: unknown): void {
  if (typeof value !== 'string') return;
  const len = value.length;
  for (let i = 0; i < len; i++) {
    if (value.charCodeAt(i) !== 0) continue;
    if (i === 0) continue;
    const prev = value.charCodeAt(i - 1);
    if (
      prev === 0x20 || // space
      prev === 0x09 || // tab
      prev === 0x0a || // newline
      prev === 0x0d || // CR
      prev === 0x2c || // ,
      prev === 0x28 || // (
      prev === 0x29 || // )
      prev === 0x2f // /
    ) {
      continue;
    }
    warnOnce(
      'native-token-leak',
      `a createTheme token was concatenated into the value of "${prop}" with JS arithmetic and won't resolve at render time. Common cause: \`\${p => p.x + t.space.xl}\`. The JS \`+\` flattens the token into a placeholder string before the active theme can be applied. Use \`calc(\${p.x}px + \${t.space.xl}px)\` instead so each side resolves separately against the active ThemeProvider. See https://styled-components.com/docs/api#createtheme for the composition rules.`,
      prop
    );
    return;
  }
}

const SKEW_RE = /\bskew[XY]?\s*\(/;

export function getReactNativePlatformOS(): string | undefined {
  try {
    return (require('react-native') as { Platform?: { OS?: string } }).Platform?.OS;
  } catch {
    return undefined;
  }
}

/**
 * Warn once if a `transform` value uses `skewX` / `skewY` on Android.
 * RN Android's `BaseViewManager` decomposes the transform matrix but
 * applies only translation, rotation, and scale to the underlying
 * `View`; Android `View` has no `setSkewX` / `setSkewY` API, and the
 * skew components of the decomposition are silently discarded. The
 * declaration looks like it works at the styled-components layer; the
 * pixels just never move. Tracked at facebook/react-native#27649.
 */
export function warnIfAndroidSkew(value: unknown): void {
  if (!__DEV__) return;
  if (typeof value !== 'string') return;
  if (!SKEW_RE.test(value)) return;
  if (getReactNativePlatformOS() !== 'android') return;
  warnOnce(
    'native-android-skew',
    `\`skewX\` / \`skewY\` are ignored on Android (seen in transform: "${value}"). Android views support translation, rotation, and scale, but not skew. Tracked at https://github.com/facebook/react-native/issues/27649.`
  );
}

/**
 * Warn once if `vertical-align` is set on iOS. RN's `Text.js` and
 * `TextInput.js` both translate `verticalAlign` to `textAlignVertical`
 * at the JS layer, but iOS Fabric exposes no `textAlignVertical`
 * handler (`ReactTextViewManager` / `ReactTextInputManager` only
 * register the prop on Android). On iOS the declaration looks like it
 * works but never repositions the glyphs or the caret.
 */
export function warnIfIosVerticalAlign(value: string): void {
  if (!__DEV__) return;
  if (value === 'auto') return;
  if (getReactNativePlatformOS() !== 'ios') return;
  warnOnce(
    'native-vertical-align-ios',
    `\`vertical-align: ${value}\` has no effect on iOS \`<Text>\` or \`<TextInput>\` in React Native 0.85 (no platform API; the prop only renders on Android and rn-web). For \`<Text>\`, wrap it in a View with \`justify-content: <flex-start | center | flex-end>\` to align glyphs within a fixed-height container. \`<TextInput>\` has no Text-level workaround; iOS positions the caret and content at the platform default.`,
    value
  );
}
