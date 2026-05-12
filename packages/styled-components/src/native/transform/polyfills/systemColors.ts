/**
 * CSS Color 4 §6.2 — CSS system colors.
 *
 * Each keyword resolves to a UA / platform-defined color tied to a UI
 * surface (page background, default foreground text, selection,
 * disabled text, hyperlink). Per CSS Color 4: "User agents must
 * provide a mapping of these system color values to specific colors
 * appropriate to the platform" and "must respect the user agent's
 * color scheme."
 *
 * v7 native maps the keyword to a `light-dark()` expression carrying
 * sensible per-mode literals; the existing light-dark polyfill then
 * resolves the active scheme at render time on iOS / Android and
 * leaves the function intact for the browser on rn-web. This keeps
 * the implementation transparent (one CSS declaration, three
 * platforms) without coupling to RN's `PlatformColor` surface, which
 * varies across iOS / Android and is awkward to round-trip through
 * the static fold.
 *
 * The light / dark literals were picked from the closest macOS /
 * iOS / Android system defaults and cross-checked against Safari,
 * Chrome, and Firefox so the swatches read consistently across the
 * three engines. Platform-specific overrides via PlatformColor stay
 * available to authors who need the exact native value — emit the
 * keyword from a runtime resolver instead of from the styled
 * declaration, since PlatformColor returns an opaque token.
 *
 * Reference: https://drafts.csswg.org/css-color-4/#css-system-colors
 */

const SYSTEM_COLOR_LD: Record<string, string> = {
  // Page background.
  canvas: 'light-dark(#ffffff, #1c1c1e)',
  // Default foreground text on the page background.
  canvastext: 'light-dark(#000000, #ffffff)',
  // Form field background.
  field: 'light-dark(#ffffff, #2c2c2e)',
  // Form field foreground.
  fieldtext: 'light-dark(#000000, #ffffff)',
  // Disabled / unfocused text.
  graytext: 'light-dark(#6e6e6e, #8e8e93)',
  // Selection background.
  highlight: 'light-dark(#0066cc, #007aff)',
  // Selection foreground.
  highlighttext: 'light-dark(#ffffff, #ffffff)',
  // Unvisited hyperlink foreground.
  linktext: 'light-dark(#0066cc, #4099ff)',
  // Visited hyperlink foreground.
  visitedtext: 'light-dark(#551a8b, #b388ff)',
  // Active (currently being clicked) link foreground.
  activetext: 'light-dark(#ff0000, #ff453a)',
  // Default button background surface.
  buttonface: 'light-dark(#efefef, #5f5f5f)',
  // Default button label foreground.
  buttontext: 'light-dark(#000000, #ffffff)',
  // Button border.
  buttonborder: 'light-dark(#767676, #9b9b9b)',
  // Selected-item background (lists, tree views, etc.).
  selecteditem: 'light-dark(#0078d4, #3b82f6)',
  // Selected-item foreground.
  selecteditemtext: 'light-dark(#ffffff, #ffffff)',
  // Highlighted text background (`<mark>`, search hits).
  mark: 'light-dark(#fcf4a3, #9c8d2a)',
  // Highlighted text foreground.
  marktext: 'light-dark(#000000, #ffffff)',
  // Accent surface — drives controls, toggles, focus rings.
  accentcolor: 'light-dark(#0078d4, #3b82f6)',
  // Accent foreground rendered against AccentColor.
  accentcolortext: 'light-dark(#ffffff, #ffffff)',
};

/**
 * Deprecated keyword → mandatory keyword per CSS Color 4 Appendix A.
 * Per spec: "User agents must support these keywords, and to mitigate
 * fingerprinting must map them to the (undeprecated) system colors."
 * Reference: https://drafts.csswg.org/css-color-4/#deprecated-system-colors
 */
const DEPRECATED_SYSTEM_COLOR_ALIAS: Record<string, string> = {
  activeborder: 'buttonborder',
  activecaption: 'canvastext',
  appworkspace: 'canvas',
  background: 'canvas',
  buttonhighlight: 'buttonface',
  buttonshadow: 'buttonface',
  captiontext: 'canvastext',
  inactiveborder: 'buttonborder',
  inactivecaption: 'canvas',
  inactivecaptiontext: 'graytext',
  infobackground: 'canvas',
  infotext: 'canvastext',
  menu: 'canvas',
  menutext: 'canvastext',
  scrollbar: 'canvas',
  threeddarkshadow: 'buttonborder',
  threedface: 'buttonface',
  threedhighlight: 'buttonborder',
  threedlightshadow: 'buttonborder',
  threedshadow: 'buttonborder',
  window: 'canvas',
  windowframe: 'buttonborder',
  windowtext: 'canvastext',
};

/**
 * Look up a CSS system color keyword and return its `light-dark()`
 * expansion. Returns `null` for non-system-color identifiers.
 *
 * Match is case-insensitive per CSS syntax §3.4 ("identifiers are
 * ASCII case-insensitive when compared in normative contexts").
 * Deprecated aliases route through the replacement table per CSS
 * Color 4 Appendix A.
 */
export function getSystemColorLightDark(keyword: string): string | null {
  const key = keyword.toLowerCase();
  const direct = SYSTEM_COLOR_LD[key];
  if (direct !== undefined) return direct;
  const alias = DEPRECATED_SYSTEM_COLOR_ALIAS[key];
  if (alias !== undefined) return SYSTEM_COLOR_LD[alias] ?? null;
  return null;
}

/** All recognised system color keywords (lowercased). Exported for
 *  the spec compliance describe block; library code goes through
 *  {@link getSystemColorLightDark}. */
export const SYSTEM_COLOR_KEYWORDS: readonly string[] = Object.keys(SYSTEM_COLOR_LD);

/** Deprecated keyword aliases (lowercased) → replacement keyword. Exported
 *  for the spec compliance describe block. */
export const DEPRECATED_SYSTEM_COLOR_KEYWORDS: readonly string[] = Object.keys(
  DEPRECATED_SYSTEM_COLOR_ALIAS
);
