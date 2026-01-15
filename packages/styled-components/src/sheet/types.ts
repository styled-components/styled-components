import { InsertionTarget } from '../types';

export interface Tag {
  insertRule(index: number, rule: string): boolean;
  deleteRule(index: number): void;
  getRule(index: number): string;
  length: number;
}

export interface GroupedTag {
  insertRules(id: string, rules: string | string[]): void;
  getGroup(id: string): string;
  clearGroup(id: string): void;
  getIds(): IterableIterator<string>;
  groupSizes: Uint32Array;
  length: number;
  tag: Tag;
}

export type SheetOptions = {
  isServer: boolean;
  target?: InsertionTarget | undefined;
  useCSSOMInjection: boolean;
};

export interface Sheet {
  allocateGSInstance(id: string): number;
  clearNames(id: string): void;
  clearRules(id: string): void;
  clearTag(): void;
  getTag(): GroupedTag;
  hasNameForId(id: string, name: string): boolean;
  insertRules(id: string, name: string, rules: string | string[]): void;
  options: SheetOptions;
  names: Map<string, Set<string>>;
  registerName(id: string, name: string): void;
  rehydrate(): void;
  toString(): string;
}
