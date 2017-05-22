// @flow
import React from 'react'
import type { Tag } from './StyleSheet'
import StyleSheet, { SC_ATTR, LOCAL_ATTR, clones } from './StyleSheet'
import StyleSheetManager from './StyleSheetManager'

class ServerTag implements Tag {
  isLocal: boolean
  components: { [string]: Object }
  size: number
  names: Array<string>

  constructor(isLocal: boolean) {
    this.isLocal = isLocal
    this.components = {}
    this.size = 0
    this.names = []
  }

  isFull() {
    return false
  }

  addComponent(componentId: string) {
    if (this.components[componentId]) throw new Error(`Trying to add Component '${componentId}' twice!`)
    this.components[componentId] = { componentId, css: '' }
    this.size += 1
  }

  inject(componentId: string, css: string, name: ?string) {
    const comp = this.components[componentId]

    if (!comp) throw new Error('Must add a new component before you can inject css into it')
    if (comp.css === '') comp.css = `/* sc-component-id: ${componentId} */\n`

    comp.css += css.replace(/\n*$/, '\n')

    if (name) this.names.push(name)
  }

  toHTML() {
    const namesAttr = `${SC_ATTR}="${this.names.join(' ')}"`
    const localAttr = `${LOCAL_ATTR}="${this.isLocal ? 'true' : 'false'}"`
    const css = Object.keys(this.components)
      .map(key => this.components[key].css)
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
    const copy = new ServerTag(this.isLocal)
    copy.names = [].concat(this.names)
    copy.size = this.size
    copy.components = Object.keys(this.components)
      .reduce((acc, key) => {
        acc[key] = { ...this.components[key] } // eslint-disable-line no-param-reassign
        return acc
      }, {})

    return copy
  }
}

export default class ServerStyleSheet {
  instance: StyleSheet
  closed: boolean

  constructor() {
    this.instance = StyleSheet.clone(StyleSheet.instance)
  }

  collectStyles(children: any) {
    if (this.closed) throw new Error("Can't collect styles once you've called getStyleTags!")
    return (
      <StyleSheetManager sheet={this.instance}>
        {children}
      </StyleSheetManager>
    )
  }

  getStyleTags(): string {
    if (!this.closed) {
      clones.splice(clones.indexOf(this.instance), 1)
      this.closed = true
    }

    return this.instance.toHTML()
  }

  getStyleElement() {
    if (!this.closed) {
      clones.splice(clones.indexOf(this.instance), 1)
      this.closed = true
    }

    return this.instance.toReactElements()
  }

  static create() {
    return new StyleSheet(isLocal => new ServerTag(isLocal))
  }
}
