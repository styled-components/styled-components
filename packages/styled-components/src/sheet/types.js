// @flow

import { type Stringifier } from '../utils/stylis';
import { type GroupedTag } from './GroupedTag';

export interface Sheet {
  clearNames(id: string): void;
  clearRules(id: string): void;
  clearTag(): void;
  getTag(): GroupedTag;
  hasNameForId(id: string, name: string): boolean;
  insertRules(id: string, name: string, rules: string[]): void;
  names: Map<string, Set<string>>;
  registerName(id: string, name: string): void;
  stringifier: Stringifier;
  toString(): string;
}
