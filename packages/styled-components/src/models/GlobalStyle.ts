import StyleSheet from '../sheet';
import { ExecutionContext, RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import isStaticRules from '../utils/isStaticRules';
import { joinStringArray } from '../utils/joinStrings';

type InstanceEntry = { name: string; rules: string[] };

/**
 * Per-instance rules keyed by sheet, then component id. Global styles whose rules
 * differ only in their functions serialize identically, so they share one id and
 * one sheet group; a rebuild must re-insert every survivor on that sheet, not only
 * its own object's. Keyed by sheet because each sheet owns its own tag and counts
 * instances from 1. An id's map is deleted with its last instance.
 */
const registry = new WeakMap<StyleSheet, Map<string, Map<number, InstanceEntry>>>();

/** Test-only. Live instances sharing a component id on a sheet; bundles drop it as unused. */
export function liveInstanceCount(styleSheet: StyleSheet, componentId: string): number {
  const entries = registry.get(styleSheet)?.get(componentId);
  return entries === undefined ? 0 : entries.size;
}

export function getInstance(
  styleSheet: StyleSheet,
  componentId: string,
  instance: number
): InstanceEntry | undefined {
  return registry.get(styleSheet)?.get(componentId)?.get(instance);
}

export function deleteInstance(
  styleSheet: StyleSheet,
  componentId: string,
  instance: number
): void {
  const ids = registry.get(styleSheet);
  const entries = ids?.get(componentId);
  if (ids === undefined || entries === undefined) return;

  entries.delete(instance);
  if (entries.size === 0) ids.delete(componentId);
}

export default class GlobalStyle<Props extends object> {
  componentId: string;
  isStatic: boolean;
  rules: RuleSet<Props>;

  constructor(rules: RuleSet<Props>, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules);

    // Pre-register the shared group so global styles defined before
    // components always appear before them in the stylesheet.
    StyleSheet.registerId(this.componentId);
  }

  removeStyles(instance: number, styleSheet: StyleSheet): void {
    deleteInstance(styleSheet, this.componentId, instance);
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
      } else if (getInstance(styleSheet, id, instance) === undefined) {
        // Rehydrated style: populate cache so rebuildGroup can restore
        // survivors if another instance unmounts.
        this.computeRules(instance, executionContext, styleSheet, stylis);
      }
      return;
    }

    // Compute new rules; skip CSSOM rebuild if CSS is unchanged.
    // The fast-path is only safe on the client where the tag persists between renders.
    // During SSR, clearTag() destroys the tag between requests, so we must always rebuild.
    const prev = getInstance(styleSheet, id, instance);
    const next = this.computeRules(instance, executionContext, styleSheet, stylis);

    // A server render deletes its entry right after, so a rebuild would drop
    // every earlier instance's output: append instead.
    if (styleSheet.server && !prev) {
      styleSheet.insertRules(id, next.name, next.rules);
      return;
    }

    if (!styleSheet.server && prev) {
      const a = prev.rules;
      const b = next.rules;
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
    let ids = registry.get(styleSheet);
    if (ids === undefined) {
      ids = new Map();
      registry.set(styleSheet, ids);
    }

    let entries = ids.get(this.componentId);
    if (entries === undefined) {
      entries = new Map();
      ids.set(this.componentId, entries);
    }
    entries.set(instance, entry);
    return entry;
  }

  /**
   * Clear all CSS rules in the shared group and re-insert from every surviving
   * instance on this sheet, including those of other global styles with the same id.
   * Must run synchronously - no yielding between clear and re-insert.
   */
  private rebuildGroup(styleSheet: StyleSheet): void {
    const id = this.componentId;
    styleSheet.clearRules(id);

    const entries = registry.get(styleSheet)?.get(id);
    if (entries === undefined) return;

    for (const entry of entries.values()) {
      styleSheet.insertRules(id, entry.name, entry.rules);
    }
  }
}
