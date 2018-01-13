// @flow
/* eslint-disable no-underscore-dangle */
import React from 'react'
import { Readable } from 'stream'
import type { Tag } from './StyleSheet'
import StyleSheet, { SC_ATTR, LOCAL_ATTR, clones } from './StyleSheet'
import StyleSheetManager from './StyleSheetManager'
import minify from '../utils/minify'
import getNonce from '../utils/nonce'

class ServerTag implements Tag {
  emitted: boolean
  isLocal: boolean
  isProduction: boolean
  components: { [string]: Object }
  size: number
  names: Array<string>

  constructor(isLocal: boolean) {
    this.emitted = false
    this.isLocal = isLocal
    this.isProduction = process.env.NODE_ENV === 'production'
    this.components = {}
    this.size = 0
    this.names = []
  }

  isSealed() {
    return this.emitted
  }

  addComponent(componentId: string) {
    if (this.components[componentId]) {
      throw new Error(
        process.env.NODE_ENV !== 'production'
          ? `Trying to add Component '${componentId}' twice!`
          : ''
      )
    }
    this.components[componentId] = { componentId, css: '' }
    this.size += 1
  }

  concatenateCSS() {
    return Object.keys(this.components).reduce(
      (styles, k) => styles + this.components[k].css,
      ''
    )
  }

  inject(componentId: string, css: string, name: ?string) {
    const comp = this.components[componentId]

    if (!comp) {
      throw new Error(
        process.env.NODE_ENV !== 'production'
          ? 'Must add a new component before you can inject css into it'
          : ''
      )
    }
    if (comp.css === '') comp.css = `/* sc-component-id: ${componentId} */\n`

    comp.css += css.replace(/\n*$/, '\n')

    if (name) this.names.push(name)
  }

  toHTML() {
    const attrs: Array<string> = [
      'type="text/css"',
      `${SC_ATTR}="${this.names.join(' ')}"`,
      `${LOCAL_ATTR}="${this.isLocal ? 'true' : 'false'}"`,
    ]
    const nonce = getNonce()
    let outputCSS = this.concatenateCSS()

    if (nonce) {
      attrs.push(`nonce="${nonce}"`)
    }

    if (this.isProduction) {
      outputCSS = minify(outputCSS)
    }

    this.emitted = true

    return `<style ${attrs.join(' ')}>${outputCSS}</style>`
  }

  toReactElement(key: string) {
    const attrs: Object = {
      [SC_ATTR]: this.names.join(' '),
      [LOCAL_ATTR]: this.isLocal.toString(),
    }
    const nonce = getNonce()
    let outputCSS = this.concatenateCSS()

    if (nonce) {
      attrs.nonce = nonce
    }

    if (this.isProduction) {
      outputCSS = minify(outputCSS)
    }

    this.emitted = true

    return (
      <style
        key={key}
        type="text/css"
        {...attrs}
        dangerouslySetInnerHTML={{ __html: outputCSS }}
      />
    )
  }

  clone() {
    const copy = new ServerTag(this.isLocal)
    copy.names = [].concat(this.names)
    copy.size = this.size
    copy.components = Object.keys(this.components).reduce((acc, key) => {
      acc[key] = { ...this.components[key] } // eslint-disable-line no-param-reassign
      return acc
    }, {})

    return copy
  }
}

export default class ServerStyleSheet {
  closed: boolean
  instance: StyleSheet
  isStreaming: boolean
  lastIndex: number

  constructor() {
    this.instance = StyleSheet.clone(StyleSheet.instance)
    this.isStreaming = false
  }

  collectStyles(children: any) {
    if (this.closed) {
      throw new Error(
        process.env.NODE_ENV !== 'production'
          ? "Can't collect styles once you've called getStyleTags!"
          : ''
      )
    }
    return (
      <StyleSheetManager sheet={this.instance}>{children}</StyleSheetManager>
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

  interleaveWithNodeStream(readableStream: Readable) {
    const ourStream = new Readable()

    // $FlowFixMe
    ourStream._read = () => {}

    this.isStreaming = true
    this.lastIndex = 0

    readableStream.on('data', chunk => {
      ourStream.push(
        this.instance.tags
          .slice(this.lastIndex)
          .map(tag => tag.toHTML())
          .join('') + chunk
      )

      this.lastIndex = this.instance.tags.length - 1
    })

    readableStream.on('end', () => {
      this.closed = true
      ourStream.emit('end')
    })

    readableStream.on('error', err => {
      ourStream.emit('error', err)
    })

    return ourStream
  }

  static create() {
    return new StyleSheet(isLocal => new ServerTag(isLocal))
  }
}
