// @flow

import { type GroupedTag } from './GroupedTag';

export interface Sheet {
  names: Map<string, Set<string>>;
  getTag(): GroupedTag;
  hasNameForId(id: string, name: string): boolean;
  registerName(id: string, name: string): void;
  insertRules(id: string, name: string, rules: string[]): void;
  clearNames(id: string): void;
  clearRules(id: string): void;
  clearTag(): void;
  toString(): string;
}
