/**
 * Optional peer bridge to `react-native-safe-area-context`.
 *
 * `env(safe-area-inset-*)` resolves against these insets at render time.
 * When the peer is absent, or the tree is outside `<SafeAreaProvider>`,
 * the empty inset object is returned so resolvers still run (recognized
 * names substitute `0`, matching a rectangular display per CSS
 * Environment Variables §2.1). The peer's `useSafeAreaInsets()` throws
 * without a provider; we read `SafeAreaInsetsContext` instead so missing
 * providers stay a silent zero rather than a render crash.
 */

import React from 'react';

export type SafeAreaInsets = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export const EMPTY_SAFE_AREA_INSETS: SafeAreaInsets = Object.freeze({
  bottom: 0,
  left: 0,
  right: 0,
  top: 0,
});

type InsetsContext = React.Context<SafeAreaInsets | null>;

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

/** True when `react-native-safe-area-context` resolved at load time. */
export function hasSafeAreaContextPeer(): boolean {
  loadPeer();
  return peerPresent === true;
}

/**
 * Hook that returns live safe-area insets when the optional peer is
 * installed and a provider is present, otherwise the frozen zero insets.
 * Always calls `useContext` (fallback context when the peer is absent) so
 * the hook sequence stays stable across peer-present and peer-absent
 * bundles.
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  loadPeer();
  const insets = React.useContext(SafeAreaInsetsContext ?? FALLBACK_INSETS_CONTEXT);
  return insets ?? EMPTY_SAFE_AREA_INSETS;
}

/** Test-only: clear the cached require so mocks can be swapped mid-suite. */
export function resetSafeAreaPeerForTest(): void {
  peerPresent = undefined;
  SafeAreaInsetsContext = undefined;
}
