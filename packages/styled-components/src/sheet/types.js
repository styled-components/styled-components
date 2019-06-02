// @flow

import { type Stringifier } from '../utils/stylis';
import { type GroupedTag } from './GroupedTag';

export type SheetOptions = {
  isServer: boolean,
  stringifier: Stringifier,
  target?: HTMLElement,
  useCSSOMInjection: boolean,
};

export interface Sheet {
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
