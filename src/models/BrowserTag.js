import extractCompsFromCSS from '../utils/extractCompsFromCSS'
import type InMemoryTag from './InMemoryTag'
export const COMPONENTS_PER_TAG = 40

export default class BrowserTag {
  isLocal: boolean
  components: { [string]: Object }
  size: number
  el: HTMLElement
  ready: boolean

  constructor(el: HTMLElement, isLocal: boolean, existingSource: string = '') {
    this.el = el
    this.isLocal = isLocal
    this.ready = false

    const extractedComps = extractCompsFromCSS(existingSource)

    this.size = extractedComps.length
    this.components = extractedComps.reduce((acc, obj) => {
      acc[obj.componentId] = obj // eslint-disable-line no-param-reassign
      return acc
    }, {})
  }

  isFull() {
    return this.size >= COMPONENTS_PER_TAG
  }

  flush(memoryTag: InMemoryTag) {
    console.log("BT flush")
    Object.keys(memoryTag.components).forEach(componentId => {
      if (!this.components[componentId]) this.addComponent(componentId)
      this.inject(componentId, memoryTag.components[componentId].css)
    })
  }

  addComponent(componentId: string) {
    if (!this.ready) this.replaceElement()
    if (this.components[componentId]) throw new Error(`Trying to add Component '${componentId}' twice!`)

    const comp = { componentId, textNode: document.createTextNode(''), index: 0 }
    this.el.appendChild(comp.textNode)

    this.size += 1
    this.components[componentId] = comp
  }

  inject(componentId: string, css: Array<string>, name: ?string) {
    if (!this.ready) this.replaceElement()
    const comp = this.components[componentId]

    if (!comp) throw new Error('Must add a new component before you can inject css into it')

    comp.textNode.appendData(css.slice(comp.index).join(''))
    comp.index = css.length
    if (name) {
      const existingNames = this.el.getAttribute(SC_ATTR)
      this.el.setAttribute(SC_ATTR, existingNames ? `${existingNames} ${name}` : name)
    }
  }

  toHTML() {
    return this.el.outerHTML
  }

  toReactElement() {
    throw new Error('BrowserTag doesn\'t implement toReactElement!')
  }

  clone() {
    throw new Error('BrowserTag cannot be cloned!')
  }

  /* Because we care about source order, before we can inject anything we need to
   * create a text node for each component and replace the existing CSS. */
  replaceElement() {
    this.ready = true
    // We have nothing to inject. Use the current el.
    if (this.size === 0) return

    // Build up our replacement style tag
    const newEl = this.el.cloneNode()
    newEl.appendChild(document.createTextNode('\n'))

    Object.keys(this.components).forEach(key => {
      const comp = this.components[key]

      // eslint-disable-next-line no-param-reassign
      comp.textNode = document.createTextNode(comp.cssFromDOM)
      newEl.appendChild(comp.textNode)
    })

    if (!this.el.parentNode) throw new Error("Trying to replace an element that wasn't mounted!")

    // The ol' switcheroo
    this.el.parentNode.replaceChild(newEl, this.el)
    this.el = newEl
  }
}
