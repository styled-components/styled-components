import type { NativeStyles } from '../../models/compileNative';
import { applyResolvers, type ResolveEnv } from '../transform/polyfills/resolvers';
import { flattenResolvedStyle } from './flattenResolvedStyle';

/**
 * First paint (`mergeStarting`): overlay `@starting-style` onto the flat
 * resolved base so the next commit can diff into the settled style while
 * CSS transition longhands are already attached (Reanimated compares
 * consecutive style props on the native side).
 */
export function mergeReanimatedResolvedStyle(
  resolved: unknown,
  compiled: NativeStyles,
  env: ResolveEnv,
  mergeStarting: boolean
): Record<string, unknown> {
  const flat = flattenResolvedStyle(resolved);
  if (!mergeStarting || compiled.startingStyle === undefined) {
    return flat;
  }
  const rs =
    compiled.startingStyleResolvers !== undefined && compiled.startingStyleResolvers.length > 0
      ? (applyResolvers(compiled.startingStyle, compiled.startingStyleResolvers, env) as Record<
          string,
          unknown
        >)
      : (compiled.startingStyle as Record<string, unknown>);
  return { ...flat, ...rs };
}
