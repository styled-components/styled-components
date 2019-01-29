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
  forEach(fn: (group: number, css: string) => void): void;
  tag: Tag;
}

export interface UniqueGroup {
  constructor(name: string): UniqueGroup;
  name: string;
  index: number;
}

export type GroupedKeys = {
  [group: number]: {
    [key: string]: any
  }
};
