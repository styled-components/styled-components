// @flow

import { cloneElement } from 'react'
import {
  IS_BROWSER,
  DISABLE_SPEEDY,
  SC_ATTR,
  SC_STREAM_ATTR,
} from '../constants'
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
let master

class StyleSheet {
  id: number
  sealed: boolean
  forceServer: boolean
  target: ?HTMLElement
  /* a map from ids to tags */
  tagMap: { [string]: Tag<any> }
  /* deferred rules for a given id */
  deferred: { [string]: string[] }
  /* this is used for not reinjecting rules via hasNameForId() */
  rehydratedNames: { [string]: boolean }
  /* when rules for an id are removed using remove() we have to ignore rehydratedNames for it */
  ignoreRehydratedNames: { [string]: boolean }
  /* a list of tags belonging to this StyleSheet */
  tags: Tag<any>[]
  /* a tag for import rules */
  importRuleTag: Tag<any>
  /* current capacity until a new tag must be created */
  capacity: number
  /* children (aka clones) of this StyleSheet inheriting all and future injections */
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
    this.deferred = {}
    this.rehydratedNames = {}
    this.ignoreRehydratedNames = {}
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
    let isStreamed = false

    /* retrieve all of our SSR style elements from the DOM */
    const nodes = document.querySelectorAll(`style[${SC_ATTR}]`)
    const nodesSize = nodes.length

    /* abort rehydration if no previous style tags were found */
    if (nodesSize === 0) {
      return this
    }

    for (let i = 0; i < nodesSize; i += 1) {
      // $FlowFixMe: We can trust that all elements in this query are style elements
      const el = (nodes[i]: HTMLStyleElement)

      /* check if style tag is a streamed tag */
      isStreamed = !!el.getAttribute(SC_STREAM_ATTR) || isStreamed

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

    /* abort rehydration if nothing was extracted */
    const extractedSize = extracted.length
    if (extractedSize === 0) {
      return this
    }

    /* create a tag to be used for rehydration */
    const tag = this.makeTag(null)
    const rehydrationTag = makeRehydrationTag(
      tag,
      els,
      extracted,
      names,
      isStreamed
    )

    /* reset capacity and adjust MAX_SIZE by the initial size of the rehydration */
    this.capacity = Math.max(1, MAX_SIZE - extractedSize)
    this.tags.push(rehydrationTag)

    /* retrieve all component ids */
    for (let j = 0; j < extractedSize; j += 1) {
      this.tagMap[extracted[j].componentId] = rehydrationTag
    }

    return this
  }

  /* retrieve a "master" instance of StyleSheet which is typically used when no other is available
   * The master StyleSheet is targeted by injectGlobal, keyframes, and components outside of any
    * StyleSheetManager's context */
  static get master(): StyleSheet {
    return master || (master = new StyleSheet().rehydrate())
  }

  /* NOTE: This is just for backwards-compatibility with jest-styled-components */
  static get instance(): StyleSheet {
    return StyleSheet.master
  }

  /* reset the internal "master" instance */
  static reset(forceServer?: boolean = false) {
    master = new StyleSheet(undefined, forceServer).rehydrate()
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

    return sheet
  }

  /* force StyleSheet to create a new tag on the next injection */
  sealAllTags() {
    this.capacity = 1
    this.sealed = true
  }

  makeTag(tag: ?Tag<any>): Tag<any> {
    const lastEl = tag ? tag.styleTag : null
    const insertBefore = false

    return makeTag(
      this.target,
      lastEl,
      this.forceServer,
      insertBefore,
      this.getImportRuleTag
    )
  }

  getImportRuleTag = (): Tag<any> => {
    const { importRuleTag } = this
    if (importRuleTag !== undefined) {
      return importRuleTag
    }

    const firstTag = this.tags[0]
    const insertBefore = true

    return (this.importRuleTag = makeTag(
      this.target,
      firstTag ? firstTag.styleTag : null,
      this.forceServer,
      insertBefore
    ))
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
      tag = this.makeTag(tag)
      this.tags.push(tag)
    }

    return (this.tagMap[id] = tag)
  }

  /* mainly for injectGlobal to check for its id */
  hasId(id: string) {
    return this.tagMap[id] !== undefined
  }

  /* caching layer checking id+name to already have a corresponding tag and injected rules */
  hasNameForId(id: string, name: string) {
    /* exception for rehydrated names which are checked separately */
    if (
      this.ignoreRehydratedNames[id] === undefined &&
      this.rehydratedNames[name]
    ) {
      return true
    }

    const tag = this.tagMap[id]
    return tag !== undefined && tag.hasNameForId(id, name)
  }

  /* registers a componentId and registers it on its tag */
  deferredInject(id: string, cssRules: string[]) {
    /* don't inject when the id is already registered */
    if (this.tagMap[id] !== undefined) return

    const { clones } = this
    for (let i = 0; i < clones.length; i += 1) {
      clones[i].deferredInject(id, cssRules)
    }

    this.getTagForId(id).insertMarker(id)
    this.deferred[id] = cssRules
  }

  /* injects rules for a given id with a name that will need to be cached */
  inject(id: string, cssRules: string[], name?: string) {
    const { clones } = this
    for (let i = 0; i < clones.length; i += 1) {
      clones[i].inject(id, cssRules, name)
    }

    /* add deferred rules for component */
    let injectRules = cssRules
    const deferredRules = this.deferred[id]
    if (deferredRules !== undefined) {
      injectRules = deferredRules.concat(injectRules)
      delete this.deferred[id]
    }

    const tag = this.getTagForId(id)
    tag.insertRules(id, injectRules, name)
  }

  /* removes all rules for a given id, which doesn't remove its marker but resets it */
  remove(id: string) {
    const tag = this.tagMap[id]
    if (tag === undefined) return

    const { clones } = this
    for (let i = 0; i < clones.length; i += 1) {
      clones[i].remove(id)
    }

    /* remove all rules from the tag */
    tag.removeRules(id)
    /* ignore possible rehydrated names */
    this.ignoreRehydratedNames[id] = true
    /* delete possible deferred rules */
    delete this.deferred[id]
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
