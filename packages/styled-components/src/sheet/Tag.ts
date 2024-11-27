import { InsertionTarget } from '../types';
import { getSheet, makeStyleTag } from './dom';
import { SheetOptions, Tag } from './types';

/** Create a CSSStyleSheet-like tag depending on the environment */
export const makeTag = ({ isServer, useCSSOMInjection, target }: SheetOptions) => {
  if (isServer) {
    return new VirtualTag(target);
  } else if (useCSSOMInjection) {
    return new CSSOMTag(target);
  } else {
    return new TextTag(target);
  }
};

export const CSSOMTag = class CSSOMTag implements Tag {
  element: HTMLStyleElement;

  sheet: CSSStyleSheet;

  length: number;

  constructor(target?: InsertionTarget | undefined) {
    this.element = makeStyleTag(target);

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

/** A Tag that emulates the CSSStyleSheet API but uses text nodes */
export const TextTag = class TextTag implements Tag {
  element: HTMLStyleElement;
  nodes: NodeListOf<Node>;
  length: number;

  constructor(target?: InsertionTarget | undefined) {
    this.element = makeStyleTag(target);
    this.nodes = this.element.childNodes;
    this.length = 0;
  }

  insertRule(index: number, rule: string) {
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

  deleteRule(index: number) {
    this.element.removeChild(this.nodes[index]);
    this.length--;
  }

  getRule(index: number) {
    if (index < this.length) {
      return this.nodes[index].textContent as string;
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
      this.rules.splice(index, 0, rule);
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
