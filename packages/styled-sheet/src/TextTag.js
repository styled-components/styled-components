// @flow

import type { Tag } from './types';
import { makeStyleTag } from './utils';

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
    if (index < this.length && index >= 0) {
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
  }

  getRule(index: number): string {
    return this.nodes[index].textContent;
  }
}

export default TextTag;
