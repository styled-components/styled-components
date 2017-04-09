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

class Tag {
  el: HTMLStyleElement
  components: Array<Object>

  constructor(el, existingSource = '') {
    this.el = el
    this.components = extractCompsFromCSS(existingSource)
  }
}

export class BrowserStyleSheet {
  tags: Array<Tag>
  generatedHashes: Set<string>
  componentTags: Map<string, Tag>

  constructor() {
    this.initFromDOM()
    this.constructComponentTagMap()
  }

  initFromDOM() {
    this.tags = []
    this.generatedHashes = new Set()
    window.document.querySelector(`[${CSS_NAME}]`).forEach(el => {
      el.dataset[OBJ_NAME].split(' ').forEach(hash => {
        this.generatedHashes.add(hash, true)
      })
      this.tags.push(new Tag(el, el.innerHTML))
    })
  }

  constructComponentTagMap() {
    this.componentTags = new Map()
    this.tags.forEach(tag =>
      tag.components.forEach(comp =>
        this.componentTags.set(comp.componentId, tag)))
  }
}

let instance
export default {
  get instance() {
    return instance || (instance = new BrowserStyleSheet())
  },
}
