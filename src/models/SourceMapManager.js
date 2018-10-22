// @flow
import type { SourceMap } from '../types';

export default class SourceMapManager {
  sourceMapContent: SourceMap | '';

  sourceMapNode: ?Text;

  el: ?HTMLStyleElement;

  constructor(el: ?HTMLStyleElement) {
    this.el = el;
  }

  inject(sourceMap: SourceMap) {
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

  remove() {
    this.sourceMapContent = '';
    if (this.sourceMapNode && this.sourceMapNode.parentNode) {
      this.sourceMapNode.parentNode.removeChild(this.sourceMapNode);
    }
    this.sourceMapNode = undefined;
  }

  hasSourceMap() {
    return !!this.sourceMapContent;
  }
}
