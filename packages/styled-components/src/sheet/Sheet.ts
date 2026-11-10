import { IS_BROWSER } from '../constants';
import { InsertionTarget } from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import { makeGroupedTag } from './GroupedTag';
import { groupForId, lookupGroup, registerBase } from './GroupIDAllocator';
import { Order, Placement, keyFor, kindOfId } from './Order';
import {
  adoptServerTags,
  getRehydrationContainer,
  outputSheet,
  rehydrateSheet,
} from './Rehydration';
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
  /** Where each group sits in the output: positions, keys, edges and contested pairs. */
  order: Order;
  /**
   * Turn-scoped compiled rules keyed by `id\\0name`. The first generate for a
   * name compiles and stores here; same-turn siblings reuse the bytes so a
   * discarded claimer cannot leave a committed follower with an empty payload.
   * Dropped on a microtask so a discarded concurrent render cannot pin a name
   * past the turn that claimed it.
   * @internal
   */
  provisionalRules: Map<string, string[]> | null = null;
  server: boolean;
  tag?: GroupedTag | undefined;

  /** True from the first write of a microtask until it ends, so a burst of writes adopts server tags once. */
  private adoptedThisTurn = false;

  /**
   * Register a group ID to give it an index. `baseId` is the component a chain level extends: the
   * sheet places the pair before any other edge touches the level.
   */
  static registerId(id: string, baseId?: string): number {
    if (baseId !== undefined) registerBase(id, baseId);
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
    this.order = this.withTagFollowing(new Order());

    // We rehydrate only once and use the sheet that is created first
    if (!this.server && IS_BROWSER && SHOULD_REHYDRATE) {
      SHOULD_REHYDRATE = false;
      rehydrateSheet(this);

      // Tags that stream in after the bundle runs are adopted when the sheet is next written,
      // and once more when parsing ends.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => adoptServerTags(this), { once: true });
      }
    }
  }

  /**
   * The sheet's CSS. A prototype method rather than an own property:
   * assigning an own `toString` throws when the built-ins are frozen.
   */
  toString(): string {
    return outputSheet(this);
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

    // A browser sheet lays its groups out as its parent does.
    if (!this.server) newSheet.order = newSheet.withTagFollowing(this.order.clone());

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
    return this.tag || (this.tag = makeGroupedTag(makeTag(this.options), this.order));
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

  /**
   * Insert new rules which also marks the name as known. The first insert into a group places it
   * by key: client tier and its group number unless `placement` says it belongs to the server
   * component graph (`server`) with definition order `seq` there. A global or keyframes id takes
   * its graph's global tier.
   */
  insertRules(id: string, name: string, rules: string[], placement?: Placement) {
    if (this.order.rehydrated && !this.server) this.adoptWhileLoading();

    const group = this.registerName(id, name);

    if (!this.order.hasKey(group)) {
      const kind = kindOfId(id);
      this.order.place(group, keyFor(kind, group, placement), kind);
    }

    if (__DEV__) {
      for (let i = 0; i < rules.length; i++) {
        if (rules[i].charCodeAt(0) === 64) this.order.noteLayers(group, rules[i]);
      }
    }

    this.getTag().insertRules(group, rules);
  }

  /** True when the order holds, or refuses, `outerId` after `innerId`: nothing is left to learn. */
  isSettled(outerId: string, innerId: string): boolean {
    const outer = lookupGroup(outerId);
    const inner = lookupGroup(innerId);

    return outer !== undefined && inner !== undefined && this.order.isSettled(outer, inner);
  }

  /** Learn that `outerId` wraps `innerId`: the outer's group moves after the inner's when it sat before it. */
  learn(outerId: string, innerId: string): void {
    this.order.learn(groupForId(outerId), groupForId(innerId));
  }

  /** Clears all cached names for a given group ID */
  clearNames(id: string) {
    const set = this.names.get(id);
    if (set) set.clear();
  }

  /** Clears all rules for a given group ID */
  clearRules(id: string) {
    const group = groupForId(id);

    this.getTag().clearGroup(group);
    this.order.flushed.delete(group);
    this.clearNames(id);
  }

  /**
   * Clears the tag, which deletes its rules but not its names. A server sheet keeps its order and
   * the rules the tag held, so the next flush can re-emit related groups; a browser sheet starts over.
   */
  clearTag() {
    const { order, tag } = this;

    if (this.server) {
      if (tag !== undefined) {
        for (let i = 0; i < order.positions.length; i++) {
          const group = order.positions[i];
          const text = tag.getGroup(group);
          if (text !== '') order.flushed.set(group, (order.flushed.get(group) ?? '') + text);
        }
      }

      order.edgeSeeds.clear();
    } else {
      order.reset();
    }

    // NOTE: This does not clear the names, since it's only used during SSR
    // so that we can continuously output only new rules
    this.tag = undefined;
  }

  /** Points the order's moves at whichever tag the sheet holds when a move happens. */
  private withTagFollowing(order: Order): Order {
    order.listener = {
      afterMove: groups => this.tag?.attachGroups(groups),
      beforeMove: groups => this.tag?.detachGroups(groups),
    };
    return order;
  }

  /** While the document still parses, the first write of each microtask adopts server tags that arrived since. */
  private adoptWhileLoading() {
    if (this.adoptedThisTurn || document.readyState !== 'loading') return;

    this.adoptedThisTurn = true;
    queueMicrotask(() => {
      this.adoptedThisTurn = false;
    });

    adoptServerTags(this);
  }
}
