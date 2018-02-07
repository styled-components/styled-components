// @flow
/* eslint-disable flowtype/object-type-delimiter */

import React, { cloneElement } from 'react'
import extractComps, { type ExtractedComp } from '../utils/extractCompsFromCSS'
import stringifyRules from '../utils/stringifyRules'
import getNonce from '../utils/nonce'

export const SC_ATTR = 'data-styled-components'
export const CONTEXT_KEY = '__styled-components-stylesheet__'

declare var __DEV__: ?string

const IS_BROWSER = typeof window !== 'undefined'

const DISABLE_SPEEDY =
  (typeof __DEV__ === 'boolean' && __DEV__) ||
  process.env.NODE_ENV !== 'production'

/* determine the maximum number of components before tags are sharded */
let MAX_SIZE
if (IS_BROWSER) {
  /* in speedy mode we can keep a lot more rules in a sheet before a slowdown can be expected */
  MAX_SIZE = DISABLE_SPEEDY ? 40 : 1000
} else {
  /* for servers we do not need to shard at all */
  MAX_SIZE = -1
}

/* this error is used for makeStyleTag */
const parentNodeUnmountedErr =
  process.env.NODE_ENV !== 'production'
    ? `
Trying to insert a new style tag, but the given Node is unmounted!
- Are you using a custom target that isn't mounted?
- Does your document not have a valid head element?
- Have you accidentally removed a style tag manually?
`.trim()
    : ''

/* this error is used for tags */
const throwCloneTagErr = () => {
  throw new Error(
    process.env.NODE_ENV !== 'production'
      ? `
The clone method cannot be used on the client!
- Are you running in a client-like environment on the server?
- Are you trying to run SSR on the client?
`.trim()
      : ''
  )
}

/* this marker separates component styles and is important for rehydration */
const makeTextMarker = id => `\n/* sc-component-id: ${id} */\n`

/* access last item in array (used to get the latest tag) */
const last = <T>(arr: T[]): T => arr[arr.length - 1]

/* retrieve a sheet for a given style tag */
const sheetForTag = (tag: HTMLStyleElement): CSSStyleSheet => {
  // $FlowFixMe
  if (tag.sheet) return tag.sheet

  /* Firefox quirk requires us to step through all stylesheets to find one owned by the given tag */
  const size = document.styleSheets.length
  for (let i = 0; i < size; i += 1) {
    const sheet = document.styleSheets[i]
    // $FlowFixMe
    if (sheet.ownerNode === tag) return sheet
  }

  /* we should always be able to find a tag */
  throw new Error()
}

/* insert a rule safely and return whether it was actually injected */
const safeInsertRule = (
  sheet: CSSStyleSheet,
  cssRule: string,
  index: number
): boolean => {
  /* abort early if cssRule string is falsy */
  if (!cssRule) return false

  const maxIndex = sheet.cssRules.length

  try {
    /* use insertRule and cap passed index with maxIndex (no of cssRules) */
    sheet.insertRule(cssRule, index <= maxIndex ? index : maxIndex)
  } catch (err) {
    /* any error indicates an invalid rule */
    return false
  }

  return true
}

/* insert multiple rules using safeInsertRule */
const safeInsertRules = (
  sheet: CSSStyleSheet,
  cssRules: string[],
  insertIndex: number
): number => {
  /* inject each rule and count up the number of actually injected ones */
  let injectedRules = 0
  const cssRulesSize = cssRules.length
  for (let i = 0; i < cssRulesSize; i += 1) {
    const cssRule = cssRules[i]
    if (safeInsertRule(sheet, cssRule, insertIndex + injectedRules)) {
      injectedRules += 1
    }
  }

  /* return number of injected rules */
  return injectedRules
}

/* add up all numbers in array up until and including the index */
const addUpUntilIndex = (sizes: number[], index: number): number => {
  let totalUpToIndex = 0
  for (let i = 0; i <= index; i += 1) {
    totalUpToIndex += sizes[i]
  }

  return totalUpToIndex
}

/* create a new style tag after lastEl */
const makeStyleTag = (target: ?HTMLElement, lastTag: ?Node) => {
  const el = document.createElement('style')
  el.type = 'text/css'
  el.setAttribute(SC_ATTR, '')

  const nonce = getNonce()
  if (nonce) {
    el.setAttribute('nonce', nonce)
  }

  /* Work around insertRule quirk in EdgeHTML */
  el.appendChild(document.createTextNode(''))

  if (target && !lastTag) {
    /* Append to target when no previous element was passed */
    target.appendChild(el)
  } else {
    if (!lastTag || !target || !lastTag.parentNode) {
      throw new Error(parentNodeUnmountedErr)
    }

    /* Insert new style tag after the previous one */
    lastTag.parentNode.insertBefore(el, lastTag.nextSibling)
  }

  return el
}

interface Tag<T> {
  // $FlowFixMe: Doesn't seem to accept any combination w/ HTMLStyleElement for some reason
  styleTag: HTMLStyleElement | null;
  names: string[];
  getIds(): string[];
  insertMarker(id: string): T;
  insertRules(id: string, cssRules: string[]): void;
  css(): string;
  toHTML(): string;
  toElement(): React.Element<*>;
  clone(): Tag<T>;
}

/* takes a css factory function and outputs an html styled tag factory */
const wrapAsHtmlTag = (css: () => string, names: string[]) => (): string =>
  `<style type="text/css" ${SC_ATTR}="${names.join(' ')}">${css()}</style>`

/* takes a css factory function and outputs an element factory */
const wrapAsElement = (css: () => string, names: string[]) => () => {
  const props = {
    type: 'text/css',
    [SC_ATTR]: names.join(' '),
  }

  return <style {...props}>{css()}</style>
}

const getIdsFromMarkersFactory = (markers: Object) => (): string[] =>
  Object.keys(markers)

/* speedy tags utilise insertRule */
const makeSpeedyTag = (el: HTMLStyleElement): Tag<number> => {
  const markers = Object.create(null)
  const sizes = []
  const names = []

  const insertMarker = id => {
    const prev = markers[id]
    if (prev !== undefined) {
      return prev
    }

    const marker = (markers[id] = sizes.length)
    sizes.push(0)
    return marker
  }

  const insertRules = (id, cssRules) => {
    const marker = insertMarker(id)
    const sheet = sheetForTag(el)
    const insertIndex = addUpUntilIndex(sizes, marker)
    sizes[marker] += safeInsertRules(sheet, cssRules, insertIndex)
  }

  const css = () => {
    const { cssRules } = sheetForTag(el)
    let str = ''
    let i = 0

    // eslint-disable-next-line guard-for-in
    for (const id in markers) {
      str += makeTextMarker(id)
      const end = markers[id] + i
      for (; i < end; i += 1) {
        str += cssRules[i].cssText
      }
    }

    return str
  }

  return {
    styleTag: el,
    getIds: getIdsFromMarkersFactory(markers),
    names,
    insertMarker,
    insertRules,
    css,
    toHTML: wrapAsHtmlTag(css, names),
    toElement: wrapAsElement(css, names),
    clone: throwCloneTagErr,
  }
}

const makeBrowserTag = (el: HTMLStyleElement): Tag<Text> => {
  const markers = Object.create(null)
  const names = []

  const insertMarker = id => {
    const prev = markers[id]
    if (prev !== undefined) {
      return prev
    }

    const marker = (markers[id] = document.createTextNode(makeTextMarker(id)))
    el.appendChild(marker)
    return marker
  }

  const insertRules = (id, cssRules) => {
    insertMarker(id).appendData(cssRules.join(' '))
  }

  const css = () => {
    let str = ''
    // eslint-disable-next-line guard-for-in
    for (const id in markers) {
      str += markers[id].data
    }
    return str
  }

  return {
    styleTag: el,
    getIds: getIdsFromMarkersFactory(markers),
    names,
    insertMarker,
    insertRules,
    css,
    toHTML: wrapAsHtmlTag(css, names),
    toElement: wrapAsElement(css, names),
    clone: throwCloneTagErr,
  }
}

const makeServerTag = (): Tag<[string]> => {
  const markers = Object.create(null)
  const names = []

  const insertMarker = id => {
    const prev = markers[id]
    if (prev !== undefined) {
      return prev
    }

    return (markers[id] = [makeTextMarker(id)])
  }

  const insertRules = (id, cssRules) => {
    const marker = insertMarker(id)
    marker[0] += cssRules.join(' ')
  }

  const css = () => {
    let str = ''
    // eslint-disable-next-line guard-for-in
    for (const id in markers) {
      str += markers[id][0]
    }
    return str
  }

  const tag = {
    styleTag: null,
    getIds: getIdsFromMarkersFactory(markers),
    names,
    insertMarker,
    insertRules,
    css,
    toHTML: wrapAsHtmlTag(css, names),
    toElement: wrapAsElement(css, names),
    clone() {
      return {
        ...tag,
        names: [...names],
        markers: { ...markers },
      }
    },
  }

  return tag
}

const makeTag = (
  target: ?HTMLElement,
  lastEl: ?HTMLStyleElement,
  forceServer?: boolean
): Tag<any> => {
  if (IS_BROWSER && !forceServer) {
    const el = makeStyleTag(target, lastEl)
    if (DISABLE_SPEEDY) {
      return makeBrowserTag(el)
    } else {
      return makeSpeedyTag(el)
    }
  }

  return makeServerTag()
}

const makeRehydrationTag = (
  tag: Tag<any>,
  els: HTMLStyleElement[],
  extracted: ExtractedComp[],
  names: string[]
): Tag<any> => {
  let isReady = false

  /* rehydration function that adds all rules to the new tag */
  const rehydrate = () => {
    /* only rehydrate once */
    if (isReady) {
      return
    }

    /* add all extracted components to the new tag */
    for (let i = 0; i < extracted.length; i += 1) {
      const { componentId, cssFromDOM } = extracted[i]
      const cssRules = stringifyRules([cssFromDOM])
      tag.insertRules(componentId, cssRules)
    }

    /* remove old HTMLStyleElements, since they have been rehydrated */
    for (let i = 0; i < els.length; i += 1) {
      const el = els[i]
      if (el.parentNode) {
        el.parentNode.removeChild(el)
      }
    }

    isReady = true
  }

  return {
    ...tag,
    /* add rehydrated names to the new tag */
    names,
    /* add rehydration hook to insertion methods */
    insertMarker: id => {
      rehydrate()
      return tag.insertMarker(id)
    },
    insertRules: (id, cssRules) => {
      rehydrate()
      return tag.insertRules(id, cssRules)
    },
  }
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
    const firstTag = makeTag(target, null, forceServer)

    this.id = sheetRunningId += 1
    this.sealed = false
    this.forceServer = forceServer
    this.target = target
    this.tagMap = {}
    this.hashes = {}
    this.deferred = {}
    this.rehydratedNames = {}
    this.tags = [firstTag]
    this.capacity = MAX_SIZE
    this.clones = []
  }

  /* rehydrate all SSR'd style tags */
  rehydrate() {
    if (!IS_BROWSER) {
      return this
    }

    /* force sheet to create new tags for non-rehydrated components */
    this.capacity = 1

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
    const rehydrationTag = (this.tags[0] = makeRehydrationTag(
      this.tags[0],
      els,
      extracted,
      names
    ))

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

  /* reset the internal "global" instance */
  static reset(forceServer?: boolean = false) {
    global = new StyleSheet(undefined, forceServer).rehydrate()
  }

  /* adds "children" to the StyleSheet that inherit all of the parents' rules
   * while their own rules do not affect the parent */
  clone() {
    if (IS_BROWSER) {
      throwCloneTagErr()
    }

    const sheet = new StyleSheet(null, true)
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

    let tag = last(this.tags)

    /* shard (create a new tag) if the tag is exhausted (See MAX_SIZE) */
    this.capacity -= 1
    if (this.capacity === 0) {
      this.capacity = MAX_SIZE
      this.sealed = false
      // $FlowFixMe
      tag = makeTag(this.target, tag.styleTag, this.forceServer)
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
