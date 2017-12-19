// @flow
/* eslint-disable no-underscore-dangle */
/*
 * Browser Style Sheet with Rehydration
 *
 * <style data-styled-components="x y z"
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
import getNonce from '../utils/nonce'
import type { Tag } from './StyleSheet'
import StyleSheet, { SC_ATTR, LOCAL_ATTR } from './StyleSheet'

export const COMPONENTS_PER_TAG = 40

class BrowserTag implements Tag {
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

  addComponent(componentId: string) {
    if (!this.ready) this.replaceElement()
    if (process.env.NODE_ENV !== 'production' && this.components[componentId]) {
      throw new Error(`Trying to add Component '${componentId}' twice!`)
    }

    const comp = { componentId, textNode: document.createTextNode('') }
    this.el.appendChild(comp.textNode)

    this.size += 1
    this.components[componentId] = comp
  }

  inject(componentId: string, css: string, name: ?string) {
    if (!this.ready) this.replaceElement()
    const comp = this.components[componentId]

    if (process.env.NODE_ENV !== 'production' && !comp) {
      throw new Error(
        'Must add a new component before you can inject css into it',
      )
    }
    if (comp.textNode.data === '') {
      comp.textNode.appendData(`\n/* sc-component-id: ${componentId} */\n`)
    }

    comp.textNode.appendData(css)
    if (name) {
      const existingNames = this.el.getAttribute(SC_ATTR)
      this.el.setAttribute(
        SC_ATTR,
        existingNames ? `${existingNames} ${name}` : name,
      )
    }

    const nonce = getNonce()

    if (nonce) {
      this.el.setAttribute('nonce', nonce)
    }
  }

  toHTML() {
    return this.el.outerHTML
  }

  toReactElement() {
    throw new Error("BrowserTag doesn't implement toReactElement!")
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

    if (!this.el.parentNode) {
      throw new Error("Trying to replace an element that wasn't mounted!")
    }

    // The ol' switcheroo
    this.el.parentNode.replaceChild(newEl, this.el)
    this.el = newEl
  }
}

/* Factory function to separate DOM operations from logical ones*/
export default {
  create() {
    const tags = []
    const names = {}

    /* Construct existing state from DOM */
    const nodes = document.querySelectorAll(`[${SC_ATTR}]`)
    const nodesLength = nodes.length

    for (let i = 0; i < nodesLength; i += 1) {
      const el = nodes[i]

      tags.push(
        new BrowserTag(
          el,
          el.getAttribute(LOCAL_ATTR) === 'true',
          el.innerHTML,
        ),
      )

      const attr = el.getAttribute(SC_ATTR)
      if (attr) {
        attr
          .trim()
          .split(/\s+/)
          .forEach(name => {
            names[name] = true
          })
      }
    }

    /* Factory for making more tags */
    const tagConstructor = (isLocal: boolean): Tag => {
      const el = document.createElement('style')
      el.type = 'text/css'
      el.setAttribute(SC_ATTR, '')
      el.setAttribute(LOCAL_ATTR, isLocal ? 'true' : 'false')
      if (!document.head) throw new Error('Missing document <head>')
      document.head.appendChild(el)
      return new BrowserTag(el, isLocal)
    }

    return new StyleSheet(tagConstructor, tags, names)
  },
}
