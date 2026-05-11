/**
 * Build-time constant; `true` in the React Native bundle, `false` in
 * every other build (browser / server / standalone / plugins / RSC).
 * Rollup's `replace` plugin substitutes the literal so V8 / terser
 * dead-code-eliminate the branch we don't want.
 */
declare var __NATIVE__: boolean;

/**
 * Build-time constant; `true` only in the React Native browser bundle
 * (rn-web; emitted at `native/dist/styled-components.native.browser.*`).
 * `false` everywhere else, including the Hermes-targeted native bundle.
 */
declare var __NATIVE_WEB__: boolean;
