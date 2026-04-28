/**
 * Rollup injects `__VERSION__` / `__SERVER__` / `__NATIVE__` in packaged builds.
 * Bun run directly on `.ts` sources has no such pass; this side-effect import
 * must be the first import in harness entry files so `constants.ts` and
 * consumers see the globals.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis;
g.__VERSION__ = 'dev';
g.__SERVER__ = false;
g.__NATIVE__ = true;
