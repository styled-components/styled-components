// @flow
import React from 'react'
import BrowserStyleSheet from './BrowserStyleSheet'
import ServerStyleSheet from './ServerStyleSheet'
import InMemoryTag from './InMemoryTag'

export const SC_ATTR = 'data-styled-components'
export const LOCAL_ATTR = 'data-styled-components-is-local'
export const CONTEXT_KEY = '__styled-components-stylesheet__'

let instance = null
// eslint-disable-next-line no-use-before-define
export const clones: Array<StyleSheet> = []

/* The StyleSheet provides a way of injecting components'
 * rules into a series of tags. Each tag will contain up
 * to, say, 40 components' worth of CSS. All tags here are
 * InMemoryTags but if we're in a browser they will also
 * create and maintain their own BrowserTag */
export default class StyleSheet {
  /* Runtime usage or SSR? */
  onBrowser: boolean
  /* A list of the current tags. May be provided by the
   * constructor in the case of rehydration */
  tags: Array<InMemoryTag>
  /* A record of the classnames that have been injected */
  names: { [string]: boolean }
  /* A record of the CSS hashes that have been injected.
   * In the case of rehydration, we know the hashes but
   * not the names, so we have to store both. */
  hashes: { [string]: string } = {}
  /* When a component is first constructed, we give it
   * its place in the set of Tags to preserve order, but
   * if it's never rendered we don't want to inject anything.
   * Deferring injections is how we handle that. */
  deferredInjections: { [string]: string } = {}
  /* A map of previously-seen components to Tags */
  componentTags: { [string]: InMemoryTag }
  /* When rendering, we flush all updates to the DOM at once,
   * and set dirty to false. Then, we can short-circuit all
   * the render calls by other components until more CSS is
   * added and the dirty flag gets set true. */
  dirty: boolean

  constructor(onBrowser: boolean,
    tags: Array<InMemoryTag> = [],
    names: { [string]: boolean } = {},
  ) {
    this.onBrowser = onBrowser
    this.tags = tags
    this.names = names
    this.constructComponentTagMap()
    this.dirty = true
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
    this.dirty = true
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

  flush() {
    if (!this.dirty) return
    this.tags.forEach(tag => tag.flush())
    this.dirty = false
  }

  toHTML() {
    return this.tags.map(tag => tag.toHTML()).join('')
  }

  toReactElements() {
    return this.tags.map((tag, i) => tag.toReactElement(`sc-${i}`))
  }

  getOrCreateTag(componentId: string, isLocal: boolean) {
    this.dirty = true
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
    this.dirty = true
    const newTag = new InMemoryTag(this.onBrowser, isLocal)
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
      oldSheet.onBrowser,
      oldSheet.tags.map(tag => tag.clone()),
      { ...oldSheet.names },
    )

    newSheet.hashes = { ...oldSheet.hashes }
    newSheet.deferredInjections = { ...oldSheet.deferredInjections }
    clones.push(newSheet)

    return newSheet
  }
}
