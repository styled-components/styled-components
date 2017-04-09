// @flow
/*
* Browser Style Sheet with Rehydration
*
* <style data-styled-components-hashes="x y z">
*   /· sc-component-id: a ·/
*   .sc-a { ... }
*   .x { ... }
*   /· sc-component-id: b ·/
*   .sc-b { ... }
*   .y { ... }
*   .z { ... }
* </style>
*
* Note: replace · with * in the above snippet.
* */
import extractCompsFromCSS from '../utils/extractCompsFromCSS'

const CSS_NAME = 'data-styled-components-hashes'
const OBJ_NAME = 'styledComponentsHashes'

export class BrowserStyleSheet {
  tags: Array<Object>
  generatedHashes: Object

  constructor() {
    this.initFromDOM()
  }

  initFromDOM() {
    this.tags = []
    this.generatedHashes = {}
    window.document.querySelector(`[${CSS_NAME}]`).forEach(el => {
      el.dataset[OBJ_NAME].split(' ').forEach(hash => {
        this.generatedHashes[hash] = true
      })
      this.tags.push({ el, components: extractCompsFromCSS(el.innerHTML) })
    })
  }
}

let instance
export default {
  get instance() {
    return instance || (instance = new BrowserStyleSheet())
  },
}
