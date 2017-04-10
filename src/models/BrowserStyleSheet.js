// @flow
/*
 * Browser Style Sheet with Rehydration
 *
 * <style data-styled-components-hashes="123:x 456:y 789:z"
 *        data-styled-components-is-local="true">
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

const HASH_ATTR = 'data-styled-components-hashes'
const LOCAL_ATTR = 'data-styled-components-is-local'
const COMPONENTS_PER_TAG = 40

class Tag {
  el: HTMLElement
  components: Map<string, Object>
  ready: boolean
  isLocal: boolean

  constructor(el: HTMLElement, isLocal: boolean, existingSource: string = '') {
    this.el = el
    this.isLocal = isLocal
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
    comp.textNode.appendData(css.replace(/\n?$/, '\n'))
    comp.css += css
    if (hash && name) this.el.setAttribute(HASH_ATTR, `${this.el.getAttribute(HASH_ATTR) || ''} ${hash}:${name}`)
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

    const css = `/* sc-component-id: ${componentId} */\n`
    const comp = { componentId, css, textNode: document.createTextNode(css) }
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
    Array.from(document.querySelectorAll(`[${HASH_ATTR}]`)).forEach(el => {
      (el.getAttribute(HASH_ATTR) || '').trim().split(/\s+/).forEach(record => {
        const [hash, name] = record.split(':')
        this.hashes.set(hash, name)
      })
      this.tags.push(new Tag(el, el.getAttribute('') === 'true', el.innerHTML))
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

  inject(componentId: string,
    isLocal: boolean,
    css: string,
    hash: ?string,
    name: ?string) {
    console.log({ componentId, isLocal, css, hash, name })
    this.getTag(componentId, isLocal).inject(componentId, css, hash, name)
    if (hash && name) this.hashes.set(hash, name)
  }

  getTag(componentId: string, isLocal: boolean) {
    const existingTag = this.componentTags.get(componentId)
    if (existingTag) return existingTag

    const lastTag = this.tags[this.tags.length - 1]
    if (!lastTag || lastTag.isFull() || lastTag.isLocal !== isLocal) {
      return this.createNewTag(isLocal)
    } else {
      return lastTag
    }
  }

  createNewTag(isLocal: boolean) {
    const el = document.createElement('style')
    el.type = 'text/css'
    el.setAttribute(HASH_ATTR, '')
    el.setAttribute(LOCAL_ATTR, isLocal ? 'true' : 'false')
    document.head.appendChild(el)
    const newTag = new Tag(el, isLocal)
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
