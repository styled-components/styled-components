/**
 * Compile-only gate: every value export of the native entry
 * (`styled-components/native` on Hermes) must also be a value export of the
 * rn-web bridge, or an omniplatform app importing it crashes on web. Checked by
 *
 *   pnpm --filter styled-components test:types
 *
 * A name that is deliberately native-only is listed in `NATIVE_ONLY_EXPORTS`
 * with the reason. The runtime list in `web-bridge.test.tsx` checks the built
 * resolution; this file checks the source surfaces.
 */
import type * as NativeEntry from '../native';
import type * as WebBridge from '../native/web-bridge';

/** Native value exports with no rn-web counterpart, each with its reason. */
type NativeOnlyExports = never;

type MissingFromBridge = Exclude<
  keyof typeof NativeEntry,
  keyof typeof WebBridge | NativeOnlyExports
>;

/** Resolves to `true` only when no native value export is missing from the bridge. */
type AssertBridgeCoversNativeEntry = [MissingFromBridge] extends [never]
  ? true
  : { missingFromBridge: MissingFromBridge };

export const bridgeCoversNativeEntry: AssertBridgeCoversNativeEntry = true;
