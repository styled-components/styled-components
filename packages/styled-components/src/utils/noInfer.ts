/**
 * @deprecated Use the built-in `NoInfer` from TypeScript 5.4+ directly.
 *
 * Kept for consumers importing it from `styled-components/dist/types`. It lives
 * in its own module rather than in `types.ts` because a module-local `NoInfer`
 * shadows the TypeScript intrinsic within that module, silently downgrading
 * every reference there to this slower deferred form. `types.ts` re-exports the
 * name, and a re-export introduces no local binding.
 */
export type NoInfer<T> = [T][T extends any ? 0 : never];
