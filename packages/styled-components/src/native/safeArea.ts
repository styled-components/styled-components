/**
 * Safe-area inset sources for `env(safe-area-inset-*)`, resolved at
 * render time in order:
 *  1. an explicit `<SafeAreaInsetsProvider>` value,
 *  2. the ambient `react-native-safe-area-context` `<SafeAreaProvider>`,
 *     read through its `SafeAreaInsetsContext` when that optional peer is
 *     installed,
 *  3. otherwise the frozen zero insets.
 *
 * Recognized names always substitute (zeros when no source is present,
 * matching a rectangular display per CSS Environment Variables §2.1). The
 * peer's `useSafeAreaInsets()` throws without a provider; reading
 * `SafeAreaInsetsContext` directly keeps a missing provider a silent zero
 * rather than a render crash.
 */

import React from 'react';
import type { SafeAreaInsets } from './transform/polyfills/resolvers';
import { warnOnce } from '../utils/warnOnce';

export type { SafeAreaInsets };

export const EMPTY_SAFE_AREA_INSETS: SafeAreaInsets = Object.freeze({
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
});

type InsetsContext = React.Context<SafeAreaInsets | null>;

/**
 * Explicit inset source, overriding the peer read. Fed by
 * {@link SafeAreaInsetsProvider}; `null` means "no explicit value", so
 * resolution falls through to the peer and then to zeros.
 */
const EXPLICIT_INSETS_CONTEXT: InsetsContext = React.createContext<SafeAreaInsets | null>(null);
EXPLICIT_INSETS_CONTEXT.displayName = 'StyledComponentsSafeAreaInsets';

/** Used when the optional peer is absent so `useContext` stays unconditional. */
const FALLBACK_INSETS_CONTEXT: InsetsContext = React.createContext<SafeAreaInsets | null>(null);

let peerPresent: boolean | undefined;
let SafeAreaInsetsContext: InsetsContext | undefined;

function loadPeer(): void {
  if (peerPresent !== undefined) return;
  try {
    // Optional peer: absent installs must not break the native entry.
    const mod = require('react-native-safe-area-context') as {
      SafeAreaInsetsContext: InsetsContext;
    };
    SafeAreaInsetsContext = mod.SafeAreaInsetsContext;
    peerPresent = SafeAreaInsetsContext !== undefined;
  } catch {
    SafeAreaInsetsContext = undefined;
    peerPresent = false;
  }
}

/**
 * Hook that returns the live safe-area insets for the current render: an
 * explicit {@link SafeAreaInsetsProvider} value if present, otherwise the
 * ambient peer insets, otherwise the frozen zero insets. Both contexts are
 * read unconditionally (a fallback context stands in for the peer when it
 * is absent) so the hook sequence stays stable across bundles.
 *
 * When `warnIfNoSource` is set (the caller passes it only for components that
 * literally wrote `env(safe-area-inset-*)`, not the conservative
 * function-interpolation opt-in), warns once in development if the peer is not
 * installed and no explicit provider supplies insets.
 */
export function useSafeAreaInsets(warnIfNoSource = false): SafeAreaInsets {
  const explicit = React.useContext(EXPLICIT_INSETS_CONTEXT);
  loadPeer();
  const fromPeer = React.useContext(SafeAreaInsetsContext ?? FALLBACK_INSETS_CONTEXT);
  if (__DEV__ && warnIfNoSource && explicit === null && !peerPresent) {
    warnOnce(
      'native-safe-area-no-source',
      '`env(safe-area-inset-*)` resolves to 0 because no inset source is available. Install `react-native-safe-area-context` and wrap the tree in `<SafeAreaProvider>`, or feed insets with `<SafeAreaInsetsProvider>` from `styled-components/native`.'
    );
  }
  return explicit ?? fromPeer ?? EMPTY_SAFE_AREA_INSETS;
}

export interface SafeAreaInsetsProviderProps {
  children?: React.ReactNode;
  /** The insets `env(safe-area-inset-*)` reads within this subtree. */
  insets: SafeAreaInsets;
}

/**
 * Feed `env(safe-area-inset-*)` explicitly. Wrap a subtree and pass insets
 * from any source; the provided value wins over the ambient
 * `react-native-safe-area-context` read, and works even when that peer is
 * not installed.
 *
 * ```tsx
 * import { SafeAreaInsetsProvider } from 'styled-components/native';
 *
 * // Insets from any source: a custom native module, an SSR / web value,
 * // or test data.
 * const insets = getInsetsFromNativeModule();
 * return <SafeAreaInsetsProvider insets={insets}>{children}</SafeAreaInsetsProvider>;
 * ```
 *
 * Not required when the peer is installed and a `SafeAreaProvider` wraps
 * the tree: that case resolves automatically.
 */
export function SafeAreaInsetsProvider({
  children,
  insets,
}: SafeAreaInsetsProviderProps): React.ReactElement {
  // Memoize by value so a caller passing an inline `insets={{...}}` object
  // does not hand every safe-area descendant a fresh context reference each
  // render, which would miss the slot-14 cache and force a full re-resolve.
  const value = React.useMemo(() => insets, [insets.top, insets.right, insets.bottom, insets.left]);
  return React.createElement(EXPLICIT_INSETS_CONTEXT.Provider, { value }, children);
}

/** Test-only: clear the cached require so mocks can be swapped mid-suite. */
export function resetSafeAreaPeerForTest(): void {
  peerPresent = undefined;
  SafeAreaInsetsContext = undefined;
}
