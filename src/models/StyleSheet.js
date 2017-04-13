// @flow
import BrowserStyleSheet from './BrowserStyleSheet'
import ServerStyleSheet from './ServerStyleSheet'

export const SC_ATTR = 'data-styled-components'
export const LOCAL_ATTR = 'data-styled-components-is-local'

export interface Tag {
  isLocal: boolean,
  components: Map<string, Object>,

  isFull(): boolean,
  inject(componentId: string, css: string, name: ?string): void,
  toHTML(): string,
  clone(): Tag,
}

let instance = null
export default class StyleSheet {
  tagConstructor: (boolean) => Tag
  tags: Array<Tag>
  names: Set<string>
  hashes: Map<string, string>
  componentTags: Map<string, Tag>

  constructor(tagConstructor: (boolean) => Tag,
    tags: Array<Tag> = [],
    names: Set<string> = new Set(),
    hashes: Map<string, string> = new Map()) {
    this.tagConstructor = tagConstructor
    this.tags = tags
    this.names = names
    this.hashes = hashes
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

  inject(componentId: string, isLocal: boolean, css: string, hash: ?any, name: ?string) {
    this.getTag(componentId, isLocal).inject(componentId, css, name)
    if (hash && name) this.hashes.set(hash.toString(), name)
  }

  toHTML() {
    return this.tags.map(tag => tag.toHTML()).join('')
  }

  getTag(componentId: string, isLocal: boolean) {
    const existingTag = this.componentTags.get(componentId)
    if (existingTag) return existingTag

    const lastTag = this.tags[this.tags.length - 1]
    const componentTag = (!lastTag || lastTag.isFull() || lastTag.isLocal !== isLocal)
      ? this.createNewTag(isLocal)
      : lastTag
    this.componentTags.set(componentId, componentTag)
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

  static create(isServer: ?boolean = typeof document === 'undefined') {
    return (isServer ? ServerStyleSheet : BrowserStyleSheet).create()
  }

  static clone(oldSheet: StyleSheet) {
    const newSheet = new StyleSheet(
      oldSheet.tagConstructor,
      oldSheet.tags.map(tag => tag.clone()),
      new Set(oldSheet.names),
      new Map(oldSheet.hashes),
    )
    return newSheet
  }
}
