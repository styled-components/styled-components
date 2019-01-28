// @flow

import type { Tag } from '../types';

export class VirtualTag implements Tag {
  rules: string[];

  length: number;

  constructor(_target?: HTMLElement) {
    this.rules = [];
    this.length = 0;
  }

  insertRule(index: number, rule: string): boolean {
    if (index < 0 || (index >= this.length && this.length !== 0)) {
      return false;
    } else {
      this.rules.splice(index, 0, rule);
      return true;
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
