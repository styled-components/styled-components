// @flow
import React from 'react'
import BrowserTag from './BrowserTag'
import { SC_ATTR, LOCAL_ATTR } from './StyleSheet'

export const COMPONENTS_PER_TAG = 40

export default class InMemoryTag {
  onBrowser: boolean
  isLocal: boolean
  components: { [string]: Object }
  size: number
  names: Array<string>
  browserTag: ?BrowserTag

  constructor(onBrowser: boolean,
    isLocal: boolean,
    names: ?Array<string>,
    browserTag: ?BrowserTag) {
    this.onBrowser = onBrowser
    this.isLocal = isLocal
    this.browserTag = browserTag
    this.size = 0
    this.names = names || []

    /* If we're rehydrating from a BrowserTag, build up a simple in-memory component for each
     * component it contains. Set the existing CSS as a single block and set the flush index
     * to 1. */
    if (browserTag) {
      const browserComps = browserTag.textNodes
      const componentIds = Object.keys(browserComps)
      this.size = componentIds.length
      this.components = componentIds.reduce((accum, componentId) => {
        const cssFromDOM = browserComps[componentId].wholeText
        return { ...accum, [componentId]: { componentId, css: [cssFromDOM], index: 1 } }
      }, {})
    } else {
      this.components = {}
    }
  }

  isFull() {
    return this.size >= COMPONENTS_PER_TAG
  }

  addComponent(componentId: string) {
    if (this.components[componentId]) throw new Error(`Trying to add Component '${componentId}' twice!`)
    this.components[componentId] = { componentId, css: [], index: 0 }
    this.size += 1
  }

  inject(componentId: string, css: string, name: ?string) {
    const comp = this.components[componentId]

    if (!comp) throw new Error('Must add a new component before you can inject css into it')
    if (comp.css.length === 0) comp.css.push(`\n/* sc-component-id: ${componentId} */\n`)

    comp.css.push(css.trim().replace(/\n*$/, '\n'))

    if (name) this.names.push(name)
  }

  flush() {
    if (!this.onBrowser) return

    if (!this.browserTag) {
      const el = document.createElement('style')
      el.type = 'text/css'
      el.setAttribute(SC_ATTR, '')
      el.setAttribute(LOCAL_ATTR, this.isLocal ? 'true' : 'false')
      if (!document.head) throw new Error('Missing document <head>')
      document.head.appendChild(el)
      this.browserTag = new BrowserTag(el)
    }

    const browserTag = this.browserTag
    browserTag.updateNames(this.names)
    Object.keys(this.components).forEach(componentId => {
      const comp = this.components[componentId]
      if (comp.index >= comp.css.length) return
      browserTag.appendCSS(componentId, comp.css.slice(comp.index).join(''))
      comp.index = comp.css.length
    })
  }

  toHTML() {
    const namesAttr = `${SC_ATTR}="${this.names.join(' ')}"`
    const localAttr = `${LOCAL_ATTR}="${this.isLocal ? 'true' : 'false'}"`
    const css = Object.keys(this.components)
      .map(key => this.components[key].css.join(''))
      .join('')

    return `<style type="text/css" ${namesAttr} ${localAttr}>\n${css}\n</style>`
  }

  toReactElement(key: string) {
    const attributes = {
      [SC_ATTR]: this.names.join(' '),
      [LOCAL_ATTR]: this.isLocal.toString(),
    }
    const css = Object.keys(this.components)
      .map(k => this.components[k].css)
      .join('')

    return (
      <style
        key={key} type="text/css" {...attributes}
        dangerouslySetInnerHTML={{ __html: css }}
      />
    )
  }

  clone() {
    if (this.browserTag) throw new Error('BrowserTag cannot be cloned!')
    const copy = new InMemoryTag(this.onBrowser, this.isLocal, [].concat(this.names))
    copy.size = this.size
    copy.components = Object.keys(this.components)
      .reduce((acc, key) => {
        const { componentId, css } = this.components[key]
        acc[key] = { componentId, css: [...css] } // eslint-disable-line no-param-reassign
        return acc
      }, {})

    return copy
  }
}
