import { SPLITTER } from '../constants';
import styledError from '../utils/error';
import { GROUP_KIND, Order } from './Order';
import { GroupedTag, Tag } from './types';

export const makeGroupedTag = (tag: Tag, order: Order) => {
  return new DefaultGroupedTag(tag, order);
};

const BASE_SIZE = 1 << 9;

class DefaultGroupedTag implements GroupedTag {
  /** @internal */
  groupSizes: Uint32Array;
  length: number;
  order: Order;
  tag: Tag;

  // Offset lookup cache: the group last asked about and the index of its first rule (-1: empty).
  /** @internal */
  _cGroup: number;
  /** @internal */
  _cIndex: number;

  /** Rule texts of groups taken out for a move, until `attachGroups` puts them back. */
  private detached: Map<number, string[]> = new Map();

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
      const rules = this.detached.get(groups[i]);
      if (rules !== undefined) this.insertRules(groups[i], rules);
    }

    this.detached.clear();
    this._cGroup = -1;
  }

  /** @internal */
  detachGroups(groups: readonly number[]) {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      if (group >= this.length || this.groupSizes[group] === 0) continue;

      const size = this.groupSizes[group];
      const start = this.indexOfGroup(group);
      const rules: string[] = [];

      for (let j = start; j < start + size; j++) rules.push(this.tag.getRule(j));
      for (let j = 0; j < size; j++) this.tag.deleteRule(start);

      this.groupSizes[group] = 0;
      this.detached.set(group, rules);
      this._cGroup = -1;
    }
  }

  /** The index of the group's first rule; a group with no place starts after every rule. @internal */
  indexOfGroup(group: number) {
    const { order } = this;
    const target = order.positionOf(group);
    if (target === -1) return this.tag.length;
    if (group === this._cGroup) return this._cIndex;

    const { positions } = order;
    const sizes = this.groupSizes;
    let at = this._cGroup === -1 ? -1 : order.positionOf(this._cGroup);
    let index = this._cIndex;

    if (at === -1) {
      at = 0;
      index = 0;
    }

    if (target > at) {
      for (let i = at; i < target; i++) index += sizes[positions[i]] | 0;
    } else {
      for (let i = at - 1; i >= target; i--) index -= sizes[positions[i]] | 0;
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
    if (!this.order.has(group)) {
      this.order.place(group, this.order.keyOf(group), GROUP_KIND.component);
    }

    let ruleIndex = this.indexOfGroup(group) + this.groupSizes[group];
    let insertedCount = 0;

    for (let i = 0, l = rules.length; i < l; i++) {
      if (this.tag.insertRule(ruleIndex, rules[i])) {
        this.groupSizes[group]++;
        ruleIndex++;
        insertedCount++;
      }
    }

    if (insertedCount > 0 && this._cGroup !== -1) {
      if (this.order.positionOf(this._cGroup) > this.order.positionOf(group)) {
        this._cIndex += insertedCount;
      }
    }
  }

  /** @internal */
  clearGroup(group: number) {
    if (group < this.length && this.order.has(group)) {
      const length = this.groupSizes[group];
      const startIndex = this.indexOfGroup(group);
      const endIndex = startIndex + length;

      this.groupSizes[group] = 0;

      for (let i = startIndex; i < endIndex; i++) {
        this.tag.deleteRule(startIndex);
      }

      if (length > 0 && this._cGroup !== -1) {
        if (this.order.positionOf(this._cGroup) > this.order.positionOf(group)) {
          this._cIndex -= length;
        }
      }
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
