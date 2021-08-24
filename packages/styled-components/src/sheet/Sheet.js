// @flow
import { DISABLE_SPEEDY, IS_BROWSER } from '../constants';
import { EMPTY_OBJECT } from '../utils/empties';
import { makeGroupedTag } from './GroupedTag';
import { getGroupForId } from './GroupIDAllocator';
import { outputSheet, rehydrateSheet } from './Rehydration';
import { makeTag } from './Tag';
import type { GroupedTag, Sheet, SheetOptions } from './types';

let SHOULD_REHYDRATE = IS_BROWSER;

type SheetConstructorArgs = {
  isServer?: boolean,
  useCSSOMInjection?: boolean,
  target?: HTMLElement,
};

type GlobalStylesAllocationMap = { [key: string]: number };
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

  tag: void | GroupedTag;

  /** Register a group ID to give it an index */
  static registerId(id: string): number {
    return getGroupForId(id);
  }

  constructor(
    options: SheetConstructorArgs = EMPTY_OBJECT,
    globalStyles?: GlobalStylesAllocationMap = {},
    names?: NamesAllocationMap
  ) {
    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.gs = globalStyles;
    this.names = new Map(names);
    this.server = !!options.isServer;

    // We rehydrate only once and use the sheet that is created first
    if (!this.server && IS_BROWSER && SHOULD_REHYDRATE) {
      SHOULD_REHYDRATE = false;
      rehydrateSheet(this);
    }
  }

  reconstructWithOptions(options: SheetConstructorArgs, withNames?: boolean = true) {
    return new StyleSheet(
      { ...this.options, ...options },
      this.gs,
      (withNames && this.names) || undefined
    );
  }

  allocateGSInstance(id: string) {
    return (this.gs[id] = (this.gs[id] || 0) + 1);
  }

  /** Lazily initialises a GroupedTag for when it's actually needed */
  getTag(): GroupedTag {
    return this.tag || (this.tag = makeGroupedTag(makeTag(this.options)));
  }

  /** Check whether a name is known for caching */
  hasNameForId(id: string, name: string): boolean {
    return this.names.has(id) && (this.names.get(id): any).has(name);
  }

  /** Mark a group's name as known for caching */
  registerName(id: string, name: string) {
    getGroupForId(id);

    if (!this.names.has(id)) {
      const groupNames = new Set();
      groupNames.add(name);
      this.names.set(id, groupNames);
    } else {
      (this.names.get(id): any).add(name);
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
      (this.names.get(id): any).clear();
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

  /** Outputs the current sheet as a CSS string with markers for SSR */
  toString(): string {
    return outputSheet(this);
  }
}
