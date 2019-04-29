// @flow

import { IS_BROWSER } from '../constants';
import { type Tag, makeTag } from './Tag';
import { type GroupedTag, makeGroupedTag } from './GroupedTag';
import { getGroupForID } from './GroupIDAllocator';
import { outputSheet, rehydrateSheet } from './Rehydration';
import { getAttributes } from './dom';

let SHOULD_REHYDRATE = !IS_BROWSER;

/** Contains the main stylesheet logic for stringification and caching */
export interface Sheet {
  tag: Tag;
  groupedTag: GroupedTag;
  names: Map<string, Set<string>>;
  hasNameForID(id: string, name: string): boolean;
  registerID(id: string): void;
  registerName(id: string, name: string): void;
  insertRules(id: string, name: string, rules: string[]): void;
  clearRules(id: string): void;
  clearTag(): void;
  toString(): string;
  toHTML(): string;
}

class DefaultSheet implements Sheet {
  isServer: boolean;
  target: void | HTMLElement;
  tag: Tag;
  groupedTag: GroupedTag;
  names: Map<string, Set<string>>;

  constructor(isServer: boolean, target?: HTMLElement) {
    this.isServer = isServer;
    this.target = target;
    this.tag = makeTag(isServer, target);
    this.groupedTag = makeGroupedTag(this.tag);
    this.names = new Map();

    if (!isServer && SHOULD_REHYDRATE) {
      SHOULD_REHYDRATE = false;
      rehydrateSheet(this);
    }
  }

  hasNameForID(id: string, name: string): boolean {
    return this.names.has(id) && (this.names.get(id): any).has(name);
  }

  registerID(id: string) {
    getGroupForID(id);
    if (!this.names.has(id)) {
      this.names.set(id, new Set());
    }
  }

  registerName(id: string, name: string) {
    this.registerID(id);
    (this.names.get(id): any).add(name);
  }

  insertRules(id: string, name: string, rules: string[]) {
    const group = getGroupForID(id);
    this.registerName(id, name);
    this.groupedTag.insertRules(group, rules);
  }

  clearRules(id: string) {
    const group = getGroupForID(id);
    this.registerID(id);
    this.groupedTag.clearGroup(group);
    (this.names.get(id): any).clear();
  }

  clearTag() {
    this.tag = makeTag(this.isServer, this.target);
    this.groupedTag = makeGroupedTag(this.tag);
  }

  toString(): string {
    return outputSheet(this);
  }

  toHTML(): string {
    const css = this.toString();
    if (css === '') {
      return '';
    } else {
      return `<style ${getAttributes()}>${css}</style>`;
    }
  }
}

export default DefaultSheet;
