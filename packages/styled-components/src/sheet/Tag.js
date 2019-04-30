// @flow

import { DISABLE_SPEEDY, IS_BROWSER } from '../constants';
import { makeStyleTag, getSheet } from './dom';

/** CSSStyleSheet-like Tag abstraction for CSS rules */
export interface Tag {
  constructor(target?: HTMLElement): void;
  insertRule(index: number, rule: string): boolean;
  deleteRule(index: number): void;
  getRule(index: number): string;
  length: number;
}

/** Create a CSSStyleSheet-like tag depending on the environment */
export const makeTag = (isServer: boolean, target?: HTMLElement): Tag => {
  if (!IS_BROWSER) {
    return new VirtualTag(target);
  } else if (DISABLE_SPEEDY) {
    return new TextTag(target);
  } else {
    return new SpeedyTag(target);
  }
};

/** A Tag that wraps CSSOM's CSSStyleSheet API directly */
class SpeedyTag implements Tag {
  element: HTMLStyleElement;
  sheet: CSSStyleSheet;
  length: number;

  constructor(target?: HTMLElement) {
    const element = (this.element = makeStyleTag(target));

    // Avoid Edge bug where empty style elements don't create sheets
    element.appendChild(document.createTextNode(''));

    this.sheet = getSheet(element);
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
    if (index >= 0 && index < this.length) {
      return this.sheet.cssRules[index].cssText;
    } else {
      return '';
    }
  }
}

/** A Tag that emulates the CSSStyleSheet API but uses text nodes */
class TextTag implements Tag {
  element: HTMLStyleElement;
  nodes: NodeList<Node>;
  length: number;

  constructor(target?: HTMLElement) {
    const element = (this.element = makeStyleTag(target));
    this.nodes = element.childNodes;
    this.length = 0;
  }

  insertRule(index: number, rule: string): boolean {
    if (index <= this.length && index >= 0) {
      const node = document.createTextNode(rule);
      const refNode = this.nodes[index];
      this.element.insertBefore(node, refNode || null);
      this.length++;
      return true;
    } else {
      return false;
    }
  }

  deleteRule(index: number): void {
    this.element.removeChild(this.nodes[index]);
    this.length--;
  }

  getRule(index: number): string {
    if (index >= 0 && index < this.length) {
      return this.nodes[index].textContent;
    } else {
      return '';
    }
  }
}

/** A completely virtual (server-side) Tag that doesn't manipulate the DOM */
class VirtualTag implements Tag {
  rules: string[];
  length: number;

  constructor(_target?: HTMLElement) {
    this.rules = [];
    this.length = 0;
  }

  insertRule(index: number, rule: string): boolean {
    if (index < 0 || index > this.length) {
      return false;
    } else {
      this.rules.splice(index, 0, rule);
      return true;
    }
  }

  deleteRule(index: number): void {
    this.rules.splice(index, 1);
    this.length--;
  }

  getRule(index: number): string {
    if (index >= 0 && index < this.length) {
      return this.rules[index];
    } else {
      return '';
    }
  }
}
