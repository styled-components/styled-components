import { DISABLE_SPEEDY, IS_BROWSER } from '../constants';
import { InsertionTarget } from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import { setToString } from '../utils/setToString';
import { makeGroupedTag } from './GroupedTag';
import { getGroupForId } from './GroupIDAllocator';
import { getRehydrationContainer, outputSheet, rehydrateSheet } from './Rehydration';
import { makeTag } from './Tag';
import { GroupedTag, Sheet, SheetOptions } from './types';

let SHOULD_REHYDRATE = IS_BROWSER;

type SheetConstructorArgs = {
  isServer?: boolean;
  useCSSOMInjection?: boolean;
  target?: InsertionTarget | undefined;
};

type GlobalStylesAllocationMap = {
  [key: string]: number;
};
type NamesAllocationMap = Map<string, Set<string>>;

const defaultOptions: SheetOptions = {
  isServer: !IS_BROWSER,
  useCSSOMInjection: !DISABLE_SPEEDY,
};

/** Contains the main stylesheet logic for stringification and caching */
export default class StyleSheet implements Sheet {
  gs: GlobalStylesAllocationMap;
  names: NamesAllocationMap;
  options: SheetOptions;
  server: boolean;
  tag?: GroupedTag | undefined;

  /** Register a group ID to give it an index */
  static registerId(id: string): number {
    return getGroupForId(id);
  }

  constructor(
    options: SheetConstructorArgs = EMPTY_OBJECT as Object,
    globalStyles: GlobalStylesAllocationMap = {},
    names?: NamesAllocationMap | undefined
  ) {
    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.gs = globalStyles;
    this.names = new Map(names as NamesAllocationMap);
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
      this.gs,
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

  allocateGSInstance(id: string) {
    return (this.gs[id] = (this.gs[id] || 0) + 1);
  }

  /** Lazily initialises a GroupedTag for when it's actually needed */
  getTag() {
    return this.tag || (this.tag = makeGroupedTag(makeTag(this.options)));
  }

  /** Check whether a name is known for caching */
  hasNameForId(id: string, name: string): boolean {
    return this.names.get(id)?.has(name) ?? false;
  }

  /** Mark a group's name as known for caching */
  registerName(id: string, name: string) {
    getGroupForId(id);

    const existing = this.names.get(id);
    if (existing) {
      existing.add(name);
    } else {
      this.names.set(id, new Set([name]));
    }
  }

  /** Insert new rules which also marks the name as known */
  insertRules(id: string, name: string, rules: string[]) {
    this.registerName(id, name);
    this.getTag().insertRules(getGroupForId(id), rules);
  }

  /** Clears all cached names for a given group ID */
  clearNames(id: string) {
    if (this.names.has(id)) {
      (this.names.get(id) as any).clear();
    }
  }

  /** Clears all rules for a given group ID */
  clearRules(id: string) {
    this.getTag().clearGroup(getGroupForId(id));
    this.clearNames(id);
  }

  /** Clears the entire tag which deletes all rules but not its names */
  clearTag() {
    // NOTE: This does not clear the names, since it's only used during SSR
    // so that we can continuously output only new rules
    this.tag = undefined;
  }
}
