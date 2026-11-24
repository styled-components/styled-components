import { InsertionTarget } from '../types';
import type { Order, Placement } from './Order';

/** CSSStyleSheet-like Tag abstraction for CSS rules */
export interface Tag {
  deleteRule(index: number): void;
  getRule(index: number): string;
  insertRule(index: number, rule: string): boolean;
  length: number;
}

/** Group-aware Tag that lays rules out in the order's position order */
export interface GroupedTag {
  /** @internal */
  attachGroups(groups: readonly number[]): void;
  /** @internal */
  clearGroup(group: number): void;
  /** @internal */
  detachGroups(groups: readonly number[]): void;
  /** @internal */
  getGroup(group: number): string;
  /** @internal */
  groupSizes: Uint32Array;
  insertRules(group: number, rules: string[]): void;
  length: number;
  /** @internal */
  order: Order;
  tag: Tag;
}

export type SheetOptions = {
  isServer: boolean;
  nonce?: string | undefined;
  target?: InsertionTarget | undefined;
};

export interface Sheet {
  /** @internal */
  claimNameForId(id: string, name: string): boolean;
  clearNames(id: string): void;
  clearRules(id: string): void;
  clearTag(): void;
  /** @internal */
  getProvisionalRules(id: string, name: string): string[] | undefined;
  getTag(): GroupedTag;
  hasNameForId(id: string, name: string): boolean;
  insertRules(id: string, name: string, rules: string[], placement?: Placement): void;
  /** True when the order already holds, or refuses, `outerId` after `innerId`, so there is nothing to learn. @internal */
  isSettled(outerId: string, innerId: string): boolean;
  /** Learn that `outerId` wraps `innerId`: places the outer after the inner in the sheet's output. @internal */
  learn(outerId: string, innerId: string): void;
  names: Map<string, Set<string>>;
  options: SheetOptions;
  /** @internal */
  order: Order;
  registerName(id: string, name: string): number;
  rehydrate(): void;
  /** @internal */
  stashProvisionalRules(id: string, name: string, rules: string[]): void;
  toString(): string;
}
