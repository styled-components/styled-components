/**
 * Rollup substitutes every build constant the source reads (`__DEV__`,
 * `__NATIVE__`, `__NATIVE_WEB__`, `__SERVER__`, `__VERSION__`) in packaged
 * builds. Bun run directly on `.ts` sources has no such pass; this side-effect
 * import must be the first import in every profile harness entry file so the
 * globals exist before any source module reads them. Defaults describe the
 * Hermes native build with dev code stripped; a harness profiling another
 * bundle overrides the constant it needs after its imports.
 */
globalThis.__DEV__ = false;
globalThis.__NATIVE__ = true;
globalThis.__NATIVE_WEB__ = false;
globalThis.__SERVER__ = false;
globalThis.__VERSION__ = 'dev';
