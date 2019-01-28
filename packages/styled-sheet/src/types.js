// @flow

export interface Tag {
  constructor(target?: HTMLElement): void;
  insertRule(index: number, rule: string): boolean;
  deleteRule(index: number): void;
  getRule(index: number): string;
  length: number;
}

export interface GroupedTag {
  constructor(tag: Tag): void;
  insertRules(group: number, rules: string[]): number;
  clearGroup(group: number): void;
  getGroup(group: number): string;
  maxGroup: number;
  tag: Tag;
}
