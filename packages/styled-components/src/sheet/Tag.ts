import { InsertionTarget } from '../types';
import { getSheet, makeStyleTag } from './dom';
import { SheetOptions, Tag } from './types';

declare const __SERVER__: boolean;

/** Create a CSSStyleSheet-like tag depending on the environment.
 *
 * Browser builds always use CSSOM injection (`sheet.insertRule`); it's the
 * fastest path on every modern browser, and tools that need the CSS as
 * text should call `extractCSS()` rather than fall back to text-mode
 * injection at runtime. Server builds use a virtual tag that just collects
 * rule strings for later serialization. */
export const makeTag = ({ isServer, target, nonce }: SheetOptions) => {
  if (__SERVER__ && isServer) {
    return new VirtualTag(target);
  }
  return new CSSOMTag(target, nonce);
};

export const CSSOMTag = class CSSOMTag implements Tag {
  element: HTMLStyleElement;

  sheet: CSSStyleSheet;

  length: number;

  constructor(target?: InsertionTarget | undefined, nonce?: string | undefined) {
    this.element = makeStyleTag(target, nonce);

    // Avoid Edge bug where empty style elements don't create sheets
    this.element.appendChild(document.createTextNode(''));

    this.sheet = getSheet(this.element);
    this.length = 0;
  }

  insertRule(index: number, rule: string): boolean {
    try {
      this.sheet.insertRule(rule, index);
      this.length++;
      return true;
    } catch (_error) {
      return false;
    }
  }

  deleteRule(index: number): void {
    this.sheet.deleteRule(index);
    this.length--;
  }

  getRule(index: number): string {
    const rule = this.sheet.cssRules[index];

    // Avoid IE11 quirk where cssText is inaccessible on some invalid rules
    if (rule && rule.cssText) {
      return rule.cssText;
    } else {
      return '';
    }
  }
};

/** A completely virtual (server-side) Tag that doesn't manipulate the DOM */
export const VirtualTag = class VirtualTag implements Tag {
  rules: string[];

  length: number;

  constructor(_target?: InsertionTarget | undefined) {
    this.rules = [];
    this.length = 0;
  }

  insertRule(index: number, rule: string) {
    if (index <= this.length) {
      if (index === this.length) {
        this.rules.push(rule);
      } else {
        this.rules.splice(index, 0, rule);
      }
      this.length++;
      return true;
    } else {
      return false;
    }
  }

  deleteRule(index: number) {
    this.rules.splice(index, 1);
    this.length--;
  }

  getRule(index: number) {
    if (index < this.length) {
      return this.rules[index];
    } else {
      return '';
    }
  }
};
