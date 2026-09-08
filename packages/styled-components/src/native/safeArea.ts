/**
 * Optional peer bridge to `react-native-safe-area-context`.
 *
 * `env(safe-area-inset-*)` resolves against these insets at render time.
 * When the peer is absent the empty inset object is returned so resolvers
 * still run (recognized names substitute `0`, matching a rectangular
 * display per CSS Environment Variables §2.1).
 */

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

type UseSafeAreaInsets = () => SafeAreaInsets;

let peerPresent: boolean | undefined;
let useSafeAreaInsetsImpl: UseSafeAreaInsets | undefined;

function loadPeer(): void {
  if (peerPresent !== undefined) return;
  try {
    // Optional peer: absent installs must not break the native entry.
    const mod = require('react-native-safe-area-context') as {
      useSafeAreaInsets: UseSafeAreaInsets;
    };
    useSafeAreaInsetsImpl = mod.useSafeAreaInsets;
    peerPresent = true;
  } catch {
    useSafeAreaInsetsImpl = undefined;
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
 * installed, otherwise the frozen zero insets. The peer-presence branch
 * is fixed for the process lifetime, so the hook call on each side is
 * stable (same pattern as `IS_RSC` / `usesAnchorFunctions` gates).
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  loadPeer();
  const impl = useSafeAreaInsetsImpl;
  // `peerPresent` / `impl` are fixed after the first require attempt for
  // this process, so the hook-vs-empty branch does not change between
  // renders of a given component (same lifetime-constant rule as the
  // `usesSafeAreaInsets` gate at the call site).
  if (peerPresent === true && impl !== undefined) {
    return impl();
  }
  return EMPTY_SAFE_AREA_INSETS;
}

/** Test-only: clear the cached require so mocks can be swapped mid-suite. */
export function resetSafeAreaPeerForTest(): void {
  peerPresent = undefined;
  useSafeAreaInsetsImpl = undefined;
}
