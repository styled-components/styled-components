import { DISABLE_SPEEDY, IS_BROWSER } from '../constants';
import { InsertionTarget } from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import { setToString } from '../utils/setToString';
import { makeGroupedTag } from './GroupedTag';
import { outputSheet, rehydrateSheet } from './Rehydration';
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

export default class StyleSheet implements Sheet {
  gs: GlobalStylesAllocationMap;
  names: NamesAllocationMap;
  options: SheetOptions;
  server: boolean;
  tag?: GroupedTag | undefined;

  static registerId(_id: string): void {}

  constructor(
    options: SheetConstructorArgs = EMPTY_OBJECT as object,
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
    return new StyleSheet(
      { ...this.options, ...options },
      this.gs,
      (withNames && this.names) || undefined
    );
  }

  allocateGSInstance(id: string) {
    return (this.gs[id] = (this.gs[id] || 0) + 1);
  }

  getTag() {
    return this.tag || (this.tag = makeGroupedTag(makeTag(this.options)));
  }

  hasNameForId(id: string, name: string): boolean {
    return this.names.has(id) && (this.names.get(id) as Set<string>).has(name);
  }

  registerName(id: string, name: string) {
    if (!this.names.has(id)) {
      const groupNames = new Set<string>();
      groupNames.add(name);
      this.names.set(id, groupNames);
    } else {
      (this.names.get(id) as Set<string>).add(name);
    }
  }

  insertRules(id: string, name: string, rules: string | string[]) {
    this.registerName(id, name);
    this.getTag().insertRules(id, rules);
  }

  clearNames(id: string) {
    if (this.names.has(id)) {
      (this.names.get(id) as Set<string>).clear();
    }
  }

  clearRules(id: string) {
    this.getTag().clearGroup(id);
    this.clearNames(id);
  }

  clearTag() {
    this.tag = undefined;
  }
}
