import type StyleSheet from '../sheet';
import { groupForId } from '../sheet/GroupIDAllocator';
import type { Compiler, ExecutionContext } from '../types';
import { recallRscRules } from '../utils/rscCache';
import type { CompiledKeyframes } from './Keyframes';
import type { ScStyleKeyframes, ScStyleLevel } from './ScStyle';
import type { IStyleSheetContext } from './StyleSheetManager';
import type WebStyle from './WebStyle';
import type { GeneratedLevel, GeneratedStyle } from './WebStyle';

/**
 * Server-component styles: the chain one instance's `ScStyle` carries. See docs/react.md "Server
 * component styles".
 */

/**
 * RSC counterpart to `webStyle.flush`. Runs `generate()` to produce the
 * inheritance chain's compiled CSS without writing to a sheet; registers
 * each new class name so repeat renders of the same component/props skip
 * compilation. Returns the generated levels, which `rscChain` turns into props.
 *
 * @internal
 */
export function rscFlush(
  webStyle: WebStyle,
  resolvedAttrs: ExecutionContext,
  styleSheet: StyleSheet,
  compiler: Compiler
): GeneratedStyle {
  const generated = webStyle.generate(resolvedAttrs, styleSheet, compiler);
  for (let i = 0; i < generated.levels.length; i++) {
    const level = generated.levels[i];
    if (level.isNew) styleSheet.registerName(level.componentId, level.name);
  }
  return generated;
}

/**
 * What building one instance's chain needs.
 *
 * @internal
 */
type RscChainOptions = {
  context: ExecutionContext;
  generated: GeneratedStyle;
  ssc: IStyleSheetContext;
  webStyle: WebStyle;
};

/**
 * A level whose name another instance registered first arrives empty; its rules
 * come from the process-wide cache (docs/react.md "Server component styles"). When the cache has
 * evicted them, compiling the chain again refills the cache for every level of it, so later
 * levels recall instead.
 */
function rscLevelRules(options: RscChainOptions, level: GeneratedLevel): string[] {
  if (level.rules.length > 0) return level.rules;

  const { context, ssc, webStyle } = options;
  let owner: WebStyle | null | undefined = webStyle;
  while (owner && owner.componentId !== level.componentId) owner = owner.baseStyle;
  if (!owner) return level.rules;

  const recalled = recallRscRules(owner, level.name);
  if (recalled !== undefined) return recalled;

  const regenerated = webStyle.generate(context, ssc.styleSheet, ssc.compiler, {
    recompile: true,
  }).levels;
  for (let i = 0; i < regenerated.length; i++) {
    if (regenerated[i].componentId === level.componentId && regenerated[i].name === level.name) {
      return regenerated[i].rules;
    }
  }

  return level.rules;
}

/**
 * The levels of an instance's chain that hold rules, base first, as `ScStyle` takes them: each with
 * its component's definition order in this graph.
 *
 * @internal
 */
export function rscChain(options: RscChainOptions): ScStyleLevel[] {
  const { levels } = options.generated;
  const chain: ScStyleLevel[] = [];

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    const rules = rscLevelRules(options, level);
    if (rules.length > 0)
      chain.push([level.componentId, level.name, rules, groupForId(level.componentId)]);
  }

  return chain;
}

/**
 * The keyframes an instance references as `ScStyle` takes them, each name once (a base and its
 * extension can both reference one).
 *
 * @internal
 */
export function rscKeyframes(keyframes: ReadonlyArray<CompiledKeyframes>): ScStyleKeyframes[] {
  const list: ScStyleKeyframes[] = [];

  outer: for (let i = 0; i < keyframes.length; i++) {
    for (let j = 0; j < i; j++) {
      if (keyframes[j].name === keyframes[i].name) continue outer;
    }

    list.push([keyframes[i].id, keyframes[i].name, keyframes[i].rules]);
  }

  return list;
}
