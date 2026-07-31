import { InsertionTarget } from '../types';

/** CSSStyleSheet-like Tag abstraction for CSS rules */
export interface Tag {
  insertRule(index: number, rule: string): boolean;
  deleteRule(index: number): void;
  getRule(index: number): string;
  length: number;
}

/** Group-aware Tag that sorts rules by indices */
export interface GroupedTag {
  clearGroup(group: number): void;
  getGroup(group: number): string;
  groupSizes: Uint32Array;
  insertRules(group: number, rules: string[]): void;
  length: number;
  tag: Tag;
}

export type SheetOptions = {
  isServer: boolean;
  nonce?: string | undefined;
  target?: InsertionTarget | undefined;
};

export interface Sheet {
  claimNameForId(id: string, name: string): boolean;
  clearNames(id: string): void;
  clearRules(id: string): void;
  clearTag(): void;
  getProvisionalRules(id: string, name: string): string[] | undefined;
  getTag(): GroupedTag;
  hasNameForId(id: string, name: string): boolean;
  insertRules(id: string, name: string, rules: string[]): void;
  names: Map<string, Set<string>>;
  options: SheetOptions;
  registerName(id: string, name: string): number;
  rehydrate(): void;
  stashProvisionalRules(id: string, name: string, rules: string[]): void;
  toString(): string;
}
