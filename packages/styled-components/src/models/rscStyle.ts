import type StyleSheet from '../sheet';
import { groupForId } from '../sheet/GroupIDAllocator';
import type { Compiler, ExecutionContext } from '../types';
import type { CompiledKeyframes } from './Keyframes';
import type { ScStyleKeyframes, ScStyleLevel } from './ScStyle';
import type WebStyle from './WebStyle';
import type { GeneratedStyle } from './WebStyle';

const EMPTY_RULES: string[] = [];

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
  generated: GeneratedStyle;
  webStyle: WebStyle;
};

/**
 * The levels of an instance's chain up to the last level with rules, base first, as `ScStyle` takes
 * them: each with its component's definition order in this graph. Empty preceding or intermediate
 * levels stay in the chain so the sheet records every inheritance pin even when an empty level
 * gains rules in a later flush.
 *
 * @internal
 */
export function rscChain(options: RscChainOptions): ScStyleLevel[] {
  const { levels } = options.generated;
  const styles: WebStyle[] = [];
  for (
    let cursor: WebStyle | null | undefined = options.webStyle;
    cursor;
    cursor = cursor.baseStyle
  ) {
    styles.push(cursor);
  }
  styles.reverse();

  const chain: ScStyleLevel[] = [];
  let levelIndex = 0;
  let lastNonEmpty = -1;

  for (let i = 0; i < styles.length; i++) {
    const id = styles[i].componentId;
    const level =
      levelIndex < levels.length && levels[levelIndex].componentId === id
        ? levels[levelIndex++]
        : undefined;
    const rules = level !== undefined ? (level.emit ? level.emit() : level.rules) : EMPTY_RULES;
    const hasRules = rules.length > 0;
    if (hasRules) lastNonEmpty = i;
    chain.push([id, hasRules && level !== undefined ? level.name : '', rules, groupForId(id)]);
  }

  if (lastNonEmpty === -1) return [];
  if (lastNonEmpty + 1 < chain.length) chain.length = lastNonEmpty + 1;

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
