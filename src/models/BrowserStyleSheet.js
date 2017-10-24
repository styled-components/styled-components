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

declare var __DEV__: ?string

const IS_BROWSER = typeof window !== 'undefined'
const IS_DEV =
  // `insertRule` doesn't seem to work properly in jest/enzyme
 (typeof __DEV__ === 'boolean' && __DEV__) ||
  process.env.NODE_ENV === 'development' ||
  !process.env.NODE_ENV
const USE_SPEEDY = IS_BROWSER && !IS_DEV

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

  isSealed() {
    return this.size >= COMPONENTS_PER_TAG
  }

  addComponent(componentId: string) {
    if (!this.ready) this.replaceElement()
    if (this.components[componentId]) {
      throw new Error(
        process.env.NODE_ENV !== 'production'
          ? `Trying to add Component '${componentId}' twice!`
          : ''
      )
    }

    const comp = { componentId, textNode: document.createTextNode('') }
    if (!USE_SPEEDY) {
      this.el.appendChild(comp.textNode)
    }

    this.size += 1
    this.components[componentId] = comp
  }

  speedyInsert(el: HTMLStyleElement, cssRules: Array<string>) {
    const sheet = el.sheet
    if (sheet === null || sheet === undefined) {
      return
    }

    for (let i = 0; i < cssRules.length; i += 1) {
      const rule = cssRules[i]
      if (rule !== undefined && rule.length) {
        /* eslint-disable */
        // $FlowFixMe Flow's `StyleSheet` breakdown here https://github.com/facebook/flow/issues/2696
        sheet.insertRule(rule, rule.indexOf('@import') !== -1 ? 0 : sheet.cssRules.length)
        /* eslint-enable */
      }
    }
  }


  inject(componentId: string, css: Array<string>, name: ?string) {
    if (!this.ready) this.replaceElement()
    const comp = this.components[componentId]

    if (process.env.NODE_ENV !== 'production' && !comp) {
      throw new Error('Must add a new component before you can inject css into it')
    }

    if (USE_SPEEDY) {
      // $FlowFixMe Flow doesn't like casting el to `HtmlStyleElement` saying its incompatible
      this.speedyInsert((this.el: HTMLStyleElement), css)
    } else {
      if (comp.textNode.data === '') {
        comp.textNode.appendData(`\n/* sc-component-id: ${componentId} */\n`)
      }
      comp.textNode.appendData(css.join(' '))
    }

    if (name !== undefined && name !== null) {
      /* eslint-disable */
      const existingNames = this.el.getAttribute(SC_ATTR)
      this.el.setAttribute(
        SC_ATTR,
        existingNames ? `${existingNames} ${name}` : name
      )
    }

    const nonce = getNonce()
    if (nonce !== null) {
      this.el.setAttribute('nonce', nonce)
    }
  }

  toHTML() {
    return this.el.outerHTML
  }

  toReactElement() {
    throw new Error(
      process.env.NODE_ENV !== 'production'
        ? "BrowserTag doesn't implement toReactElement!"
        : ''
    )
  }

  clone() {
    throw new Error(
      process.env.NODE_ENV !== 'production'
        ? 'BrowserTag cannot be cloned!'
        : ''
    )
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
      throw new Error(
        process.env.NODE_ENV !== 'production'
          ? "Trying to replace an element that wasn't mounted!"
          : ''
      )
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
        new BrowserTag(el, el.getAttribute(LOCAL_ATTR) === 'true', el.innerHTML)
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
      if (!document.head) {
        throw new Error(
          process.env.NODE_ENV !== 'production' ? 'Missing document <head>' : ''
        )
      }
      document.head.appendChild(el)
      return new BrowserTag(el, isLocal)
    }

    return new StyleSheet(tagConstructor, tags, names)
  },
}
