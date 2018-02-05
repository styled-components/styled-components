// @flow
import React from 'react'
import BrowserStyleSheet from './BrowserStyleSheet'
import ServerStyleSheet from './ServerStyleSheet'

export const SC_ATTR = 'data-styled-components'
export const LOCAL_ATTR = 'data-styled-components-is-local'
export const CONTEXT_KEY = '__styled-components-stylesheet__'

/* eslint-disable flowtype/object-type-delimiter */
export interface Tag {
  isLocal: boolean;

  isSealed(): boolean;
  getComponentIds(): Array<string>;
  addComponent(componentId: string): void;
  inject(componentId: string, css: Array<string>, name: ?string): void;
  toHTML(): string;
  toReactElement(key: string): React.Element<*>;
  clone(): Tag;
}
/* eslint-enable flowtype/object-type-delimiter */

let instance = null
// eslint-disable-next-line no-use-before-define
export const clones: Array<StyleSheet> = []

const IS_BROWSER = typeof document !== 'undefined'

export default class StyleSheet {
  tagConstructor: boolean => Tag
  tags: Array<Tag>
  names: { [string]: boolean }
  hashes: { [string]: string } = {}
  deferredInjections: { [string]: Array<string> } = {}
  componentTags: { [string]: Tag }
  isStreaming: boolean

  // helper for `ComponentStyle` to know when it cache static styles.
  // staticly styled-component can not safely cache styles on the server
  // without all `ComponentStyle` instances saving a reference to the
  // the styleSheet instance they last rendered with,
  // or listening to creation / reset events. otherwise you might create
  // a component with one stylesheet and render it another api response
  // with another, losing styles on from your server-side render.
  stylesCacheable = IS_BROWSER

  constructor(
    tagConstructor: boolean => Tag,
    tags: Array<Tag> = [],
    names: { [string]: boolean } = {}
  ) {
    this.tagConstructor = tagConstructor
    this.tags = tags
    this.names = names
    this.constructComponentTagMap()
    this.isStreaming = false
  }

  constructComponentTagMap() {
    this.componentTags = {}

    this.tags.forEach(tag => {
      tag.getComponentIds().forEach(componentId => {
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

  deferredInject(componentId: string, isLocal: boolean, css: Array<string>) {
    if (this === instance) {
      clones.forEach(clone => {
        clone.deferredInject(componentId, isLocal, css)
      })
    }

    this.getOrCreateTag(componentId, isLocal)
    this.deferredInjections[componentId] = css
  }

  inject(
    componentId: string,
    isLocal: boolean,
    css: Array<string>,
    hash: ?any,
    name: ?string
  ) {
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

    /**
     * in a streaming context, once a tag is sealed it can never be added to again
     * or those styles will never make it to the client
     */
    if (
      existingTag && this.isStreaming ? !existingTag.isSealed() : existingTag
    ) {
      return existingTag
    }

    const lastTag = this.tags[this.tags.length - 1]
    const componentTag =
      !lastTag || lastTag.isSealed() || lastTag.isLocal !== isLocal
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
  static create(isServer: ?boolean = !IS_BROWSER) {
    return (isServer ? ServerStyleSheet : BrowserStyleSheet).create()
  }

  static clone(oldSheet: StyleSheet) {
    const newSheet = new StyleSheet(
      oldSheet.tagConstructor,
      oldSheet.tags.map(tag => tag.clone()),
      { ...oldSheet.names }
    )

    newSheet.hashes = { ...oldSheet.hashes }
    newSheet.deferredInjections = { ...oldSheet.deferredInjections }
    clones.push(newSheet)

    return newSheet
  }
}
