/**
 * Build-time constant — `true` in the React Native bundle, `false` in
 * every other build (browser / server / standalone / plugins / RSC).
 * Rollup's `replace` plugin substitutes the literal so V8 / terser
 * dead-code-eliminate the branch we don't want.
 */
declare var __NATIVE__: boolean;
