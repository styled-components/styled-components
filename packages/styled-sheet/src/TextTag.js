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
    const node = document.createTextNode(rule);
    const refNode = this.nodes[index];
    this.element.insertBefore(node, refNode || null);
    this.length++;
    return true;
  }

  deleteRule(index: number): void {
    this.element.removeChild(this.nodes[index]);
  }
}

export default TextTag;
