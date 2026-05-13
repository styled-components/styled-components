// CSS Color 4 §6.2 system colors, mapped through `light-dark()` so
// iOS/Android resolve at render time while rn-web keeps the native CSS form.
// Literals are cross-platform approximations; exact native `PlatformColor`
// values stay opaque and should come from runtime user code.

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

// CSS Color 4 Appendix A deprecated aliases.
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

export function getSystemColorLightDark(keyword: string): string | null {
  const key = keyword.toLowerCase();
  const direct = SYSTEM_COLOR_LD[key];
  if (direct !== undefined) return direct;
  const alias = DEPRECATED_SYSTEM_COLOR_ALIAS[key];
  if (alias !== undefined) return SYSTEM_COLOR_LD[alias] ?? null;
  return null;
}

export const SYSTEM_COLOR_KEYWORDS: readonly string[] = Object.keys(SYSTEM_COLOR_LD);

export const DEPRECATED_SYSTEM_COLOR_KEYWORDS: readonly string[] = Object.keys(
  DEPRECATED_SYSTEM_COLOR_ALIAS
);
