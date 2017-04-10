// @flow
/*
 * Browser Style Sheet with Rehydration
 *
 * <style data-styled-components-hashes="123:x 456:y 789:z">
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
const COMPONENTS_PER_TAG = 40

class Tag {
  el: HTMLElement
  components: Map<string, Object>
  ready: boolean

  constructor(el: HTMLElement, existingSource: string = '') {
    this.el = el
    this.components = new Map(extractCompsFromCSS(existingSource).map(obj =>
      [obj.componentId, obj],
    ))
    this.ready = false
  }

  isFull() {
    return this.components.size >= COMPONENTS_PER_TAG
  }

  inject(componentId: string, css: string, hash: ?string, name: ?string) {
    if (!this.ready) this.replaceElement()
    const comp = this.getComponent(componentId)
    comp.textNode.appendData(css)
    comp.css += css
    if (hash && name) this.el.setAttribute(CSS_NAME, `${this.el.getAttribute(CSS_NAME) || ''} ${hash}:${name}`)
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

  getCSS() {
    return Array.from(this.components.values()).map(comp => comp.css).join('\n')
  }
}

export class BrowserStyleSheet {
  tags: Array<Tag>
  hashes: Map<string, string>
  componentTags: Map<string, Tag>

  constructor() {
    this.initFromDOM()
    this.constructComponentTagMap()
  }

  initFromDOM() {
    this.tags = []
    this.hashes = new Map()
    Array.from(document.querySelectorAll(`[${CSS_NAME}]`)).forEach(el => {
      (el.getAttribute(CSS_NAME) || '').trim().split(/\s+/).forEach(record => {
        const [hash, name] = record.split(':')
        this.hashes.set(hash, name)
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

  getName(hash: string) {
    return this.hashes.get(hash)
  }

  inject(componentId: string, css: string, hash: ?string, name: ?string) {
    console.log({ componentId, css, hash, name })
    this.getTag(componentId).inject(componentId, css, hash, name)
    if (hash && name) this.hashes.set(hash, name)
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

  getCSS() {
    return this.tags.map(tag => tag.getCSS()).join('\n')
  }
}

let instance
export default {
  get instance() {
    return instance || (instance = new BrowserStyleSheet())
  },
  reset() {
    instance = new BrowserStyleSheet()
  },
}
