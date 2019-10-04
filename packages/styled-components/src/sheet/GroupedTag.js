// @flow
/* eslint-disable no-use-before-define */

import type { GroupedTag, Tag } from './types';

const BASE_SIZE = 1 << 8;

export class DefaultGroupedTag implements GroupedTag {
  groupSizes: Uint32Array;

  groups: number;

  tag: Tag;

  constructor(tag: Tag) {
    this.groupSizes = new Uint32Array(BASE_SIZE);
    this.groups = BASE_SIZE;
    this.tag = tag;
  }

  indexOfGroup(group: number): number {
    let index = 0;
    for (let i = 0; i < group; i++) {
      index += this.groupSizes[i];
    }

    return index;
  }

  insertRules(group: number, rules: string[]): void {
    if (group >= this.groupSizes.length) {
      const oldBuffer = this.groupSizes;
      const oldSize = oldBuffer.length;
      const newSize = BASE_SIZE << ((group / BASE_SIZE) | 0);

      this.groupSizes = new Uint32Array(newSize);
      this.groupSizes.set(oldBuffer);
      this.groups = newSize;

      for (let i = oldSize; i < newSize; i++) {
        this.groupSizes[i] = 0;
      }
    }

    const startIndex = this.indexOfGroup(group + 1);
    for (let i = 0, l = rules.length; i < l; i++) {
      if (this.tag.insertRule(startIndex + i, rules[i])) {
        this.groupSizes[group]++;
      }
    }
  }

  clearGroup(group: number): void {
    if (group < this.groups) {
      const numRules = this.groupSizes[group];
      const startIndex = this.indexOfGroup(group);
      const endIndex = startIndex + numRules;

      this.groupSizes[group] = 0;

      for (let i = startIndex; i < endIndex; i++) {
        this.tag.deleteRule(startIndex);
      }
    }
  }

  getGroup(group: number): string {
    let css = '';
    if (group >= this.groups || this.groupSizes[group] === 0) {
      return css;
    }

    const numRules = this.groupSizes[group];
    const startIndex = this.indexOfGroup(group);
    const endIndex = startIndex + numRules;

    for (let i = startIndex; i < endIndex; i++) {
      css += `${this.tag.getRule(i)}\n`;
    }

    return css;
  }
}
