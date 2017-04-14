// @flow
import BrowserStyleSheet from './BrowserStyleSheet'
import ServerStyleSheet from './ServerStyleSheet'

export const SC_ATTR = 'data-styled-components'
export const LOCAL_ATTR = 'data-styled-components-is-local'

export interface Tag {
  isLocal: boolean,
  components: Map<string, Object>,

  isFull(): boolean,
  addComponent(componentId: string): void,
  inject(componentId: string, css: string, name: ?string): void,
  toHTML(): string,
  clone(): Tag,
}

let instance = null
// eslint-disable-next-line no-use-before-define
export const clones: Set<StyleSheet> = new Set()

export default class StyleSheet {
  tagConstructor: (boolean) => Tag
  tags: Array<Tag>
  names: Set<string>
  hashes: Map<string, string> = new Map()
  deferredInjections: Map<string, string> = new Map()
  componentTags: Map<string, Tag>

  constructor(tagConstructor: (boolean) => Tag,
    tags: Array<Tag> = [],
    names: Set<string> = new Set()) {
    this.tagConstructor = tagConstructor
    this.tags = tags
    this.names = names
    this.constructComponentTagMap()
  }

  constructComponentTagMap() {
    this.componentTags = new Map()
    this.tags.forEach(tag =>
      tag.components.forEach(comp =>
        this.componentTags.set(comp.componentId, tag)))
  }

  /* Best level of caching—get the name from the hash straight away. */
  getName(hash: any) {
    return this.hashes.get(hash.toString())
  }

  /* Second level of caching—if the name is already in the dom, don't
   * inject anything and record the hash for getName next time. */
  alreadyInjected(hash: any, name: string) {
    if (!this.names.has(name)) return false

    this.hashes.set(hash.toString(), name)
    return true
  }

  /* Third type of caching—don't inject components' componentId twice. */
  hasInjectedComponent(componentId: string) {
    return !!this.componentTags.get(componentId)
  }

  deferredInject(componentId: string, isLocal: boolean, css: string) {
    if (this === instance) {
      clones.forEach(clone =>
      clone.deferredInject(componentId, isLocal, css))
    }

    this.getOrCreateTag(componentId, isLocal)
    this.deferredInjections.set(componentId, css)
  }

  inject(componentId: string, isLocal: boolean, css: string, hash: ?any, name: ?string) {
    if (this === instance) {
      clones.forEach(clone =>
      clone.inject(componentId, isLocal, css))
    }

    const tag = this.getOrCreateTag(componentId, isLocal)

    const deferredInjection = this.deferredInjections.get(componentId)
    if (deferredInjection) {
      tag.inject(componentId, deferredInjection)
      this.deferredInjections.delete(componentId)
    }

    tag.inject(componentId, css, name)
    if (hash && name) this.hashes.set(hash.toString(), name)
  }

  toHTML() {
    return this.tags.map(tag => tag.toHTML()).join('')
  }

  getOrCreateTag(componentId: string, isLocal: boolean) {
    const existingTag = this.componentTags.get(componentId)
    if (existingTag) return existingTag

    const lastTag = this.tags[this.tags.length - 1]
    const componentTag = (!lastTag || lastTag.isFull() || lastTag.isLocal !== isLocal)
      ? this.createNewTag(isLocal)
      : lastTag
    this.componentTags.set(componentId, componentTag)
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
      new Set(oldSheet.names),
    )
    newSheet.hashes = new Map(oldSheet.hashes)
    newSheet.deferredInjections = new Map(oldSheet.deferredInjections)
    clones.add(newSheet)
    return newSheet
  }
}
