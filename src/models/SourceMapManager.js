// @flow
import type { SourceMap } from '../types';

export const sourceMapRegex = /\/\*#\ssourceMappingURL=data:application\/json;\S+\s+\*\//;
export default class SourceMapManager {
  sourceMapContent: SourceMap | '';

  sourceMapNode: ?Text;

  el: ?HTMLStyleElement;

  constructor(el: ?HTMLStyleElement) {
    if (process.env.NODE_ENV !== 'production') {
      this.el = el;
    }
  }

  inject(sourceMap: SourceMap) {
    if (process.env.NODE_ENV !== 'production') {
      if (sourceMap) {
        this.sourceMapContent = sourceMap;
      }

      if (this.el) {
        if (this.sourceMapNode) {
          this.sourceMapNode.nodeValue = this.sourceMapContent;
        } else {
          this.sourceMapNode = document.createTextNode(this.sourceMapContent);
        }
        /* Move the sourceMapNode the the end */
        this.el.appendChild(this.sourceMapNode);
      }
    }
  }

  remove() {
    if (process.env.NODE_ENV !== 'production') {
      this.sourceMapContent = '';
      if (this.sourceMapNode && this.sourceMapNode.parentNode) {
        this.sourceMapNode.parentNode.removeChild(this.sourceMapNode);
      }
      this.sourceMapNode = undefined;
    }
  }

  hasSourceMap() {
    if (process.env.NODE_ENV !== 'production') {
      return !!this.sourceMapContent;
    }
    return false;
  }
}

export function containsSourceMap(node: HTMLElement) {
  return sourceMapRegex.test(node.innerHTML);
}
