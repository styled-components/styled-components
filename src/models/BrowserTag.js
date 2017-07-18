// @flow
import extractCompsFromCSS from '../utils/extractCompsFromCSS'
import { SC_ATTR } from './StyleSheet'

export default class BrowserTag {
  textNodes: { [string]: Object }
  el: HTMLElement
  ready: boolean

  constructor(el: HTMLElement, existingSource: string = '') {
    this.el = el
    this.ready = false

    const extractedComps = extractCompsFromCSS(existingSource)

    this.textNodes = {}
    extractedComps.forEach(obj => {
      this.textNodes[obj.componentId] = document.createTextNode(obj.cssFromDOM)
    })
  }

  getComponentNode(componentId: string) {
    if (!this.ready) this.replaceElement()
    const existingTextNode = this.textNodes[componentId]
    if (existingTextNode) return existingTextNode

    const textNode = document.createTextNode('')
    this.el.appendChild(textNode)
    this.textNodes[componentId] = textNode
    return textNode
  }

  appendCSS(componentId: string, css: string) {
    const textNode = this.getComponentNode(componentId)
    textNode.appendData(css)
  }

  updateNames(names: Array<string>) {
    this.el.setAttribute(SC_ATTR, names.join(' '))
  }

  /* Because we care about source order, before we can inject anything we need to
   * create a text node for each component and replace the existing CSS. */
  replaceElement() {
    const componentIds = Object.keys(this.textNodes)
    // We have nothing to inject. Use the current el.
    if (componentIds.length === 0) return

    // Build up our replacement style tag
    const newEl = this.el.cloneNode()
    newEl.appendChild(document.createTextNode('\n'))

    componentIds.forEach(componentId => {
      const textNode = this.textNodes[componentId]
      newEl.appendChild(textNode)
    })

    if (!this.el.parentNode) throw new Error("Trying to replace an element that wasn't mounted!")

    // The ol' switcheroo
    this.el.parentNode.replaceChild(newEl, this.el)
    this.el = newEl
    this.ready = true
  }
}
