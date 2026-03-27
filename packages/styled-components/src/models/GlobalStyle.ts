import StyleSheet from '../sheet';
import { ExecutionContext, RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import isStaticRules from '../utils/isStaticRules';
import { joinStringArray } from '../utils/joinStrings';

type InstanceEntry = { name: string; rules: string[] };

export default class GlobalStyle<Props extends object> {
  componentId: string;
  isStatic: boolean;
  rules: RuleSet<Props>;

  /** @internal Per-instance rule cache for shared-group rebuild. */
  instanceRules: Map<number, InstanceEntry> = new Map();

  constructor(rules: RuleSet<Props>, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules);

    // Pre-register the shared group so global styles defined before
    // components always appear before them in the stylesheet.
    StyleSheet.registerId(this.componentId);
  }

  removeStyles(instance: number, styleSheet: StyleSheet): void {
    this.instanceRules.delete(instance);
    this.rebuildGroup(styleSheet);
  }

  renderStyles(
    instance: number,
    executionContext: ExecutionContext & Props,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): void {
    const id = this.componentId;

    if (this.isStatic) {
      if (!styleSheet.hasNameForId(id, id + instance)) {
        const entry = this.computeRules(instance, executionContext, styleSheet, stylis);
        styleSheet.insertRules(id, entry.name, entry.rules);
      } else if (!this.instanceRules.has(instance)) {
        // Rehydrated style: populate cache so rebuildGroup can restore
        // survivors if another instance unmounts.
        this.computeRules(instance, executionContext, styleSheet, stylis);
      }
      return;
    }

    // Compute new rules; skip CSSOM rebuild if CSS is unchanged.
    // The fast-path is only safe on the client where the tag persists between renders.
    // During SSR, clearTag() destroys the tag between requests, so we must always rebuild.
    const prev = this.instanceRules.get(instance);
    this.computeRules(instance, executionContext, styleSheet, stylis);
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
    instance: number,
    executionContext: ExecutionContext & Props,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): InstanceEntry {
    const flatCSS = joinStringArray(
      flatten(this.rules as RuleSet<object>, executionContext, styleSheet, stylis) as string[]
    );
    const entry: InstanceEntry = {
      name: this.componentId + instance,
      rules: stylis(flatCSS, ''),
    };
    this.instanceRules.set(instance, entry);
    return entry;
  }

  /**
   * Clear all CSS rules in the shared group and re-insert from surviving instances.
   * Must run synchronously — no yielding between clear and re-insert.
   */
  private rebuildGroup(styleSheet: StyleSheet): void {
    const id = this.componentId;
    styleSheet.clearRules(id);
    for (const entry of this.instanceRules.values()) {
      styleSheet.insertRules(id, entry.name, entry.rules);
    }
  }
}
