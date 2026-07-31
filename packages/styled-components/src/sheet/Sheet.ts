import { IS_BROWSER } from '../constants';
import { InsertionTarget } from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import { setToString } from '../utils/setToString';
import { makeGroupedTag } from './GroupedTag';
import { groupForId } from './GroupIDAllocator';
import { getRehydrationContainer, outputSheet, rehydrateSheet } from './Rehydration';
import { makeTag } from './Tag';
import { GroupedTag, Sheet, SheetOptions } from './types';

let SHOULD_REHYDRATE = IS_BROWSER;

/** Placeholder until the claim winner stashes compiled rules. */
const EMPTY_PROVISIONAL: string[] = [];

type SheetConstructorArgs = {
  isServer?: boolean;
  nonce?: string | undefined;
  target?: InsertionTarget | undefined;
};

type NamesAllocationMap = Map<string, Set<string>>;

const defaultOptions: SheetOptions = {
  isServer: !IS_BROWSER,
};

/** Contains the main stylesheet logic for stringification and caching */
export default class StyleSheet implements Sheet {
  names: NamesAllocationMap;
  options: SheetOptions;
  /**
   * Turn-scoped compiled rules keyed by `id\\0name`. The first generate for a
   * name compiles and stores here; same-turn siblings reuse the bytes so a
   * discarded claimer cannot leave a committed follower with an empty payload.
   * Dropped on a microtask so a discarded concurrent render cannot pin a name
   * past the turn that claimed it.
   */
  provisionalRules: Map<string, string[]> | null = null;
  server: boolean;
  tag?: GroupedTag | undefined;

  /** Register a group ID to give it an index */
  static registerId(id: string): number {
    return groupForId(id);
  }

  constructor(
    options: SheetConstructorArgs = EMPTY_OBJECT,
    names?: NamesAllocationMap | undefined
  ) {
    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.names = new Map(names);
    this.server = !!options.isServer;

    // We rehydrate only once and use the sheet that is created first
    if (!this.server && IS_BROWSER && SHOULD_REHYDRATE) {
      SHOULD_REHYDRATE = false;
      rehydrateSheet(this);
    }

    setToString(this, () => outputSheet(this));
  }

  rehydrate(): void {
    if (!this.server && IS_BROWSER) {
      rehydrateSheet(this);
    }
  }

  reconstructWithOptions(options: SheetConstructorArgs, withNames = true) {
    const newSheet = new StyleSheet(
      { ...this.options, ...options },
      (withNames && this.names) || undefined
    );

    // If we're reconstructing with a new target on the client, check if the container changed
    // This handles the case where StyleSheetManager's target prop changes (e.g., from undefined to shadowRoot)
    // We only rehydrate if the container (Document or ShadowRoot) actually changes
    if (!this.server && IS_BROWSER && options.target !== this.options.target) {
      const oldContainer = getRehydrationContainer(this.options.target);
      const newContainer = getRehydrationContainer(options.target);

      if (oldContainer !== newContainer) {
        rehydrateSheet(newSheet);
      }
    }

    return newSheet;
  }

  /** Lazily initialises a GroupedTag for when it's actually needed */
  getTag() {
    return this.tag || (this.tag = makeGroupedTag(makeTag(this.options)));
  }

  /** Check whether a name is permanently registered, meaning its rules have already been emitted for this sheet. */
  hasNameForId(id: string, name: string): boolean {
    return this.names.get(id)?.has(name) ?? false;
  }

  /**
   * Claim a name for this JS turn so later generates skip recompilation.
   * Returns true if this call is the first claim (caller should compile and
   * then {@link stashProvisionalRules}). Does not permanently register;
   * inject / registerName still required.
   *
   * Server sheets skip the provisional store: sync flush registers on inject
   * in the same call stack, so turn-scoped bookkeeping would only allocate.
   */
  claimNameForId(id: string, name: string): boolean {
    if (this.hasNameForId(id, name)) return false;
    if (this.server) return true;
    const key = id + '\0' + name;
    let map = this.provisionalRules;
    if (map === null) {
      map = new Map();
      this.provisionalRules = map;
      queueMicrotask(() => {
        this.provisionalRules = null;
      });
    } else if (map.has(key)) {
      return false;
    }
    map.set(key, EMPTY_PROVISIONAL);
    return true;
  }

  /** Store compiled rules for same-turn followers after a successful claim. */
  stashProvisionalRules(id: string, name: string, rules: string[]): void {
    const map = this.provisionalRules;
    if (map === null) return;
    map.set(id + '\0' + name, rules);
  }

  /** Rules stashed by the turn's claim winner, if any. */
  getProvisionalRules(id: string, name: string): string[] | undefined {
    const rules = this.provisionalRules?.get(id + '\0' + name);
    return rules === undefined || rules === EMPTY_PROVISIONAL ? undefined : rules;
  }

  /** Mark a group's name as known for caching; returns the group id. */
  registerName(id: string, name: string): number {
    const group = groupForId(id);

    const existing = this.names.get(id);
    if (existing) {
      existing.add(name);
    } else {
      this.names.set(id, new Set([name]));
    }

    return group;
  }

  /** Insert new rules which also marks the name as known */
  insertRules(id: string, name: string, rules: string[]) {
    const group = this.registerName(id, name);
    this.getTag().insertRules(group, rules);
  }

  /** Clears all cached names for a given group ID */
  clearNames(id: string) {
    const set = this.names.get(id);
    if (set) set.clear();
  }

  /** Clears all rules for a given group ID */
  clearRules(id: string) {
    this.getTag().clearGroup(groupForId(id));
    this.clearNames(id);
  }

  /** Clears the entire tag which deletes all rules but not its names */
  clearTag() {
    // NOTE: This does not clear the names, since it's only used during SSR
    // so that we can continuously output only new rules
    this.tag = undefined;
  }
}
