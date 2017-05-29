// @flow
import React from 'react'
import StyleSheet, { clones } from './StyleSheet'
import StyleSheetManager from './StyleSheetManager'

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
    return new StyleSheet(false)
  }
}
