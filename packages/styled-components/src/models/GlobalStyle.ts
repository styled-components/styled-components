import StyleSheet from '../sheet';
import { ExecutionContext, RuleSet, Stringifier } from '../types';
import flatten from '../utils/flatten';
import isStaticRules from '../utils/isStaticRules';
import { joinStringArray } from '../utils/joinStrings';

type InstanceEntry = { name: string; order: number; rules: string[] };

type InstanceEntries = Map<number, InstanceEntry>;

/** Hands each GlobalStyle its definition position; same-id groups re-insert in this order. */
let nextOrder = 0;

/**
 * Per-instance entries keyed by sheet, then component id, then instance. Same-id
 * globals share one sheet group, so a rebuild re-inserts every survivor on that sheet.
 * See docs/global-styles.md.
 */
const registry = new WeakMap<StyleSheet, Map<string, InstanceEntries>>();

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

/** Array.prototype.sort is stable, so equal orders keep mount order. */
const byOrder = (a: InstanceEntry, b: InstanceEntry) => a.order - b.order;

export default class GlobalStyle<Props extends object> {
  componentId: string;
  isStatic: boolean;
  order: number;
  rules: RuleSet<Props>;

  constructor(rules: RuleSet<Props>, componentId: string) {
    this.rules = rules;
    this.componentId = componentId;
    this.isStatic = isStaticRules(rules);
    this.order = nextOrder++;

    // Pre-register the shared group so global styles defined before
    // components always appear before them in the stylesheet.
    StyleSheet.registerId(this.componentId);
  }

  removeStyles(instance: number, styleSheet: StyleSheet): void {
    deleteInstance(styleSheet, this.componentId, instance);
    this.rebuildGroup(styleSheet, registry.get(styleSheet)?.get(this.componentId));
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

    // Skip the CSSOM rebuild when the CSS is unchanged. Only the client may: the server
    // clears the tag between requests while these entries outlive it.
    const next = this.buildEntry(instance, executionContext, styleSheet, stylis);
    const entries = this.entriesFor(styleSheet);
    const prev = entries.get(instance);
    entries.set(instance, next);

    const appendsToCollection =
      styleSheet.server && !prev && !styleSheet.hasNameForId(id, next.name);

    // A server render deletes its entry right after, so a rebuild would drop every
    // earlier instance's output from a per-request collection: append instead.
    if (appendsToCollection) {
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
    this.rebuildGroup(styleSheet, entries);
  }

  private buildEntry(
    instance: number,
    executionContext: ExecutionContext & Props,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): InstanceEntry {
    const flatCSS = joinStringArray(
      flatten(this.rules as RuleSet<object>, executionContext, styleSheet, stylis) as string[]
    );

    return {
      name: this.componentId + instance,
      order: this.order,
      rules: stylis(flatCSS, ''),
    };
  }

  private computeRules(
    instance: number,
    executionContext: ExecutionContext & Props,
    styleSheet: StyleSheet,
    stylis: Stringifier
  ): InstanceEntry {
    const entry = this.buildEntry(instance, executionContext, styleSheet, stylis);
    this.entriesFor(styleSheet).set(instance, entry);
    return entry;
  }

  /** This id's entries on the sheet, created on first use. */
  private entriesFor(styleSheet: StyleSheet): InstanceEntries {
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
    return entries;
  }

  /**
   * Clear the shared group and re-insert every surviving entry on the sheet, including
   * those of other globals with the same id, in definition then mount order (see
   * docs/global-styles.md). Must run synchronously: nothing may yield between clear and re-insert.
   */
  private rebuildGroup(styleSheet: StyleSheet, entries: InstanceEntries | undefined): void {
    styleSheet.clearRules(this.componentId);

    if (entries === undefined) return;

    const survivors =
      entries.size > 1 ? Array.from(entries.values()).sort(byOrder) : entries.values();

    for (const entry of survivors) {
      styleSheet.insertRules(this.componentId, entry.name, entry.rules);
    }
  }
}
