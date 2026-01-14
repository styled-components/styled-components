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

  private indexOfGroupCache: Uint32Array;
  private cacheValidUpTo: number;

  constructor(tag: Tag) {
    this.groupSizes = new Uint32Array(BASE_SIZE);
    this.length = BASE_SIZE;
    this.tag = tag;

    this.indexOfGroupCache = new Uint32Array(BASE_SIZE + 1);
    this.cacheValidUpTo = BASE_SIZE;
  }

  indexOfGroup(group: number) {
    if (group <= this.cacheValidUpTo) {
      return this.indexOfGroupCache[group];
    }

    let index = this.indexOfGroupCache[this.cacheValidUpTo];
    for (let i = this.cacheValidUpTo; i < group; i++) {
      index += this.groupSizes[i];
      this.indexOfGroupCache[i + 1] = index;
    }
    this.cacheValidUpTo = group;

    return index;
  }

  insertRules(group: number, rules: string[]) {
    if (group >= this.groupSizes.length) {
      const oldBuffer = this.groupSizes;
      const oldCacheBuffer = this.indexOfGroupCache;
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
      this.indexOfGroupCache = new Uint32Array(newSize + 1);
      this.indexOfGroupCache.set(oldCacheBuffer);
      this.length = newSize;

      for (let i = oldSize; i < newSize; i++) {
        this.groupSizes[i] = 0;
      }
    }

    let ruleIndex = this.indexOfGroup(group + 1);

    let insertedCount = 0;
    for (let i = 0, l = rules.length; i < l; i++) {
      if (this.tag.insertRule(ruleIndex, rules[i])) {
        this.groupSizes[group]++;
        ruleIndex++;
        insertedCount++;
      }
    }

    if (insertedCount > 0) {
      if (group < this.cacheValidUpTo) {
        this.cacheValidUpTo = group;
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

      if (length > 0 && group < this.cacheValidUpTo) {
        this.cacheValidUpTo = group;
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
