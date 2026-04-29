import { evaluateForFastPath, FastPathFragment } from '../parser/compile';
import { getSource, synthesizeSourceForRuleSet } from '../parser/source';
import StyleSheet from '../sheet';
import { Compiler, ExecutionContext, RuleSet } from '../types';
import isStaticRules from '../utils/isStaticRules';

type InstanceEntry = { name: string; rules: string[] };

export default class GlobalStyle<Props extends object> {
  componentId: string;
  isStatic: boolean;
  rules: RuleSet<Props>;

  /** @internal Per-instance rule cache for shared-group rebuild. */
  instanceRules: Map<string, InstanceEntry> = new Map();

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
    this.instanceRules.delete(instance);
    this.rebuildGroup(styleSheet);
  }

  renderStyles(
    instance: string,
    executionContext: ExecutionContext & Props,
    styleSheet: StyleSheet,
    compiler: Compiler
  ): void {
    const id = this.componentId;

    if (this.isStatic) {
      // Static globals share identical CSS across mounts, so the registered name
      // is `componentId` alone; dedups multi-mount and decouples rehydration
      // from React's useId format.
      if (!styleSheet.hasNameForId(id, id)) {
        const entry = this.computeRules(instance, executionContext, styleSheet, compiler);
        styleSheet.insertRules(id, entry.name, entry.rules);
      } else if (!this.instanceRules.has(instance)) {
        // Rehydrated or sibling-mounted style: populate cache so rebuildGroup
        // can restore survivors if another instance unmounts.
        this.computeRules(instance, executionContext, styleSheet, compiler);
      }
      return;
    }

    // Compute new rules; skip CSSOM rebuild if CSS is unchanged.
    // The fast-path is only safe on the client where the tag persists between renders.
    // During SSR, clearTag() destroys the tag between requests, so we must always rebuild.
    const prev = this.instanceRules.get(instance);
    this.computeRules(instance, executionContext, styleSheet, compiler);
    if (!styleSheet.server && prev) {
      const a = prev.rules;
      const b = this.instanceRules.get(instance)!.rules;
      if (a.length === b.length) {
        let same = true;
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) {
            same = false;
            break;
          }
        }
        if (same) return;
      }
    }
    this.rebuildGroup(styleSheet);
  }

  private computeRules(
    instance: string,
    executionContext: ExecutionContext & Props,
    styleSheet: StyleSheet,
    compiler: Compiler
  ): InstanceEntry {
    // Source-driven AST emit: feed the construction-time AST + filled
    // interpolation values directly into `compiler.emit` with an empty
    // parent selector (global styles have no `.componentId` wrapper).
    // No string round-trip: the AST that came out of `parseSource` is the
    // one that goes into `emit-web`.
    let rules: string[] = [];
    const source = getSource(this.rules);
    if (source !== undefined) {
      const fragments: (FastPathFragment | null)[] = [];
      const filled = evaluateForFastPath(
        source,
        executionContext,
        undefined,
        styleSheet,
        compiler,
        fragments
      );
      if (filled !== null) {
        let hasFragments = false;
        for (let i = 0; i < fragments.length; i++) {
          if (fragments[i] !== null) {
            hasFragments = true;
            break;
          }
        }
        const out = compiler.emit(
          source,
          filled,
          '',
          this.componentId,
          hasFragments ? fragments : null
        );
        if (out !== null) rules = out;
      }
    }
    const entry: InstanceEntry = {
      name: this.isStatic ? this.componentId : this.componentId + instance,
      rules,
    };
    this.instanceRules.set(instance, entry);
    return entry;
  }

  /**
   * Clear all CSS rules in the shared group and re-insert from surviving instances.
   * Must run synchronously; no yielding between clear and re-insert.
   * Static globals: all instances share identical CSS, emit once.
   */
  private rebuildGroup(styleSheet: StyleSheet): void {
    const id = this.componentId;
    styleSheet.clearRules(id);
    if (this.isStatic) {
      const first = this.instanceRules.values().next().value;
      if (first) {
        styleSheet.insertRules(id, first.name, first.rules);
      }
      return;
    }
    for (const entry of this.instanceRules.values()) {
      styleSheet.insertRules(id, entry.name, entry.rules);
    }
  }
}
