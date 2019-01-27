// @flow

import type { Tag } from './types';

export class VirtualTag implements Tag {
  rules: string[];

  length: number;

  constructor(_target?: HTMLElement) {
    this.rules = [];
    this.length = 0;
  }

  insertRule(index: number, rule: string): boolean {
    if (index < this.length && index >= 0) {
      this.rules.splice(index, 0, rule);
      return true;
    } else {
      return false;
    }
  }

  deleteRule(index: number): void {
    this.rules.splice(index, 1);
  }

  getRule(index: number): string {
    return this.rules[index];
  }
}

export default VirtualTag;
