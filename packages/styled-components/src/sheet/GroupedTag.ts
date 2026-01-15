import { SPLITTER } from '../constants';
import styledError from '../utils/error';
import { getGroupForId } from './GroupIDAllocator';
import { GroupedTag, Tag } from './types';

export const makeGroupedTag = (tag: Tag): GroupedTag => {
  return new DefaultGroupedTag(tag);
};

const BASE_SIZE = 1 << 9;

class DefaultGroupedTag implements GroupedTag {
  groupSizes: Uint32Array;
  length: number;
  tag: Tag;

  constructor(tag: Tag) {
    this.groupSizes = new Uint32Array(BASE_SIZE);
    this.length = BASE_SIZE;
    this.tag = tag;
  }

  private indexOfGroup(group: number) {
    let index = 0;
    for (let i = 0; i < group; i++) {
      index += this.groupSizes[i];
    }
    return index;
  }

  insertRules(id: string, rules: string | string[]) {
    const rulesArr = typeof rules === 'string' ? [rules] : rules;
    const group = getGroupForId(id);

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

    for (let i = 0, l = rulesArr.length; i < l; i++) {
      if (this.tag.insertRule(ruleIndex, rulesArr[i])) {
        this.groupSizes[group]++;
        ruleIndex++;
      }
    }
  }

  clearGroup(id: string) {
    const group = getGroupForId(id);
    if (group >= this.length) return;

    const length = this.groupSizes[group];
    if (length === 0) return;

    const startIndex = this.indexOfGroup(group);
    this.groupSizes[group] = 0;

    for (let i = 0; i < length; i++) {
      this.tag.deleteRule(startIndex);
    }
  }

  getGroup(id: string) {
    const group = getGroupForId(id);
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

  getIds(): IterableIterator<string> {
    throw new Error('Use getRegisteredIds from GroupIDAllocator');
  }
}
