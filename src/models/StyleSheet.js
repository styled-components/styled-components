// @flow

import { cloneElement } from 'react'
import { IS_BROWSER, DISABLE_SPEEDY, SC_ATTR } from '../constants'
import { makeTag, makeRehydrationTag, type Tag } from './StyleTags'
import extractComps from '../utils/extractCompsFromCSS'

/* determine the maximum number of components before tags are sharded */
let MAX_SIZE
if (IS_BROWSER) {
  /* in speedy mode we can keep a lot more rules in a sheet before a slowdown can be expected */
  MAX_SIZE = DISABLE_SPEEDY ? 40 : 1000
} else {
  /* for servers we do not need to shard at all */
  MAX_SIZE = -1
}

let sheetRunningId = 0
let global

class StyleSheet {
  id: number
  sealed: boolean
  forceServer: boolean
  target: ?HTMLElement
  tagMap: { [string]: Tag<any> }
  hashes: { [string]: string }
  deferred: { [string]: string[] }
  rehydratedNames: { [string]: boolean }
  tags: Tag<any>[]
  capacity: number
  clones: StyleSheet[]

  constructor(
    target: ?HTMLElement = IS_BROWSER ? document.head : null,
    forceServer?: boolean = false
  ) {
    this.id = sheetRunningId += 1
    this.sealed = false
    this.forceServer = forceServer
    this.target = forceServer ? null : target
    this.tagMap = {}
    this.hashes = {}
    this.deferred = {}
    this.rehydratedNames = {}
    this.tags = []
    this.capacity = 1
    this.clones = []
  }

  /* rehydrate all SSR'd style tags */
  rehydrate() {
    if (!IS_BROWSER || this.forceServer) {
      return this
    }

    const els = []
    const names = []
    let extracted = []

    /* retrieve all of our SSR style elements from the DOM */
    const nodes = document.querySelectorAll(`style[${SC_ATTR}]`)
    const nodesSize = nodes.length

    for (let i = 0; i < nodesSize; i += 1) {
      // $FlowFixMe: We can trust that all elements in this query are style elements
      const el = (nodes[i]: HTMLStyleElement)

      /* retrieve all component names */
      const elNames = (el.getAttribute(SC_ATTR) || '').trim().split(/\s+/)
      const elNamesSize = elNames.length
      for (let j = 0; j < elNamesSize; j += 1) {
        const name = elNames[j]
        /* add rehydrated name to sheet to avoid readding styles */
        this.rehydratedNames[name] = true
        names.push(name)
      }

      /* extract all components and their CSS */
      extracted = extracted.concat(extractComps(el.textContent))
      /* store original HTMLStyleElement */
      els.push(el)
    }

    /* use initial sheet tag for rehydration */
    const tag = makeTag(this.target, null, this.forceServer)
    const rehydrationTag = makeRehydrationTag(tag, els, extracted, names)

    this.tags = [rehydrationTag]
    this.capacity = MAX_SIZE

    /* retrieve all component ids */
    const extractedSize = extracted.length
    for (let j = 0; j < extractedSize; j += 1) {
      this.tagMap[extracted[j].componentId] = rehydrationTag
    }

    return this
  }

  /* retrieve a "global" instance of StyleSheet which is typically used when no other is available */
  static get global(): StyleSheet {
    return global || (global = new StyleSheet().rehydrate())
  }

  /* NOTE: This is just for backwards-compatibility with jest-styled-components */
  static get instance(): StyleSheet {
    return StyleSheet.global
  }

  /* reset the internal "global" instance */
  static reset(forceServer?: boolean = false) {
    global = new StyleSheet(undefined, forceServer).rehydrate()
  }

  /* adds "children" to the StyleSheet that inherit all of the parents' rules
   * while their own rules do not affect the parent */
  clone() {
    const sheet = new StyleSheet(this.target, this.forceServer)
    /* add to clone array */
    this.clones.push(sheet)

    /* clone all tags */
    sheet.tags = this.tags.map(tag => {
      const ids = tag.getIds()
      const newTag = tag.clone()

      /* reconstruct tagMap */
      for (let i = 0; i < ids.length; i += 1) {
        sheet.tagMap[ids[i]] = newTag
      }

      return newTag
    })

    /* clone other maps */
    sheet.rehydratedNames = { ...this.rehydratedNames }
    sheet.deferred = { ...this.deferred }
    sheet.hashes = { ...this.hashes }

    return sheet
  }

  /* force StyleSheet to create a new tag on the next injection */
  sealAllTags() {
    this.capacity = 1
    this.sealed = true
  }

  /* get a tag for a given componentId, assign the componentId to one, or shard */
  getTagForId(id: string): Tag<any> {
    /* simply return a tag, when the componentId was already assigned one */
    const prev = this.tagMap[id]
    if (prev !== undefined && !this.sealed) {
      return prev
    }

    let tag = this.tags[this.tags.length - 1]

    /* shard (create a new tag) if the tag is exhausted (See MAX_SIZE) */
    this.capacity -= 1
    if (this.capacity === 0) {
      this.capacity = MAX_SIZE
      this.sealed = false
      tag = makeTag(this.target, tag ? tag.styleTag : null, this.forceServer)
      this.tags.push(tag)
    }

    return (this.tagMap[id] = tag)
  }

  /* optimal caching: hash is known and name can be returned */
  getNameForHash(hash: string) {
    return this.hashes[hash]
  }

  /* rehydration check: name is known, hash is unknown, but styles are present */
  alreadyInjected(hash: any, name: string) {
    if (!this.rehydratedNames[name]) return false

    this.hashes[hash] = name
    return true
  }

  /* checks whether component is already registered */
  hasInjectedComponent(id: string): boolean {
    return !!this.tagMap[id]
  }

  /* registers a componentId and registers it on its tag */
  deferredInject(id: string, cssRules: string[]) {
    const { clones } = this
    for (let i = 0; i < clones.length; i += 1) {
      clones[i].deferredInject(id, cssRules)
    }

    this.getTagForId(id).insertMarker(id)
    this.deferred[id] = cssRules
  }

  inject(id: string, cssRules: string[], hash?: string, name?: string) {
    const { clones } = this
    for (let i = 0; i < clones.length; i += 1) {
      clones[i].inject(id, cssRules, hash, name)
    }

    /* add deferred rules for component */
    let injectRules = cssRules
    const deferredRules = this.deferred[id]
    if (deferredRules !== undefined) {
      injectRules = deferredRules.concat(injectRules)
      delete this.deferred[id]
    }

    const tag = this.getTagForId(id)
    tag.insertRules(id, injectRules)

    if (hash && name) {
      tag.names.push(name)
      this.hashes[hash] = name
    }
  }

  toHTML() {
    return this.tags.map(tag => tag.toHTML()).join('')
  }

  toReactElements() {
    const { id } = this

    return this.tags.map((tag, i) => {
      const key = `sc-${id}-${i}`
      return cloneElement(tag.toElement(), { key })
    })
  }
}

export default StyleSheet
