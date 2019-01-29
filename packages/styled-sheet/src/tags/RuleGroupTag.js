// @flow

import type { Tag, GroupedTag } from '../types';
import { makeBuffer, resizeBuffer } from '../buffer';

class RuleGroupTag implements GroupedTag {
  // Keep the size of each rule group in an array
  rulesPerGroup: number[];
  // An approximate end of the rulesPerGroup buffer
  length: number;
  tag: Tag;

  constructor(tag: Tag) {
    this.tag = tag;
    this.rulesPerGroup = makeBuffer();
    this.length = 0;
  }

  // Retrieves the index of the first rule of a group,
  // i.e. the number of rules that come before this group
  indexOfGroup(group: number): number {
    let index = 0;
    for (let i = 0; i < group; i++) {
      index += this.rulesPerGroup[i];
    }
    return index;
  }

  // Appends rules to the end of the specified group's rules and
  // returns the number of rules that have been added
  insertRules(group: number, rules: string[]): number {
    if (group >= this.length) {
      this.length = group + 1;
      resizeBuffer(this.rulesPerGroup, group);
    }

    // Retrieve the index of this group's last rule (by adding 1)
    let index = this.indexOfGroup(group + 1);
    let added = 0;

    for (let i = 0, l = rules.length; i < l; i++) {
      if (this.tag.insertRule(index, rules[i])) {
        added++;
        index++;
      }
    }

    this.rulesPerGroup[group] += added;
    return added;
  }

  // Deletes all rules for the specified group
  clearGroup(group: number): void {
    if (group < this.rulesPerGroup.length) {
      const size = this.rulesPerGroup[group];
      const firstIndex = this.indexOfGroup(group);
      const lastIndex = firstIndex + size - 1;

      for (let i = lastIndex; i >= lastIndex; i--) {
        this.tag.deleteRule(i);
      }

      this.rulesPerGroup[group] = 0;
    }
  }

  // Returns the formatted CSS string of a group
  getGroup(group: number): string {
    const size = this.rulesPerGroup[group];
    if (size === undefined || size === 0) {
      return '';
    }

    const firstIndex = this.indexOfGroup(group);
    const lastIndex = firstIndex + size;

    let css = '';
    for (let i = firstIndex; i < lastIndex; i++) {
      css += `${this.tag.getRule(i)}\n`;
    }

    return css;
  }

  // Calls fn for each group with the group's CSS string if the group is not empty
  forEach(fn: (group: number, css: string) => void): void {
    const { length } = this;
    for (let i = 0; i < length; i++) {
      const css = this.getGroup(i);
      if (css !== '') {
        fn(i, css);
      }
    }
  }
}

export default RuleGroupTag;
