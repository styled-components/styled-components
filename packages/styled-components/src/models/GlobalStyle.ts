import StyleSheet from '../sheet';
import { ExecutionContext, RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import isStatelessFunction from '../utils/isStatelessFunction';
import isStaticRules from '../utils/isStaticRules';
import { joinStringArray } from '../utils/joinStrings';

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
    stylis: Stringifier
  ): void {
    const id = this.componentId;

    if (this.isStatic) {
      // Static globals share identical CSS across mounts, so the registered name
      // is `componentId` alone — dedups multi-mount and decouples rehydration
      // from React's useId format.
      if (!styleSheet.hasNameForId(id, id)) {
        const entry = this.computeRules(instance, executionContext, styleSheet, stylis);
        styleSheet.insertRules(id, entry.name, entry.rules);
      } else if (!this.instanceRules.has(instance)) {
        // Rehydrated or sibling-mounted style: populate cache so rebuildGroup
        // can restore survivors if another instance unmounts.
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
    instance: string,
    executionContext: ExecutionContext & Props,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): InstanceEntry {
    let flatCSS = '';
    for (let i = 0; i < this.rules.length; i++) {
      const partRule = this.rules[i];
      if (typeof partRule === 'string') {
        flatCSS += partRule;
      } else if (partRule) {
        if (isStatelessFunction(partRule)) {
          const fnResult = (partRule as (ctx: ExecutionContext & Props) => unknown)(
            executionContext
          );
          if (typeof fnResult === 'string') {
            flatCSS += fnResult;
          } else if (fnResult !== undefined && fnResult !== null && fnResult !== false) {
            flatCSS += joinStringArray(
              flatten(fnResult as any, executionContext, styleSheet, stylis) as string[]
            );
          }
        } else {
          flatCSS += joinStringArray(
            flatten(partRule as any, executionContext, styleSheet, stylis) as string[]
          );
        }
      }
    }
    const entry: InstanceEntry = {
      name: this.isStatic ? this.componentId : this.componentId + instance,
      rules: stylis(flatCSS, ''),
    };
    this.instanceRules.set(instance, entry);
    return entry;
  }

  /**
   * Clear all CSS rules in the shared group and re-insert from surviving instances.
   * Must run synchronously — no yielding between clear and re-insert.
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
