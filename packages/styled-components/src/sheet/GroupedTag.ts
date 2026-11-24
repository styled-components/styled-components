import { SPLITTER } from '../constants';
import styledError from '../utils/error';
import { GROUP_KIND, Order } from './Order';
import { GroupedTag, Tag } from './types';

/** @internal */
export const makeGroupedTag = (tag: Tag, order: Order) => {
  return new DefaultGroupedTag(tag, order);
};

const BASE_SIZE = 1 << 9;

const removeGroup = (groupedTag: DefaultGroupedTag, group: number, collect?: string[]) => {
  const size = groupedTag.groupSizes[group];
  const start = groupedTag.indexOfGroup(group);

  if (collect !== undefined) {
    for (let i = start; i < start + size; i++) collect.push(groupedTag.tag.getRule(i));
  }
  for (let i = 0; i < size; i++) groupedTag.tag.deleteRule(start);

  groupedTag.groupSizes[group] = 0;
};

/** @internal */
class DefaultGroupedTag implements GroupedTag {
  /** @internal */
  groupSizes: Uint32Array;
  length: number;
  /** @internal */
  order: Order;
  tag: Tag;

  // Offset lookup cache: the group last asked about and the index of its first rule (-1: empty).
  /** @internal */
  _cGroup: number;
  /** @internal */
  _cIndex: number;

  /** Rule texts of groups taken out for a move, until `attachGroups` puts them back. @internal */
  private detachedRules: Map<number, string[]> = new Map();

  constructor(tag: Tag, order: Order) {
    this.groupSizes = new Uint32Array(BASE_SIZE);
    this.length = BASE_SIZE;
    this.order = order;
    this.tag = tag;
    this._cGroup = -1;
    this._cIndex = 0;
  }

  /** @internal */
  attachGroups(groups: readonly number[]) {
    this._cGroup = -1;

    for (let i = 0; i < groups.length; i++) {
      const rules = this.detachedRules.get(groups[i]);
      if (rules !== undefined) this.insertRules(groups[i], rules);
    }

    this.detachedRules.clear();
  }

  /** @internal */
  detachGroups(groups: readonly number[]) {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group >= this.length || this.groupSizes[group] === 0) continue;

      const rules: string[] = [];
      removeGroup(this, group, rules);
      this.detachedRules.set(group, rules);
    }
  }

  /** The index of the group's first rule; a group with no place starts after every rule. @internal */
  indexOfGroup(group: number) {
    const { order } = this;
    const target = order.positionOf(group);
    if (target === -1) return this.tag.length;
    if (group === this._cGroup) return this._cIndex;

    const { posList } = order;
    const sizes = this.groupSizes;
    let at = this._cGroup === -1 ? -1 : order.positionOf(this._cGroup);
    let index = this._cIndex;

    if (at === -1) {
      at = 0;
      index = 0;
    }

    if (target > at) {
      for (let i = at; i < target; i++) index += sizes[posList[i]] | 0;
    } else {
      for (let i = at - 1; i >= target; i--) index -= sizes[posList[i]] | 0;
    }

    this._cGroup = group;
    this._cIndex = index;
    return index;
  }

  insertRules(group: number, rules: string[]) {
    if (group >= this.groupSizes.length) {
      const oldBuffer = this.groupSizes;

      let newSize = oldBuffer.length;
      while (group >= newSize) {
        newSize <<= 1;
        if (newSize < 0) {
          throw styledError(16, `${group}`);
        }
      }

      this.groupSizes = new Uint32Array(newSize);
      this.groupSizes.set(oldBuffer);
      this.length = newSize;
    }

    // A group no caller positioned sorts by its number, as the allocator numbered it.
    if (!this.order.hasGroup(group)) {
      this.order.place(group, this.order.keyOf(group), GROUP_KIND.component);
    }

    let ruleIndex = this.indexOfGroup(group) + this.groupSizes[group];

    for (let i = 0, l = rules.length; i < l; i++) {
      if (this.tag.insertRule(ruleIndex, rules[i])) {
        this.groupSizes[group]++;
        ruleIndex++;
      }
    }
  }

  /** @internal */
  clearGroup(group: number) {
    if (group < this.length && this.groupSizes[group] > 0) {
      removeGroup(this, group);
    }
  }

  /** @internal */
  getGroup(group: number) {
    let css = '';
    if (group >= this.length || this.groupSizes[group] === 0) {
      return css;
    }

    const length = this.groupSizes[group];
    const startIndex = this.indexOfGroup(group);
    const endIndex = startIndex + length;

    for (let i = startIndex; i < endIndex; i++) {
      css += this.tag.getRule(i) + SPLITTER;
    }

    return css;
  }
}
