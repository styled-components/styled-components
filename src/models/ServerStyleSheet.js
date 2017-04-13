// @flow
import React from 'react'
import type { Tag } from './StyleSheet'
import StyleSheet, { SC_ATTR, LOCAL_ATTR } from './StyleSheet'
import StyleSheetManager from './StyleSheetManager'

class ServerTag implements Tag {
  isLocal: boolean
  components: Map<string, Object>
  names: Array<string>

  constructor(isLocal: boolean) {
    this.isLocal = isLocal
    this.components = new Map()
    this.names = []
  }

  isFull() {
    return false
  }

  inject(componentId: string, css: string, name: ?string) {
    const comp = this.getComponent(componentId)
    comp.css += css.replace(/\n*$/, '\n')
    if (name) this.names.push(name)
  }

  toHTML() {
    const namesAttr = `${SC_ATTR}="${this.names.join(' ')}"`
    const localAttr = `${LOCAL_ATTR}="${this.isLocal ? 'true' : 'false'}"`
    return `<style type="text/css" ${namesAttr} ${localAttr}>\n${
      Array.from(this.components.values()).map(comp => comp.css).join('')
      }\n</style>`
  }

  clone() {
    const copy = new ServerTag(this.isLocal)
    copy.components = new Map([...this.components].map(([k, v]) => [k, Object.assign({}, v)]))
    copy.names = [].concat(this.names)
    return copy
  }

  getComponent(componentId: string) {
    const existingComp = this.components.get(componentId)
    if (existingComp) return existingComp

    const css = `/* sc-component-id: ${componentId} */\n`
    const comp = { componentId, css }
    this.components.set(componentId, comp)
    return comp
  }
}

export default class ServerStyleSheet {
  instance: StyleSheet

  constructor() {
    this.instance = StyleSheet.clone(StyleSheet.instance)
  }

  collectStyles(children: any) {
    return (
      <StyleSheetManager sheet={this.instance}>
        {children}
      </StyleSheetManager>
    )
  }

  get css(): string {
    return this.instance.toHTML()
  }

  static create() {
    return new StyleSheet(isLocal => new ServerTag(isLocal))
  }
}
