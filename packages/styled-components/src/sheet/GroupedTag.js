// @flow

import { type Tag, makeTag } from './Tag';

/** Group-aware Tag that sorts rules by indices */
export interface GroupedTag {
  constructor(tag: Tag): void;
  insertRules(group: number, rules: string[]): void;
  clearGroup(group: number): void;
  getGroup(group: number): string;
  length: number;
}

/** Create a GroupedTag with an underlying Tag implementation */
export const makeGroupedTag = (
  isServer: boolean,
  target?: HTMLElement
): GroupedTag => {
  const tag = makeTag(isServer, target);
  return new DefaultGroupedTag(tag);
};

const BASE_SIZE = 1 << 8;

class DefaultGroupedTag implements GroupedTag {
  groupSizes: Uint32Array;
  length: number;
  tag: Tag;

  constructor(tag: Tag) {
    this.groupSizes = new Uint32Array(BASE_SIZE);
    this.length = BASE_SIZE;
    this.tag = tag;
  }

  indexOfGroup(group: number): number {
    let index = 0;
    for (let i = 0; i < group; i++) {
      index += this.groupSizes[i];
    }

    return index;
  }

  insertRules(group: number, rules: string[]): number {
    if (group >= this.groupSizes.length) {
      const oldBuffer = this.groupSizes;
      const oldSize = oldBuffer.length;
      const newSize = ((group / BASE_SIZE | 0) + 1)

      this.groupSizes = new Uint32Array(newSize);
      this.groupSizes.set(oldBuffer);
      this.length = newSize;

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
    if (group < this.length) {
      const length = this.groupSizes[group];
      const startIndex = this.indexOfGroup(group);
      const endIndex = firstIndex + length;

      this.groupSizes[group] = 0;

      for (let i = startIndex; i < endIndex; i++) {
        this.tag.deleteRule(startIndex);
      }
    }
  }

  getGroup(group: number): string {
    let css = '';
    if (group < this.length || this.groupSizes[group] === 0) {
      return css;
    }

    const length = this.groupSizes[group];
    const startIndex = this.indexOfGroup(group);
    const endIndex = firstIndex + length;

    for (let i = startIndex; i < endIndex; i++) {
      css += `${this.tag.getRule(i)}\n`;
    }

    return css;
  }
}
