import type StyleSheet from '../sheet';
import type { Compiler, ExecutionContext } from '../types';
import { isIdentChar } from '../utils/charCodes';
import generateComponentId from '../utils/generateComponentId';
import { joinKeyframes, joinRules, stripSplitter } from '../utils/joinStrings';
import { groupForId } from '../sheet/GroupIDAllocator';
import { recallRscRules } from '../utils/rscCache';
import type { RscLevel, RscRequestState } from '../utils/rscCache';
import type { IStyleSheetContext } from './StyleSheetManager';
import type WebStyle from './WebStyle';
import type { GeneratedLevel, GeneratedStyle } from './WebStyle';

/**
 * Server-component style emission: the CSS one instance's `<style>` tag holds
 * and the class its element carries. See docs/react.md "RSC style emission and
 * Suspense" and "Order-proof extensions and wrappers".
 */

/**
 * Where an element's own levels sort among the wrappers' levels of the same
 * group: after every wrapper, as the stylesheet would list them.
 */
const OWN_LEVEL_ORDER = Number.MAX_SAFE_INTEGER;

/**
 * Swaps every `.name` class selector in `css` for `.chain`. The swap writes only
 * a class name, so no token (url, string, bracket) can open or close around it.
 * A scan instead of a `RegExp`: each fresh name would build one, and an
 * extension with many dynamic variants meets a fresh name per variant.
 *
 * @internal
 */
export function retarget(css: string, name: string, chain: string): string {
  const selector = '.' + name;
  let at = css.indexOf(selector);
  if (at === -1) return css;

  let out = '';
  let from = 0;

  while (at !== -1) {
    const end = at + selector.length;

    if (isIdentChar(css.charCodeAt(end))) {
      at = css.indexOf(selector, end);
      continue;
    }

    out += css.slice(from, at) + '.' + chain;
    from = end;
    at = css.indexOf(selector, end);
  }

  return out + css.slice(from);
}

/**
 * RSC counterpart to `webStyle.flush`. Runs `generate()` to produce the
 * inheritance chain's compiled CSS without writing to the tag; registers
 * each new class name so repeat renders of the same component/props skip
 * compilation. Returns the generated levels, consumed by the inline <style>
 * emission.
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

/** The last extension chain named, so a repeat render of it skips the hash. A one-entry memo costs no allocation or map lookup, and a miss costs two stores. */
let lastChainClass = '';
let lastChainName = '';

/**
 * The class an RSC element carries for its styles: its one generated class, or
 * for an extension a hash of the whole chain, so no base class is on the
 * element for a later plain instance's tag to match.
 *
 * @internal
 */
export function rscChainName(generated: GeneratedStyle): string {
  const { className } = generated;
  if (generated.levels.length < 2) return className;
  if (className === lastChainClass) return lastChainName;

  lastChainClass = className;
  lastChainName = generateComponentId(className);

  return lastChainName;
}

/**
 * What building one styled element's CSS needs.
 *
 * @internal
 */
export type RscChainOptions = {
  /** The element's styles class before it folds wrapper levels in. */
  chain: string;
  context: ExecutionContext;
  generated: GeneratedStyle;
  ssc: IStyleSheetContext;
  webStyle: WebStyle;
};

/**
 * A level whose name another instance registered first arrives empty; its rules
 * come from the process-wide cache (docs/react.md "RSC style emission and
 * Suspense"). When the cache has evicted them, compiling the chain again
 * refills the cache for every level of it, so later levels recall instead.
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

/** The non-empty levels of an instance's chain, base first, with their rules joined. */
function rscLevels(options: RscChainOptions, order: number): RscLevel[] {
  const { generated } = options;
  const levels: RscLevel[] = [];

  for (let i = 0; i < generated.levels.length; i++) {
    const level = generated.levels[i];
    const rules = rscLevelRules(options, level);
    if (rules.length === 0) continue;

    levels.push({
      css: joinRules(rules),
      group: groupForId(level.componentId),
      name: level.name,
      order,
    });
  }

  return levels;
}

/**
 * Records a wrapper's element class and levels on the request, for the styled
 * elements that receive the class to fold in. The first record of a class stays.
 *
 * @internal
 */
export function recordRscWrapper(options: RscChainOptions, state: RscRequestState): void {
  const { chain } = options;
  const wrappers = state.wrappers ?? new Map<string, RscLevel[]>();
  if (wrappers.has(chain)) return;

  const levels = rscLevels(options, wrappers.size);
  if (levels.length > 0) {
    wrappers.set(chain, levels);
    state.wrappers = wrappers;
    state.absorbed = new Map();
  }
}

/**
 * The wrapper classes an element's incoming classes name.
 *
 * @internal
 */
export type RscAbsorbed = {
  /** The folded class for each element chain it has been asked for. */
  folded: Map<string, string>;
  /** The recorded levels of every wrapper class, in class order. */
  levels: RscLevel[];
  /** The wrapper classes, each led by a space (`' w1 w2'`), so they append to a chain name to hash. */
  names: string;
  /** The incoming classes that are not wrapper classes, space-joined. */
  rest: string;
};

/**
 * Finds the recorded wrapper classes among `className`'s classes; null when it holds none.
 *
 * @internal
 */
export function absorbRscWrappers(
  wrappers: ReadonlyMap<string, RscLevel[]>,
  className: string
): RscAbsorbed | null {
  const classes = className.split(' ');
  let levels: RscLevel[] | null = null;
  let names = '';
  let rest = '';

  for (let i = 0; i < classes.length; i++) {
    const name = classes[i];
    const recorded = wrappers.get(name);

    if (recorded !== undefined) {
      if (levels === null) levels = [];
      for (let j = 0; j < recorded.length; j++) levels.push(recorded[j]);
      names += ' ' + name;
    } else if (name !== '') {
      rest = rest === '' ? name : rest + ' ' + name;
    }
  }

  if (levels === null) return null;

  return { folded: new Map(), levels, names, rest };
}

/** `absorbRscWrappers` for the request's recorded wrappers, remembered per class list until a wrapper is recorded. */
export function rscAbsorbed(state: RscRequestState, className: string): RscAbsorbed | null {
  const { absorbed: seen, wrappers } = state;
  if (wrappers === null || seen === null) return null;

  const known = seen.get(className);
  if (known !== undefined) return known;

  const absorbed = absorbRscWrappers(wrappers, className);
  seen.set(className, absorbed);

  return absorbed;
}

/** The class an element carries once it folds wrapper levels into its own `chain` class. */
export function rscFoldedName(chain: string, absorbed: RscAbsorbed): string {
  let name = absorbed.folded.get(chain);
  if (name === undefined) {
    name = generateComponentId(chain + absorbed.names);
    absorbed.folded.set(chain, name);
  }

  return name;
}

/**
 * The CSS of an element that folds wrapper levels into its own: referenced
 * keyframes, then its own levels and the wrappers' sorted by definition order
 * (variants of one component by render order, the element's own last, as the
 * stylesheet would list them), each name once, retargeted onto the folded class.
 *
 * @internal
 */
export function buildRscFoldedCss(options: RscChainOptions, absorbed: RscAbsorbed): string {
  const levels = rscLevels(options, OWN_LEVEL_ORDER)
    .concat(absorbed.levels)
    .sort((a, b) => a.group - b.group || a.order - b.order);
  const seen = new Set<string>();
  let css = '';

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (seen.has(level.name)) continue;

    seen.add(level.name);
    css += retarget(level.css, level.name, options.chain);
  }

  return stripSplitter(joinKeyframes(options.generated.keyframes) + css);
}

/**
 * The CSS one RSC instance emits: referenced keyframes, then each level of its
 * chain, base first, retargeted onto the element's `chain` class. A wrapper
 * passes its `recorded` levels, so the rules are not joined a second time.
 *
 * @internal
 */
export function buildRscStyleCss(options: RscChainOptions, recorded?: RscLevel[]): string {
  const { chain, generated } = options;
  const retargets = generated.levels.length > 1;
  let css = '';

  if (recorded !== undefined) {
    for (let i = 0; i < recorded.length; i++) {
      const level = recorded[i];
      css += retargets ? retarget(level.css, level.name, chain) : level.css;
    }

    return stripSplitter(joinKeyframes(generated.keyframes) + css);
  }

  for (let i = 0; i < generated.levels.length; i++) {
    const level = generated.levels[i];
    const rules = rscLevelRules(options, level);
    if (rules.length === 0) continue;

    const levelCss = joinRules(rules);
    css += retargets ? retarget(levelCss, level.name, chain) : levelCss;
  }

  return stripSplitter(joinKeyframes(generated.keyframes) + css);
}
