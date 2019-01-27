// @flow

import type { Tag } from './types';
import { makeStyleTag, getSheet } from './utils';

export class SpeedyTag implements Tag {
  element: HTMLStyleElement;

  sheet: CSSStyleSheet;

  length: number;

  constructor(target?: HTMLElement) {
    const element = (this.element = makeStyleTag(target));
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
  }
}

export default SpeedyTag;
