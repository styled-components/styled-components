// @flow
import React from 'react'
import BrowserStyleSheet from './BrowserStyleSheet'
import ServerStyleSheet from './ServerStyleSheet'

export const SC_ATTR = 'data-styled-components'
export const LOCAL_ATTR = 'data-styled-components-is-local'
export const CONTEXT_KEY = '__styled-components-stylesheet__'

export interface Tag {
  isLocal: boolean,
  components: { [string]: Object },

  isFull(): boolean,
  addComponent(componentId: string): void,
  inject(componentId: string, css: string, name: ?string): void,
  toHTML(): string,
  toReactElement(key: string): React.Element<*>,
  clone(): Tag,
}

let instance = null
// eslint-disable-next-line no-use-before-define
export const clones: Array<StyleSheet> = []

export default class StyleSheet {
  tagConstructor: (boolean) => Tag
  tags: Array<Tag>
  names: { [string]: boolean }
  hashes: { [string]: string } = {}
  deferredInjections: { [string]: string } = {}
  componentTags: { [string]: Tag }

  constructor(tagConstructor: (boolean) => Tag,
    tags: Array<Tag> = [],
    names: { [string]: boolean } = {},
  ) {
    this.tagConstructor = tagConstructor
    this.tags = tags
    this.names = names
    this.constructComponentTagMap()
  }

  constructComponentTagMap() {
    this.componentTags = {}

    this.tags.forEach(tag => {
      Object.keys(tag.components).forEach(componentId => {
        this.componentTags[componentId] = tag
      })
    })
  }

  /* Best level of caching—get the name from the hash straight away. */
  getName(hash: any) {
    return this.hashes[hash.toString()]
  }

  /* Second level of caching—if the name is already in the dom, don't
   * inject anything and record the hash for getName next time. */
  alreadyInjected(hash: any, name: string) {
    if (!this.names[name]) return false

    this.hashes[hash.toString()] = name
    return true
  }

  /* Third type of caching—don't inject components' componentId twice. */
  hasInjectedComponent(componentId: string) {
    return !!this.componentTags[componentId]
  }

  deferredInject(componentId: string, isLocal: boolean, css: string) {
    if (this === instance) {
      clones.forEach(clone => {
        clone.deferredInject(componentId, isLocal, css)
      })
    }

    this.getOrCreateTag(componentId, isLocal)
    this.deferredInjections[componentId] = css
  }

  inject(componentId: string, isLocal: boolean, css: string, hash: ?any, name: ?string) {
    if (this === instance) {
      clones.forEach(clone => {
        clone.inject(componentId, isLocal, css)
      })
    }

    const tag = this.getOrCreateTag(componentId, isLocal)

    const deferredInjection = this.deferredInjections[componentId]
    if (deferredInjection) {
      tag.inject(componentId, deferredInjection)
      delete this.deferredInjections[componentId]
    }

    tag.inject(componentId, css, name)

    if (hash && name) {
      this.hashes[hash.toString()] = name
    }
  }

  toHTML() {
    return this.tags.map(tag => tag.toHTML()).join('')
  }

  toReactElements() {
    return this.tags.map((tag, i) => tag.toReactElement(`sc-${i}`))
  }

  getOrCreateTag(componentId: string, isLocal: boolean) {
    const existingTag = this.componentTags[componentId]
    if (existingTag) {
      return existingTag
    }

    const lastTag = this.tags[this.tags.length - 1]
    const componentTag = (!lastTag || lastTag.isFull() || lastTag.isLocal !== isLocal)
      ? this.createNewTag(isLocal)
      : lastTag
    this.componentTags[componentId] = componentTag
    componentTag.addComponent(componentId)
    return componentTag
  }

  createNewTag(isLocal: boolean) {
    const newTag = this.tagConstructor(isLocal)
    this.tags.push(newTag)
    return newTag
  }

  static get instance() {
    return instance || (instance = StyleSheet.create())
  }

  static reset(isServer: ?boolean) {
    instance = StyleSheet.create(isServer)
  }

  /* We can make isServer totally implicit once Jest 20 drops and we
   * can change environment on a per-test basis. */
  static create(isServer: ?boolean = typeof document === 'undefined') {
    return (isServer ? ServerStyleSheet : BrowserStyleSheet).create()
  }

  static clone(oldSheet: StyleSheet) {
    const newSheet = new StyleSheet(
      oldSheet.tagConstructor,
      oldSheet.tags.map(tag => tag.clone()),
      { ...oldSheet.names },
    )

    newSheet.hashes = { ...oldSheet.hashes }
    newSheet.deferredInjections = { ...oldSheet.deferredInjections }
    clones.push(newSheet)

    return newSheet
  }
}
