// @flow

export interface Tag {
  constructor(target?: HTMLElement): void;
  insertRule(index: number, rule: string): boolean;
  deleteRule(index: number): void;
  getRule(index: number): string;
  length: number;
}
