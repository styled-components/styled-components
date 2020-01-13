// @flow

/** CSSStyleSheet-like Tag abstraction for CSS rules */
export interface Tag {
  constructor(target?: HTMLElement): void;
  insertRule(index: number, rule: string): boolean;
  deleteRule(index: number): void;
  getRule(index: number): string;
  length: number;
}

/** Group-aware Tag that sorts rules by indices */
export interface GroupedTag {
  constructor(tag: Tag): void;
  insertRules(group: number, rules: string[]): void;
  clearGroup(group: number): void;
  getGroup(group: number): string;
  length: number;
}

export type SheetOptions = {
  isServer: boolean,
  target?: HTMLElement,
  useCSSOMInjection: boolean,
};

export interface Sheet {
  allocateGSInstance(id: string): number;
  clearNames(id: string): void;
  clearRules(id: string): void;
  clearTag(): void;
  getTag(): GroupedTag;
  hasNameForId(id: string, name: string): boolean;
  insertRules(id: string, name: string, rules: string[]): void;
  options: SheetOptions;
  names: Map<string, Set<string>>;
  registerName(id: string, name: string): void;
  toString(): string;
}
