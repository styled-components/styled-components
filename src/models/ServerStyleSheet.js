// @flow
/* eslint-disable no-underscore-dangle */
import React from 'react'
import stream from 'stream'
import type { Tag } from './StyleSheet'
import StyleSheet, { SC_ATTR, LOCAL_ATTR, clones } from './StyleSheet'
import StyleSheetManager from './StyleSheetManager'
import getNonce from '../utils/nonce'

declare var __SERVER__: boolean

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

  getComponentIds() {
    return Object.keys(this.components)
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

  inject(componentId: string, css: Array<string>, name: ?string) {
    const comp = this.components[componentId]

    if (!comp) {
      throw new Error(
        process.env.NODE_ENV !== 'production'
          ? 'Must add a new component before you can inject css into it'
          : ''
      )
    }

    if (comp.css === '') {
      comp.css = `/* sc-component-id: ${componentId} */\n`
    }

    const cssRulesSize = css.length
    for (let i = 0; i < cssRulesSize; i += 1) {
      const cssRule = css[i]
      comp.css += `${cssRule}\n`.replace(/\n*$/, '\n')
    }

    if (name) this.names.push(name)
  }

  toHTML() {
    const attrs: Array<string> = [
      'type="text/css"',
      `${SC_ATTR}="${this.names.join(' ')}"`,
      `${LOCAL_ATTR}="${this.isLocal ? 'true' : 'false'}"`,
    ]

    const nonce = getNonce()
    if (nonce) {
      attrs.push(`nonce="${nonce}"`)
    }

    this.emitted = true
    return `<style ${attrs.join(' ')}>${this.concatenateCSS()}</style>`
  }

  toReactElement(key: string) {
    const attrs: Object = {
      [SC_ATTR]: this.names.join(' '),
      [LOCAL_ATTR]: this.isLocal.toString(),
    }

    const nonce = getNonce()
    if (nonce) {
      attrs.nonce = nonce
    }

    this.emitted = true

    return (
      <style
        key={key}
        type="text/css"
        {...attrs}
        dangerouslySetInnerHTML={{ __html: this.concatenateCSS() }}
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

  constructor() {
    this.instance = StyleSheet.clone(StyleSheet.instance)
    this.instance.isStreaming = false
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

  close() {
    clones.splice(clones.indexOf(this.instance), 1)
    this.closed = true
  }

  getStyleTags(): string {
    if (!this.closed) {
      this.close()
    }

    return this.instance.toHTML()
  }

  getStyleElement() {
    if (!this.closed) {
      this.close()
    }

    return this.instance.toReactElements()
  }

  interleaveWithNodeStream(readableStream: stream.Readable) {
    if (__SERVER__) {
      const ourStream = new stream.Readable()

      // $FlowFixMe
      ourStream._read = () => {}

      this.instance.isStreaming = true

      readableStream.on('data', chunk => {
        ourStream.push(
          this.instance.tags.reduce((html, tag) => {
            if (!tag.isSealed()) {
              html += tag.toHTML() // eslint-disable-line no-param-reassign
            }

            return html
          }, '') + chunk
        )
      })

      readableStream.on('end', () => {
        ourStream.push(null)
        this.close()
      })

      readableStream.on('error', err => {
        ourStream.emit('error', err)
        this.close()
      })

      return ourStream
    } else {
      throw new Error(
        process.env.NODE_ENV !== 'production'
          ? 'streaming only works in Node.js, please do not try to call this method in the browser'
          : ''
      )
    }
  }

  static create() {
    return new StyleSheet(isLocal => new ServerTag(isLocal))
  }
}
