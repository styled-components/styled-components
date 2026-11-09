import { evaluateForFastPath, FastPathFragment, hasAnyFragment } from '../parser/compile';
import { getSource, synthesizeSourceForRuleSet } from '../parser/source';
import StyleSheet from '../sheet';
import { type Placement, SERVER_PLACEMENT } from '../sheet/Order';
import { Compiler, ExecutionContext, RuleSet } from '../types';
import isStaticRules from '../utils/isStaticRules';
import { flushKeyframes, type CompiledKeyframes } from './Keyframes';

type InstanceEntry = {
  keyframes: CompiledKeyframes[];
  name: string;
  /** Where the id's group sorts on its first insert; every rebuild of the group carries it. */
  placement?: Placement | undefined;
  rules: string[];
};

type InstanceMap = Map<string, InstanceEntry>;

/**
 * Live instance rules keyed by sheet, then component id, then instance. See
 * docs/global-styles.md "Registry".
 */
const registry = new WeakMap<StyleSheet, Map<string, InstanceMap>>();

/** Test-only. Live instances sharing a component id on a sheet; bundles drop it as unused. */
export function liveInstanceCount(styleSheet: StyleSheet, componentId: string): number {
  const instances = registry.get(styleSheet)?.get(componentId);
  return instances === undefined ? 0 : instances.size;
}

export function getInstance(
  styleSheet: StyleSheet,
  componentId: string,
  instance: string
): InstanceEntry | undefined {
  return registry.get(styleSheet)?.get(componentId)?.get(instance);
}

export function deleteInstance(
  styleSheet: StyleSheet,
  componentId: string,
  instance: string
): void {
  const byId = registry.get(styleSheet);
  const instances = byId?.get(componentId);
  if (byId === undefined || instances === undefined) return;

  instances.delete(instance);
  if (instances.size === 0) byId.delete(componentId);
}

/** The sheet's map for an id, created on first use. */
function instancesFor(styleSheet: StyleSheet, componentId: string): InstanceMap {
  let byId = registry.get(styleSheet);
  if (byId === undefined) {
    byId = new Map();
    registry.set(styleSheet, byId);
  }

  let instances = byId.get(componentId);
  if (instances === undefined) {
    instances = new Map();
    byId.set(componentId, instances);
  }
  return instances;
}

/**
 * Clear the id's group on the sheet and re-insert every surviving instance in
 * mount order (docs/global-styles.md "Rebuild order"). Must run
 * synchronously; no yielding between clear and re-insert. Only static entries
 * are named `componentId` (dynamic ones append the instance), and their CSS is
 * identical, so the first one is inserted alone.
 */
function rebuildGroup(
  styleSheet: StyleSheet,
  componentId: string,
  instances: InstanceMap | undefined
): void {
  styleSheet.clearRules(componentId);

  if (instances === undefined) return;

  let staticInserted = false;
  for (const entry of instances.values()) {
    if (entry.name === componentId) {
      if (staticInserted) continue;
      staticInserted = true;
    }

    styleSheet.insertRules(componentId, entry.name, entry.rules, entry.placement);
  }
}

/** Drop one instance's entry and rebuild the id's group from the survivors. */
export function removeInstance(
  styleSheet: StyleSheet,
  componentId: string,
  instance: string
): void {
  deleteInstance(styleSheet, componentId, instance);
  rebuildGroup(styleSheet, componentId, registry.get(styleSheet)?.get(componentId));
}

/** Write an instance's entry to the sheet: its keyframes first, then its rules. */
export function writeInstance(
  styleSheet: StyleSheet,
  componentId: string,
  instance: string,
  entry: InstanceEntry
): void {
  const { placement } = entry;
  const instances = instancesFor(styleSheet, componentId);
  const prev = instances.get(instance);

  // Static globals share identical CSS across mounts, so the registered name
  // is `componentId` alone; dedups multi-mount and decouples rehydration
  // from React's useId format.
  const sharesName = entry.name === componentId;
  const known = sharesName && styleSheet.hasNameForId(componentId, componentId);
  if (known && prev) return;

  // Keyframes take the global tier of the graph that defined them, not the global's definition order.
  flushKeyframes(styleSheet, entry.keyframes, placement?.server ? SERVER_PLACEMENT : undefined);
  instances.set(instance, entry);

  if (sharesName) {
    // A rehydrated or sibling-mounted style only records its entry, so
    // rebuildGroup can restore survivors if another instance unmounts.
    if (!known) styleSheet.insertRules(componentId, entry.name, entry.rules, placement);
    return;
  }

  // A server sheet's first render appends: a rebuild would re-emit siblings' rules a stream
  // already flushed. Its entries live as long as the sheet, so a repeat render can rebuild.
  const appendsToCollection = styleSheet.server && prev === undefined;

  if (appendsToCollection) {
    styleSheet.insertRules(componentId, entry.name, entry.rules, placement);
    return;
  }

  // Skip the rebuild when the CSS is unchanged, on the client only: a server
  // sheet's tag can be cleared (clearTag) while its entries survive.
  if (!styleSheet.server && prev) {
    const a = prev.rules;
    const b = entry.rules;
    let same = a.length === b.length;
    for (let i = 0; same && i < a.length; i++) same = a[i] === b[i];
    if (same) return;
  }

  rebuildGroup(styleSheet, componentId, instances);
}

export default class WebGlobalStyle<Props extends object> {
  componentId: string;
  /** @internal */
  isStatic: boolean;
  rules: RuleSet<Props>;

  constructor(rules: RuleSet<Props>, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules);

    // Synthesize a Source if the rules array predates `css(...)` (synthetic
    // / test fixtures). No-op when source is already attached.
    synthesizeSourceForRuleSet(rules);

    // Registered at definition, so a global's group number follows definition order
    // among globals (every global sits before every component, by tier).
    StyleSheet.registerId(this.componentId);
  }

  removeStyles(instance: string, styleSheet: StyleSheet): void {
    removeInstance(styleSheet, this.componentId, instance);
  }

  /** Write what `computeRules` returned to the sheet. */
  renderStyles(instance: string, entry: InstanceEntry, styleSheet: StyleSheet): void {
    writeInstance(styleSheet, this.componentId, instance, entry);
  }

  /**
   * Run the interpolations and emit the rules, writing nothing, so it is safe during render.
   * @internal
   */
  computeRules(
    instance: string,
    executionContext: ExecutionContext & Props,
    compiler: Compiler
  ): InstanceEntry {
    // Source-driven AST emit: feed the construction-time AST + filled
    // interpolation values directly into `compiler.emit` with an empty
    // parent selector (global styles have no `.componentId` wrapper).
    // No string round-trip: the AST that came out of `parseSource` is the
    // one that goes into `emit-web`.
    let rules: string[] = [];
    let keyframes: CompiledKeyframes[] = [];
    const source = getSource(this.rules);
    if (source !== undefined) {
      const fragments: (FastPathFragment | null)[] = [];
      const referenced: CompiledKeyframes[] = [];
      const filled = evaluateForFastPath(
        source,
        executionContext,
        undefined,
        compiler,
        fragments,
        referenced
      );
      if (filled !== null) {
        keyframes = referenced;
        rules = compiler.emit(source, filled, '', {
          componentId: this.componentId,
          fragments: hasAnyFragment(fragments) ? fragments : null,
        });
      }
    }
    return {
      keyframes,
      name: this.isStatic ? this.componentId : this.componentId + instance,
      rules,
    };
  }
}
