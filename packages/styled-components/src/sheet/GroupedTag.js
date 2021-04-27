// @flow
/* eslint-disable no-use-before-define */

import type { GroupedTag, SheetOptions, Tag } from './types';
import { makeTag } from './Tag';
import { SPLITTER } from '../constants';
import throwStyledError from '../utils/error';

/** Create a GroupedTag with an underlying Tag implementation */
export const makeGroupedTag = (options: SheetOptions): GroupedTag => {
  if (options.useMultipleStyles) {
    return new MultipleSheetsGroupedTag(options);
  } else {
    return new DefaultGroupedTag(options);
  }
};

const BASE_SIZE = 1 << 9;

class DefaultGroupedTag implements GroupedTag {
  groupSizes: Uint32Array;

  length: number;

  tag: Tag;

  constructor(options: SheetOptions) {
    this.groupSizes = new Uint32Array(BASE_SIZE);
    this.length = BASE_SIZE;
    this.tag = makeTag(options);
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

      let newSize = oldSize;
      while (group >= newSize) {
        newSize <<= 1;
        if (newSize < 0) {
          throwStyledError(16, `${group}`);
        }
      }

      this.groupSizes = new Uint32Array(newSize);
      this.groupSizes.set(oldBuffer);
      this.length = newSize;

      for (let i = oldSize; i < newSize; i++) {
        this.groupSizes[i] = 0;
      }
    }

    let ruleIndex = this.indexOfGroup(group + 1);
    for (let i = 0, l = rules.length; i < l; i++) {
      if (this.tag.insertRule(ruleIndex, rules[i])) {
        this.groupSizes[group]++;
        ruleIndex++;
      }
    }
  }

  clearGroup(group: number): void {
    if (group < this.length) {
      const length = this.groupSizes[group];
      const startIndex = this.indexOfGroup(group);
      const endIndex = startIndex + length;

      this.groupSizes[group] = 0;

      for (let i = startIndex; i < endIndex; i++) {
        this.tag.deleteRule(startIndex);
      }
    }
  }

  getGroup(group: number): string {
    let css = '';
    if (group >= this.length || this.groupSizes[group] === 0) {
      return css;
    }

    const length = this.groupSizes[group];
    const startIndex = this.indexOfGroup(group);
    const endIndex = startIndex + length;

    for (let i = startIndex; i < endIndex; i++) {
      css += `${this.tag.getRule(i)}${SPLITTER}`;
    }

    return css;
  }
}

class MultipleSheetsGroupedTag implements GroupedTag {
  tags: Map<number, Tag>;
  length: number;
  options: SheetOptions;

  constructor(options: SheetOptions) {
    this.options = options;
    this.tags = new Map();
    this.length = 0;
  }

  insertRules(group: number, rules: string[]): void {
    let tag = this.tags.get(group);

    if (!tag) {
      tag = makeTag(this.options);
      this.tags.set(group, tag);
      this.length = this.tags.size;
    }

    let ruleIndex = 0;
    for (let i = 0, l = rules.length; i < l; i++) {
      if (tag.insertRule(ruleIndex, rules[i])) {
        ruleIndex++;
      }
    }
  }

  clearGroup(group: number): void {
    const tag = this.tags.get(group);
    if (tag) {
      tag.destroy();
    }
    this.tags.delete(group);
  }

  getGroup(group: number): string {
    let css = '';
    const tag = this.tags.get(group);
    if (!tag) return css;

    for (let i = 0; i < tag.length; i++) {
      css += `${tag.getRule(i)}${SPLITTER}`;
    }

    return css;
  }
}
