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
const COMPONENTS_PER_TAG = 40

class Tag {
  el: HTMLStyleElement
  components: Map<string, Object>
  ready: boolean

  constructor(el: HTMLStyleElement, existingSource: string = '') {
    this.el = el
    this.components = new Map(extractCompsFromCSS(existingSource).map(obj =>
      [obj.componentId, obj],
    ))
    this.ready = false
  }

  isFull() {
    return this.components.size >= COMPONENTS_PER_TAG
  }

  inject(componentId: string, css: string, hash: string) {
    if (!this.ready) this.replaceElement()
    const comp = this.getComponent(componentId)
    comp.textNode.appendData(css)
    if (hash) this.el.dataset[OBJ_NAME] = `${this.el.dataset[OBJ_NAME]} ${hash}`
  }

  /* Because we care about source order, before we can inject anything we need to
   * create a text node for each component and replace the existing CSS. */
  replaceElement() {
    this.ready = true
      // We have nothing to inject. Use the current el.
    if (this.components.size === 0) return

    // Build up our replacement style tag
    const newEl = this.el.cloneNode()
    this.components.forEach(comp => {
      // eslint-disable-next-line no-param-reassign
      comp.textNode = document.createTextNode(comp.css)
      newEl.appendChild(comp.textNode)
    })

    if (!this.el.parentNode) throw new Error("Trying to replace an element that wasn't mounted!")

    // The ol' switcheroo
    this.el.parentNode.replaceChild(this.el, newEl)
    this.el = newEl
  }

  getComponent(componentId: string) {
    const existingComp = this.components.get(componentId)
    if (existingComp) return existingComp

    const comp = { componentId, css: '', textNode: document.createTextNode('') }
    this.el.appendChild(comp.textNode)
    this.components.set(componentId, comp)
    return comp
  }
}

export class BrowserStyleSheet {
  tags: Array<Tag>
  hashes: Set<string>
  componentTags: Map<string, Tag>

  constructor() {
    this.initFromDOM()
    this.constructComponentTagMap()
  }

  initFromDOM() {
    this.tags = []
    this.hashes = new Set()
    window.document.querySelector(`[${CSS_NAME}]`).forEach(el => {
      el.dataset[OBJ_NAME].trim().split(' ').forEach(hash => {
        this.hashes.add(hash, true)
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

  hasHash(hash: string) {
    return this.hashes.has(hash)
  }

  inject(componentId: string, css: string, hash: string) {
    this.getTag(componentId).inject(componentId, css, hash)
    if (hash) this.hashes.add(hash)
  }

  getTag(componentId: string) {
    const existingTag = this.componentTags.get(componentId)
    if (existingTag) return existingTag

    const lastTag = this.tags[this.tags.length - 1]
    if (!lastTag || lastTag.isFull()) {
      return this.createNewTag()
    } else {
      return lastTag
    }
  }

  createNewTag() {
    const el = document.createElement('style')
    el.type = 'text/css'
    el.setAttribute(CSS_NAME, '')
    document.head.appendChild(el)
    const newTag = new Tag(el)
    this.tags.push(newTag)
    return newTag
  }
}

let instance
export default {
  get instance() {
    return instance || (instance = new BrowserStyleSheet())
  },
}
