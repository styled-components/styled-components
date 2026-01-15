import { SPLITTER } from '../constants';
import { GroupedTag, Tag } from './types';

export const makeGroupedTag = (tag: Tag): GroupedTag => {
  return new DefaultGroupedTag(tag);
};

interface RuleRange {
  start: number;
  count: number;
}

class DefaultGroupedTag implements GroupedTag {
  tag: Tag;
  private groups: Map<string, RuleRange> = new Map();
  private ids: string[] = [];

  constructor(tag: Tag) {
    this.tag = tag;
  }

  insertRules(id: string, rules: string | string[]): void {
    const rulesArray = typeof rules === 'string' ? [rules] : rules;
    if (rulesArray.length === 0) return;

    let range = this.groups.get(id);
    if (!range) {
      range = { start: this.tag.length, count: 0 };
      this.groups.set(id, range);
      this.ids.push(id);
    }

    const insertionIndex = range.start + range.count;
    let insertedCount = 0;

    for (let i = 0; i < rulesArray.length; i++) {
      if (this.tag.insertRule(insertionIndex + insertedCount, rulesArray[i])) {
        insertedCount++;
      }
    }

    if (insertedCount > 0) {
      range.count += insertedCount;
      this.shiftRangesAfter(id, insertedCount);
    }
  }

  getGroup(id: string): string {
    const range = this.groups.get(id);
    if (!range || range.count === 0) return '';

    let css = '';
    const end = range.start + range.count;
    for (let i = range.start; i < end; i++) {
      css += `${this.tag.getRule(i)}${SPLITTER}`;
    }
    return css;
  }

  clearGroup(id: string): void {
    const range = this.groups.get(id);
    if (!range || range.count === 0) return;

    const deleteCount = range.count;
    for (let i = 0; i < deleteCount; i++) {
      this.tag.deleteRule(range.start);
    }

    this.shiftRangesAfter(id, -deleteCount);
    range.count = 0;
  }

  getIds(): IterableIterator<string> {
    return this.ids[Symbol.iterator]();
  }

  private shiftRangesAfter(afterId: string, delta: number): void {
    let found = false;
    for (let i = 0; i < this.ids.length; i++) {
      if (found) {
        const range = this.groups.get(this.ids[i])!;
        range.start += delta;
      } else if (this.ids[i] === afterId) {
        found = true;
      }
    }
  }
}
