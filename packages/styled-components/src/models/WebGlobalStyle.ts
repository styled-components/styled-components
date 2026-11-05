import { evaluateForFastPath, FastPathFragment, hasAnyFragment } from '../parser/compile';
import { getSource, synthesizeSourceForRuleSet } from '../parser/source';
import StyleSheet from '../sheet';
import { Compiler, ExecutionContext, RuleSet } from '../types';
import isStaticRules from '../utils/isStaticRules';
import { flushKeyframes, type CompiledKeyframes } from './Keyframes';

type InstanceEntry = { keyframes: CompiledKeyframes[]; name: string; rules: string[] };

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

    // Pre-register the shared group so global styles defined before
    // components always appear before them in the stylesheet.
    StyleSheet.registerId(this.componentId);
  }

  removeStyles(instance: string, styleSheet: StyleSheet): void {
    deleteInstance(styleSheet, this.componentId, instance);
    this.rebuildGroup(styleSheet, registry.get(styleSheet)?.get(this.componentId));
  }

  /** Write what `computeRules` returned to the sheet. */
  renderStyles(instance: string, entry: InstanceEntry, styleSheet: StyleSheet): void {
    const id = this.componentId;
    const instances = instancesFor(styleSheet, id);
    const prev = instances.get(instance);

    // Static globals share identical CSS across mounts, so the registered name
    // is `componentId` alone; dedups multi-mount and decouples rehydration
    // from React's useId format.
    const known = this.isStatic && styleSheet.hasNameForId(id, id);
    if (known && prev) return;

    // Keyframes sort ahead of the global rules in the sheet (group IDs were
    // claimed at construction time).
    flushKeyframes(styleSheet, entry.keyframes);
    instances.set(instance, entry);

    if (this.isStatic) {
      // A rehydrated or sibling-mounted style only records its entry, so
      // rebuildGroup can restore survivors if another instance unmounts.
      if (!known) styleSheet.insertRules(id, entry.name, entry.rules);
      return;
    }

    // A server sheet's first render appends: a rebuild would re-emit siblings' rules a stream
    // already flushed. Its entries live as long as the sheet, so a repeat render can rebuild.
    const appendsToCollection = styleSheet.server && prev === undefined;

    if (appendsToCollection) {
      styleSheet.insertRules(id, entry.name, entry.rules);
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

    this.rebuildGroup(styleSheet, instances);
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
        rules = compiler.emit(
          source,
          filled,
          '',
          this.componentId,
          hasAnyFragment(fragments) ? fragments : null
        );
      }
    }
    return {
      keyframes,
      name: this.isStatic ? this.componentId : this.componentId + instance,
      rules,
    };
  }

  /**
   * Clear the id's group on the sheet and re-insert every surviving instance in
   * mount order (docs/global-styles.md "Rebuild order"). Must run
   * synchronously; no yielding between clear and re-insert. Only static entries
   * are named `componentId` (dynamic ones append the instance), and their CSS is
   * identical, so the first one is inserted alone.
   * @internal
   */
  private rebuildGroup(styleSheet: StyleSheet, instances: InstanceMap | undefined): void {
    const id = this.componentId;
    styleSheet.clearRules(id);

    if (instances === undefined) return;

    let staticInserted = false;
    for (const entry of instances.values()) {
      if (entry.name === id) {
        if (staticInserted) continue;
        staticInserted = true;
      }

      styleSheet.insertRules(id, entry.name, entry.rules);
    }
  }
}
