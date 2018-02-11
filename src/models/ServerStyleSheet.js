// @flow
/* eslint-disable no-underscore-dangle */
import React from 'react'
import stream from 'stream'

import { IS_BROWSER, SC_STREAM_ATTR } from '../constants'
import StyleSheet from './StyleSheet'
import StyleSheetManager from './StyleSheetManager'

declare var __SERVER__: boolean

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
  instance: StyleSheet

  constructor() {
    this.instance = StyleSheet.master.clone()
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

    return this.instance.toHTML()
  }

  getStyleElement() {
    if (!this.closed) {
      this.closed = true
    }

    return this.instance.toReactElements()
  }

  interleaveWithNodeStream(readableStream: stream.Readable) {
    if (!__SERVER__ || IS_BROWSER) {
      throw new Error(streamBrowserErr)
    }

    /* the tag index keeps track of which tags have already been emitted */
    const { instance } = this
    let instanceTagIndex = 0

    const streamAttr = `${SC_STREAM_ATTR}="true"`
    const ourStream = new stream.Readable()
    // $FlowFixMe
    ourStream._read = () => {}

    readableStream.on('data', chunk => {
      const { tags } = instance
      let html = ''

      /* retrieve html for each new style tag */
      for (; instanceTagIndex < tags.length; instanceTagIndex += 1) {
        const tag = tags[instanceTagIndex]
        html += tag.toHTML(streamAttr)
      }

      /* force our StyleSheets to emit entirely new tags */
      instance.sealAllTags()
      /* prepend style html to chunk */
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
