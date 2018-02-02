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
import stringifyRules from '../utils/stringifyRules'
import getNonce from '../utils/nonce'
import type { Tag } from './StyleSheet'
import StyleSheet, { SC_ATTR, LOCAL_ATTR } from './StyleSheet'

declare var __DEV__: ?string

const DISABLE_SPEEDY =
  (typeof __DEV__ === 'boolean' && __DEV__) ||
  process.env.NODE_ENV !== 'production'

const COMPONENTS_PER_TAG = 40
const SPEEDY_COMPONENTS_PER_TAG = 1000 // insertRule allows more injections before a perf slowdown

// Source: https://github.com/threepointone/glamor/blob/master/src/sheet.js#L32-L43
const sheetForTag = (tag: HTMLStyleElement): CSSStyleSheet => {
  if (tag.sheet) {
    // $FlowFixMe
    return tag.sheet
  }

  for (let i = 0; i < document.styleSheets.length; i += 1) {
    if (document.styleSheets[i].ownerNode === tag) {
      // $FlowFixMe
      return document.styleSheets[i]
    }
  }

  // NOTE: This should never happen
  throw new Error('')
}

// Safely (try/catch) injects rule at index and returns whether it was successful
const safeInsertRule = (
  sheet: CSSStyleSheet,
  cssRule: string,
  index: number
): boolean => {
  if (cssRule === undefined || cssRule.length === 0) {
    return false
  }

  const maxIndex = sheet.cssRules.length
  const cappedIndex = index <= maxIndex ? index : maxIndex

  try {
    sheet.insertRule(cssRule, cappedIndex)
  } catch (err) {
    // NOTE: An invalid rule here means it's not supported by the browser or obviously malformed
    return false
  }

  return true
}

// Counts up the number of rules inside the array until a specific component entry is found
// This is used to determine the necessary insertRule index
const sizeUpToComponentIndex = (
  componentSizes: Array<number>,
  componentIndex: number
) => {
  let cssRulesSize = 0
  for (let i = 0; i <= componentIndex; i += 1) {
    cssRulesSize += componentSizes[i]
  }

  return cssRulesSize
}

class BaseBrowserTag {
  components: { [string]: Object }

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

  getComponentIds() {
    return Object.keys(this.components)
  }
}

let BrowserTag
if (!DISABLE_SPEEDY) {
  BrowserTag = class SpeedyBrowserTag extends BaseBrowserTag implements Tag {
    // Store component ruleSizes in an array per component (in order)
    componentSizes: Array<number>
    components: { [string]: Object }

    isLocal: boolean
    size: number
    el: HTMLStyleElement
    ready: boolean

    constructor(
      el: HTMLStyleElement,
      isLocal: boolean,
      existingSource: ?string
    ) {
      super()

      const nonce = getNonce()
      if (nonce) {
        el.setAttribute('nonce', nonce)
      }

      const extractedComps = extractCompsFromCSS(existingSource)

      this.el = el
      this.isLocal = isLocal
      this.ready = false
      this.componentSizes = []
      this.size = extractedComps.length
      this.components = extractedComps.reduce((acc, obj) => {
        acc[obj.componentId] = obj // eslint-disable-line no-param-reassign
        return acc
      }, {})
    }

    /* Because we care about source order, before we can inject anything we need to
     * create a text node for each component and replace the existing CSS. */
    replaceElement() {
      // Build up our replacement style tag
      const newEl = this.el.cloneNode(false)

      if (!this.el.parentNode) {
        throw new Error(
          process.env.NODE_ENV !== 'production'
            ? "Trying to replace an element that wasn't mounted!"
            : ''
        )
      }

      // workaround for an IE/Edge bug: https://twitter.com/probablyup/status/958138927981977600
      newEl.appendChild(document.createTextNode(''))

      // $FlowFixMe
      this.el.parentNode.replaceChild(newEl, this.el)
      this.el = newEl
      this.ready = true

      // Retrieve the sheet for the new style tag
      const sheet = sheetForTag(newEl)

      Object.keys(this.components).forEach(componentId => {
        const comp = this.components[componentId]
        const { cssFromDOM } = comp
        const rules = stringifyRules([cssFromDOM])
        const rulesSize = rules.length

        let injectedRules = 0
        for (let j = 0; j < rulesSize; j += 1) {
          if (safeInsertRule(sheet, rules[j], sheet.cssRules.length)) {
            injectedRules += 1
          }
        }

        comp.componentIndex = this.componentSizes.length
        comp.css = rules.join(' ')
        this.componentSizes.push(injectedRules)
      })
    }

    isSealed() {
      return this.size >= SPEEDY_COMPONENTS_PER_TAG
    }

    addComponent(componentId: string) {
      if (!this.ready) this.replaceElement()

      if (
        process.env.NODE_ENV !== 'production' &&
        this.components[componentId]
      ) {
        throw new Error(`Trying to add Component '${componentId}' twice!`)
      }

      this.components[componentId] = {
        componentIndex: this.componentSizes.length,
        css: '',
      }

      this.componentSizes.push(0)
      this.size += 1
    }

    inject(componentId: string, cssRules: Array<string>, name: ?string) {
      if (!this.ready) this.replaceElement()

      const comp = this.components[componentId]
      if (process.env.NODE_ENV !== 'production' && !comp) {
        throw new Error(
          'Must add a new component before you can inject css into it'
        )
      }

      const cssRulesSize = cssRules.length
      const sheet = sheetForTag(this.el)
      const { componentIndex } = comp

      // Determine start index for injection
      const insertIndex = sizeUpToComponentIndex(
        this.componentSizes,
        componentIndex
      )

      // Inject each rule shifting index forward for each one (in-order injection)
      let injectedRules = 0
      for (let i = 0; i < cssRulesSize; i += 1) {
        const cssRule = cssRules[i]
        if (safeInsertRule(sheet, cssRule, insertIndex + injectedRules)) {
          comp.css += ` ${cssRule}`
          injectedRules += 1
        }
      }

      // Update number of rules for component
      this.componentSizes[componentIndex] += injectedRules

      if (name !== undefined && name !== null) {
        const existingNames = this.el.getAttribute(SC_ATTR)
        this.el.setAttribute(
          SC_ATTR,
          existingNames ? `${existingNames} ${name}` : name
        )
      }
    }

    toRawCSS() {
      return '' // NOTE: Unsupported in production mode (SpeedyBrowserTag)
    }

    toHTML() {
      return '' // NOTE: Unsupported in production mode (SpeedyBrowserTag)
    }
  }
} else {
  BrowserTag = class TextNodeBrowserTag extends BaseBrowserTag implements Tag {
    isLocal: boolean
    components: { [string]: Object }
    size: number
    el: HTMLStyleElement
    ready: boolean

    constructor(
      el: HTMLStyleElement,
      isLocal: boolean,
      existingSource: string = ''
    ) {
      super()

      const nonce = getNonce()
      if (nonce !== null) {
        el.setAttribute('nonce', nonce)
      }

      const extractedComps = extractCompsFromCSS(existingSource)

      this.el = el
      this.isLocal = isLocal
      this.ready = false
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
      if (
        process.env.NODE_ENV !== 'production' &&
        this.components[componentId]
      ) {
        throw new Error(`Trying to add Component '${componentId}' twice!`)
      }

      const comp = { componentId, textNode: document.createTextNode('') }
      this.el.appendChild(comp.textNode)
      this.size += 1
      this.components[componentId] = comp
    }

    inject(componentId: string, css: Array<string>, name: ?string) {
      if (!this.ready) this.replaceElement()
      const comp = this.components[componentId]

      if (process.env.NODE_ENV !== 'production' && !comp) {
        throw new Error(
          'Must add a new component before you can inject css into it'
        )
      }

      if (comp.textNode.data === '') {
        comp.textNode.appendData(`\n/* sc-component-id: ${componentId} */\n`)
      }

      comp.textNode.appendData(css.join(' '))

      if (name !== undefined && name !== null) {
        const existingNames = this.el.getAttribute(SC_ATTR)
        this.el.setAttribute(
          SC_ATTR,
          existingNames ? `${existingNames} ${name}` : name
        )
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
      const newEl = this.el.cloneNode(false)
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
      // $FlowFixMe: We can trust that all elements in this query are style elements
      const el = (nodes[i]: HTMLStyleElement)
      const attr = el.getAttribute(SC_ATTR)

      if (attr) {
        attr
          .trim()
          .split(/\s+/)
          .forEach(name => {
            names[name] = true
          })
      }

      tags.push(
        new BrowserTag(
          el,
          el.getAttribute(LOCAL_ATTR) === 'true',
          el.textContent
        )
      )
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
