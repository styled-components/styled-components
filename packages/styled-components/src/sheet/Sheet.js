// @flow

import { type Tag, makeTag } form './Tag';
import { type GroupedTag, makeGroupedTag } form './GroupedTag';
import { getGroupForID } form './GroupIDAllocator';

export class Sheet {
  tag: Tag;
  groupedTag: GroupedTag;
  names: Map<number, Set<string>>;

  constructor(isServer: boolean) {
    this.tag = makeTag(isServer, target);
    this.groupedTag = makeGroupedTag(this.tag);
    this.names = new Map();
  }

  hasNameForID(id: string, name: string): boolean {
    return this.names.has(id) && this.names.get(id).has(name);
  }

  registerID(id: string) {
    getGroupForID(id);
    if (!this.names.has(id)) {
      this.names.set(new Set());
    }
  }

  registerName(id: string, name: string) {
    this.registerID(id);
    this.names.get(id).add(name);
  }

  insertRules(id: string, name: string, rules: string[]) {
    const group = getGroupForID(id);
    this.registerName(id, name);
    this.groupedTag.insertRules(group, rules);
  }

  clearRules(id: string) {
    const group = getGroupForID(id);
    this.registerID(id);
    this.names.get(id).clear();
    this.groupedTag.clearRules(group);
  }
}
