// @flow
/* eslint-disable no-use-before-define */

import type { Tag } from './types';

const getOffset = (prev: void | WindowedTag): number => {
  let offset = 0;
  for (let x = prev; x !== undefined; x = x.prev) {
    offset += x.length;
  }

  return offset;
};

export class WindowedTag implements Tag {
  prev: void | WindowedTag;

  tag: Tag;

  length: number;

  constructor(tag: Tag) {
    this.tag = tag;
    this.length = 0;

    if ((tag: any).window !== undefined) {
      this.prev = (tag: any).window;
    }

    // eslint-disable-next-line no-param-reassign
    (tag: any).window = this;
  }

  insertRule(index: number, rule: string): boolean {
    const offset = getOffset(this.prev);
    if (this.tag.insertRule(offset + index, rule)) {
      this.length++;
      return true;
    } else {
      return false;
    }
  }

  deleteRule(index: number): void {
    const offset = getOffset(this.prev);
    this.tag.deleteRule(offset + index);
    this.length--;
  }

  getRule(index: number): string {
    const offset = getOffset(this.prev);
    return this.tag.getRule(index + offset);
  }
}
