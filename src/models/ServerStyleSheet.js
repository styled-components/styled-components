// @flow
/* eslint-disable no-underscore-dangle */
import React from 'react'
import stream from 'stream'

import StyleSheet from './StyleSheet'
import StyleSheetManager from './StyleSheetManager'

declare var __SERVER__: boolean

const IS_BROWSER = typeof window !== 'undefined'

/* this error is used for makeStyleTag */
const sheetClosedErr =
  process.env.NODE_ENV !== 'production'
    ? `
Can't collect styles once you've consumed a ServerStyleSheet's styles!
ServerStyleSheet is a one off instance for each server-side render cycle.
- Are you trying to reuse it across renders?
- Are you accidentally calling collectStyles twice?
`.trim()
    : ''

const streamBrowserErr =
  process.env.NODE_ENV !== 'production'
    ? 'Streaming SSR is only supported in a Node.js environment; Please do not try to call this method in the browser.'
    : ''

export default class ServerStyleSheet {
  closed: boolean
  global: StyleSheet
  instance: StyleSheet

  constructor() {
    this.global = StyleSheet.global
    this.instance = new StyleSheet(null)
    this.closed = false
  }

  collectStyles(children: any) {
    if (this.closed) {
      throw new Error(sheetClosedErr)
    }

    return (
      <StyleSheetManager sheet={this.instance}>{children}</StyleSheetManager>
    )
  }

  getStyleTags(): string {
    if (!this.closed) {
      this.closed = true
    }

    return this.global.toHTML() + this.instance.toHTML()
  }

  getStyleElement() {
    if (!this.closed) {
      this.closed = true
    }

    return this.global.toReactElements().concat(this.instance.toReactElements())
  }

  interleaveWithNodeStream(readableStream: stream.Readable) {
    if (__SERVER__ || IS_BROWSER) {
      throw new Error(streamBrowserErr)
    }

    const { instance, global } = this
    const ourStream = new stream.Readable()
    // $FlowFixMe
    ourStream._read = () => {}

    let globalTagIndex = 0
    let instanceTagIndex = 0

    readableStream.on('data', chunk => {
      const globalTagSize = global.tags.length
      const instanceTagSize = instance.tags.length

      let html = ''

      for (; globalTagIndex < globalTagSize; globalTagIndex += 1) {
        const tag = global.tags[globalTagIndex]
        html += tag.toHTML()
      }

      for (; instanceTagIndex < instanceTagSize; instanceTagIndex += 1) {
        const tag = instance.tags[globalTagIndex]
        html += tag.toHTML()
      }

      /* force our StyleSheets to emit entirely new tags */
      global.sealAllTags()
      instance.sealAllTags()
      ourStream.push(html + chunk)
    })

    readableStream.on('end', () => {
      this.closed = true
      ourStream.push(null)
    })

    readableStream.on('error', err => {
      this.closed = true
      ourStream.emit('error', err)
    })

    return ourStream
  }
}
