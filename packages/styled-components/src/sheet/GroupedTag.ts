import { SPLITTER } from '../constants';
import styledError from '../utils/error';
import { GroupedTag, Tag } from './types';

/** Create a GroupedTag with an underlying Tag implementation */
export const makeGroupedTag = (tag: Tag) => {
  return new DefaultGroupedTag(tag);
};

const BASE_SIZE = 1 << 9;

const DefaultGroupedTag = class DefaultGroupedTag implements GroupedTag {
  groupSizes: Uint32Array;
  length: number;
  tag: Tag;

  constructor(tag: Tag) {
    this.groupSizes = new Uint32Array(BASE_SIZE);
    this.length = BASE_SIZE;
    this.tag = tag;
  }

  indexOfGroup(group: number) {
    let index = 0;
    for (let i = 0; i < group; i++) {
      index += this.groupSizes[i];
    }

    return index;
  }

  insertRules(group: number, rules: string | string[]) {
    if (group >= this.groupSizes.length) {
      const oldBuffer = this.groupSizes;
      const oldSize = oldBuffer.length;

      let newSize = oldSize;
      while (group >= newSize) {
        newSize <<= 1;
        if (newSize < 0) {
          throw styledError(16, `${group}`);
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

    if (Array.isArray(rules)) {
      for (let i = 0, l = rules.length; i < l; i++) {
        if (this.tag.insertRule(ruleIndex, rules[i])) {
          this.groupSizes[group]++;
          ruleIndex++;
        }
      }
    } else {
      if (this.tag.insertRule(ruleIndex, rules)) {
        this.groupSizes[group]++;
      }
    }
  }

  clearGroup(group: number) {
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

  getGroup(group: number) {
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
};
