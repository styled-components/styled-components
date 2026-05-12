/**
 * CSS Fonts 4 §2.1.5 — generic font-family keywords. RN exposes no
 * concept of "system serif" / "system mono" / etc.; each platform
 * registers concrete font names that ship with the OS. We resolve the
 * spec keyword to a per-platform face name at the v7 transform
 * boundary so a single CSS declaration produces the right glyphs on
 * iOS, Android, and rn-web.
 *
 * rn-web hands the keyword to the browser unchanged (the CSS engine
 * resolves it against the user-agent stylesheet).
 *
 * Picks below are conservative defaults; document any iOS-version /
 * Android-API gates inline. Update when a platform exposes a better
 * canonical face name through PlatformColor / fontVariant.
 */

const IOS_GENERICS: Record<string, string> = {
  // The bare "System" font follows the user-selected Dynamic Type face.
  'system-ui': 'System',
  'ui-sans-serif': 'System',
  'sans-serif': 'System',
  // No clean serif system face; Times New Roman ships on iOS since 2.0.
  serif: 'Times New Roman',
  'ui-serif': 'Times New Roman',
  // Mono: Menlo since iOS 7; SF Mono exists but isn't whitelisted for
  // arbitrary apps until iOS 14, so Menlo stays the safe default.
  monospace: 'Menlo',
  'ui-monospace': 'Menlo',
  // Rounded variant ships on iOS 13+ as "SF Pro Rounded"; fall back to
  // System on earlier versions (we target RN 0.85 which is iOS 15+, so
  // SF Pro Rounded is always available).
  'ui-rounded': 'SF Pro Rounded',
  // No platform cursive face; Snell Roundhand ships with the OS.
  cursive: 'Snell Roundhand',
  // No fantasy face; Papyrus is the loudest preinstalled choice.
  fantasy: 'Papyrus',
  // Apple Color Emoji is the only emoji face installed.
  emoji: 'Apple Color Emoji',
  // No platform math face; route to System and let the dev pick a
  // dedicated math font if needed.
  math: 'System',
  fangsong: 'PingFang SC',
};

const ANDROID_GENERICS: Record<string, string> = {
  'system-ui': 'sans-serif',
  'ui-sans-serif': 'sans-serif',
  'sans-serif': 'sans-serif',
  serif: 'serif',
  'ui-serif': 'serif',
  monospace: 'monospace',
  'ui-monospace': 'monospace',
  'ui-rounded': 'sans-serif',
  cursive: 'cursive',
  fantasy: 'cursive',
  emoji: 'sans-serif',
  math: 'serif',
  fangsong: 'serif',
};

const GENERIC_KEYWORDS = new Set([
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'ui-rounded',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'emoji',
  'math',
  'fangsong',
]);

let osCache: 'ios' | 'android' | 'unknown' | null = null;

function getPlatformOS(): 'ios' | 'android' | 'unknown' {
  if (osCache !== null) return osCache;
  try {
    const os = (require('react-native') as { Platform?: { OS?: string } }).Platform?.OS;
    if (os === 'ios') osCache = 'ios';
    else if (os === 'android') osCache = 'android';
    else osCache = 'unknown';
  } catch {
    osCache = 'unknown';
  }
  return osCache;
}

/**
 * True when the identifier is a CSS generic font-family keyword. Per
 * CSS Fonts 4 §3.1.1 generic family names match ASCII-case-insensitively,
 * so the input is lowercased before lookup. Callers must NOT pass quoted
 * strings; quotes opt the family out of generic resolution by definition.
 */
export function isGenericFamily(name: string): boolean {
  return GENERIC_KEYWORDS.has(name.toLowerCase());
}

/**
 * Resolve a generic font-family keyword to the platform-specific face
 * name. Input is lowercased before lookup (per CSS Fonts 4 §3.1.1) so
 * `Sans-Serif` and `SANS-SERIF` resolve identically. Returns the input
 * string unchanged when the keyword is unknown (defensive — callers
 * gate on {@link isGenericFamily} first).
 *
 * rn-web callers should NOT use this — pass the keyword through so
 * the browser resolves it via the user-agent stylesheet.
 */
export function resolveGenericFamily(keyword: string): string {
  const os = getPlatformOS();
  const table = os === 'ios' ? IOS_GENERICS : ANDROID_GENERICS;
  return table[keyword.toLowerCase()] ?? keyword;
}

/** Test-only: reset the platform cache so subsequent calls re-detect. */
export function __resetGenericFamilyCacheForTest(): void {
  osCache = null;
}
