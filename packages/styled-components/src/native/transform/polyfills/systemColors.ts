// CSS Color 4 system keywords → RN PlatformColor; rn-web preserves the authored keyword string.

type PlatformColorFn = (...names: string[]) => unknown;
type PlatformOS = 'ios' | 'android' | 'unknown';

let platformColor: PlatformColorFn | null | undefined;

function getPlatformColor(): PlatformColorFn | null {
  if (platformColor !== undefined) return platformColor;
  try {
    const rn = require('react-native') as { PlatformColor?: PlatformColorFn };
    platformColor = typeof rn.PlatformColor === 'function' ? rn.PlatformColor : null;
  } catch {
    platformColor = null;
  }
  return platformColor;
}

function getPlatformOS(): PlatformOS {
  try {
    const rn = require('react-native') as { Platform?: { OS?: string } };
    const os = rn.Platform?.OS;
    if (os === 'ios' || os === 'android') return os;
  } catch {
    // Non-RN test environments fall back to the cross-platform table.
  }
  return 'unknown';
}

const SYSTEM_COLOR_LITERAL: Record<string, string> = {
  highlighttext: 'light-dark(#000000, #ffffff)',
  accentcolortext: '#ffffff',
};

const IOS_SYSTEM_COLOR_LITERAL: Record<string, string> = {
  selecteditemtext: '#ffffff',
  marktext: '#000000',
};

const ANDROID_SYSTEM_COLOR_LITERAL: Record<string, string> = {
  graytext: 'light-dark(#6e6e6e, #8e8e93)',
};

const SYSTEM_COLOR_PLATFORM: Record<string, readonly string[]> = {
  // Page background.
  canvas: ['systemBackground', '?attr/colorBackground'],
  // Default foreground text on the page background.
  canvastext: ['label', '?attr/colorForeground'],
  // Form field background.
  field: ['secondarySystemBackground', '?attr/colorBackgroundFloating', '?attr/colorBackground'],
  // Form field foreground.
  fieldtext: ['label', '?attr/colorForeground'],
  // Disabled / unfocused text.
  graytext: ['secondaryLabel', '?attr/textColorSecondary', '?attr/colorForeground'],
  // Transient highlight / hover fill (menus, table rows, etc.).
  highlight: ['quaternarySystemFill', '?attr/colorControlHighlight'],
  // Unvisited hyperlink foreground.
  linktext: ['link', '?attr/textColorLink'],
  // Visited hyperlink foreground.
  visitedtext: ['systemPurple', '@android:color/holo_purple'],
  // Active (currently being clicked) link foreground.
  activetext: ['systemRed', '?attr/colorAccent', '@android:color/holo_red_dark'],
  // Default button background surface.
  buttonface: ['systemFill', '?attr/colorButtonNormal'],
  // Default button label foreground.
  buttontext: ['label', '?attr/colorForeground'],
  // Button border.
  buttonborder: ['separator', '?attr/colorControlNormal'],
  // Selected-item background (lists, tree views, etc.).
  selecteditem: [
    'AccentColor',
    'systemBlue',
    '?attr/colorActivatedHighlight',
    '?attr/colorControlActivated',
    '?attr/colorAccent',
  ],
  // Highlighted text background (`<mark>`, search hits).
  mark: ['systemYellow', '@android:color/holo_orange_light'],
  // Accent surface: drives controls, toggles, focus rings.
  accentcolor: ['systemBlue', '?attr/colorAccent', '?attr/colorControlActivated'],
};

const IOS_SYSTEM_COLOR_PLATFORM: Record<string, readonly string[]> = {
  graytext: ['secondaryLabel'],
};

const ANDROID_SYSTEM_COLOR_PLATFORM: Record<string, readonly string[]> = {
  marktext: ['@android:color/black'],
  selecteditemtext: ['?attr/colorForeground', '@android:color/black'],
};

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

const ALL_SYSTEM_COLOR_KEYS: ReadonlySet<string> = new Set([
  ...Object.keys(SYSTEM_COLOR_LITERAL),
  ...Object.keys(IOS_SYSTEM_COLOR_LITERAL),
  ...Object.keys(ANDROID_SYSTEM_COLOR_LITERAL),
  ...Object.keys(SYSTEM_COLOR_PLATFORM),
  ...Object.keys(IOS_SYSTEM_COLOR_PLATFORM),
  ...Object.keys(ANDROID_SYSTEM_COLOR_PLATFORM),
  ...Object.keys(DEPRECATED_SYSTEM_COLOR_ALIAS),
]);

/** True for CSS system color identifiers and deprecated Appendix A aliases (ASCII case-insensitive). */
export function isCssSystemColorKeyword(ident: string): boolean {
  return ALL_SYSTEM_COLOR_KEYS.has(ident.toLowerCase());
}

/** Wrap a system-color keyword in `var(--sc-unset, kw)` so rn-web's color allowlist forwards it to CSS. */
export function wrapSystemColorForRnWeb(keyword: string): string {
  return 'var(--sc-unset, ' + keyword + ')';
}

export function getSystemColorPlatformColor(keyword: string): unknown | null {
  const key = keyword.toLowerCase();
  const alias = DEPRECATED_SYSTEM_COLOR_ALIAS[key];
  const canonical = alias ?? key;
  const os = getPlatformOS();
  const literal =
    (os === 'ios'
      ? IOS_SYSTEM_COLOR_LITERAL[canonical]
      : os === 'android'
        ? ANDROID_SYSTEM_COLOR_LITERAL[canonical]
        : undefined) ?? SYSTEM_COLOR_LITERAL[canonical];
  if (literal !== undefined) return literal;
  const names =
    (os === 'ios'
      ? IOS_SYSTEM_COLOR_PLATFORM[canonical]
      : os === 'android'
        ? ANDROID_SYSTEM_COLOR_PLATFORM[canonical]
        : undefined) ?? SYSTEM_COLOR_PLATFORM[canonical];
  if (names === undefined) return null;
  const PlatformColor = getPlatformColor();
  return PlatformColor === null ? null : PlatformColor(...names);
}

export const SYSTEM_COLOR_KEYWORDS: readonly string[] = Array.from(
  new Set(
    Object.keys(SYSTEM_COLOR_PLATFORM).concat(
      Object.keys(SYSTEM_COLOR_LITERAL),
      Object.keys(IOS_SYSTEM_COLOR_LITERAL),
      Object.keys(ANDROID_SYSTEM_COLOR_LITERAL),
      Object.keys(IOS_SYSTEM_COLOR_PLATFORM),
      Object.keys(ANDROID_SYSTEM_COLOR_PLATFORM)
    )
  )
);

export const DEPRECATED_SYSTEM_COLOR_KEYWORDS: readonly string[] = Object.keys(
  DEPRECATED_SYSTEM_COLOR_ALIAS
);
