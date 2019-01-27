// @flow

export interface Tag {
  constructor(target?: HTMLElement): void;
  insertRule(index: number, rule: string): boolean;
  deleteRule(index: number): void;
  length: number;
}
