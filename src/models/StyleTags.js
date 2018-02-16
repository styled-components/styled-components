// @flow
/* eslint-disable flowtype/object-type-delimiter */
/* eslint-disable react/prop-types */

import React from 'react'
import { IS_BROWSER, DISABLE_SPEEDY, SC_ATTR } from '../constants'
import { type ExtractedComp } from '../utils/extractCompsFromCSS'
import { splitByRules } from '../utils/stringifyRules'
import getNonce from '../utils/nonce'
import once from '../utils/once'

import {
  type Names,
  addNameForId,
  resetIdNames,
  hasNameForId,
  stringifyNames,
  cloneNames,
} from '../utils/styleNames'

import {
  sheetForTag,
  safeInsertRules,
  deleteRules,
} from '../utils/insertRuleHelpers'

export interface Tag<T> {
  // $FlowFixMe: Doesn't seem to accept any combination w/ HTMLStyleElement for some reason
  styleTag: HTMLStyleElement | null;
  /* lists all ids of the tag */
  getIds(): string[];
  /* checks whether `name` is already injected for `id` */
  hasNameForId(id: string, name: string): boolean;
  /* inserts a marker to ensure the id's correct position in the sheet */
  insertMarker(id: string): T;
  /* inserts rules according to the ids markers */
  insertRules(id: string, cssRules: string[], name: ?string): void;
  /* removes all rules belonging to the id, keeping the marker around */
  removeRules(id: string): void;
  css(): string;
  toHTML(additionalAttrs: ?string): string;
  toElement(): React.Element<*>;
  clone(): Tag<T>;
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

/* takes a css factory function and outputs an html styled tag factory */
const wrapAsHtmlTag = (css: () => string, names: Names) => (
  additionalAttrs: ?string
): string => {
  const nonce = getNonce()
  const attrs = [
    nonce && `nonce="${nonce}"`,
    `${SC_ATTR}="${stringifyNames(names)}"`,
    additionalAttrs,
  ]

  const htmlAttr = attrs.filter(Boolean).join(' ')
  return `<style type="text/css" ${htmlAttr}>${css()}</style>`
}

/* takes a css factory function and outputs an element factory */
const wrapAsElement = (css: () => string, names: Names) => () => {
  const props = {
    type: 'text/css',
    [SC_ATTR]: stringifyNames(names),
  }

  const nonce = getNonce()
  if (nonce) {
    // $FlowFixMe
    props.nonce = nonce
  }

  return <style {...props}>{css()}</style>
}

const getIdsFromMarkersFactory = (markers: Object) => (): string[] =>
  Object.keys(markers)

/* speedy tags utilise insertRule */
const makeSpeedyTag = (el: HTMLStyleElement): Tag<number> => {
  const names: Names = Object.create(null)
  const markers = Object.create(null)
  const sizes: number[] = []

  const insertMarker = id => {
    const prev = markers[id]
    if (prev !== undefined) {
      return prev
    }

    const marker = (markers[id] = sizes.length)
    sizes.push(0)
    resetIdNames(names, id)
    return marker
  }

  const insertRules = (id, cssRules, name) => {
    const marker = insertMarker(id)
    const sheet = sheetForTag(el)
    const insertIndex = addUpUntilIndex(sizes, marker)
    sizes[marker] += safeInsertRules(sheet, cssRules, insertIndex)
    addNameForId(names, id, name)
  }

  const removeRules = id => {
    const marker = markers[id]
    if (marker === undefined) return

    const size = sizes[marker]
    const sheet = sheetForTag(el)
    const removalIndex = addUpUntilIndex(sizes, marker)
    deleteRules(sheet, removalIndex, size)
    sizes[marker] = 0
    resetIdNames(names, id)
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
    hasNameForId: hasNameForId(names),
    insertMarker,
    insertRules,
    removeRules,
    css,
    toHTML: wrapAsHtmlTag(css, names),
    toElement: wrapAsElement(css, names),
    clone: throwCloneTagErr,
  }
}

const makeBrowserTag = (el: HTMLStyleElement): Tag<Text> => {
  const names = Object.create(null)
  const markers = Object.create(null)

  const makeTextNode = id => document.createTextNode(makeTextMarker(id))

  const insertMarker = id => {
    const prev = markers[id]
    if (prev !== undefined) {
      return prev
    }

    const marker = (markers[id] = makeTextNode(id))
    el.appendChild(marker)
    names[id] = Object.create(null)
    return marker
  }

  const insertRules = (id, cssRules, name) => {
    insertMarker(id).appendData(cssRules.join(' '))
    addNameForId(names, id, name)
  }

  const removeRules = id => {
    const marker = markers[id]
    if (marker === undefined) return
    /* create new empty text node and replace the current one */
    const newMarker = makeTextNode(id)
    el.replaceChild(newMarker, marker)
    markers[id] = newMarker
    resetIdNames(names, id)
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
    hasNameForId: hasNameForId(names),
    insertMarker,
    insertRules,
    removeRules,
    css,
    toHTML: wrapAsHtmlTag(css, names),
    toElement: wrapAsElement(css, names),
    clone: throwCloneTagErr,
  }
}

const makeServerTag = (): Tag<[string]> => {
  const names = Object.create(null)
  const markers = Object.create(null)

  const insertMarker = id => {
    const prev = markers[id]
    if (prev !== undefined) {
      return prev
    }

    return (markers[id] = [''])
  }

  const insertRules = (id, cssRules, name) => {
    const marker = insertMarker(id)
    marker[0] += cssRules.join(' ')
    addNameForId(names, id, name)
  }

  const removeRules = id => {
    const marker = markers[id]
    if (marker === undefined) return
    marker[0] = ''
    resetIdNames(names, id)
  }

  const css = () => {
    let str = ''
    // eslint-disable-next-line guard-for-in
    for (const id in markers) {
      const cssForId = markers[id][0]
      if (cssForId) {
        str += makeTextMarker(id) + cssForId
      }
    }
    return str
  }

  const tag = {
    styleTag: null,
    getIds: getIdsFromMarkersFactory(markers),
    hasNameForId: hasNameForId(names),
    insertMarker,
    insertRules,
    removeRules,
    css,
    toHTML: wrapAsHtmlTag(css, names),
    toElement: wrapAsElement(css, names),
    clone() {
      return {
        ...tag,
        names: cloneNames(names),
        markers: { ...markers },
      }
    },
  }

  return tag
}

export const makeTag = (
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

/* wraps a given tag so that rehydration is performed once when necessary */
export const makeRehydrationTag = (
  tag: Tag<any>,
  els: HTMLStyleElement[],
  extracted: ExtractedComp[],
  names: string[],
  immediateRehydration: boolean
): Tag<any> => {
  /* rehydration function that adds all rules to the new tag */
  const rehydrate = once(() => {
    /* add all extracted components to the new tag */
    for (let i = 0; i < extracted.length; i += 1) {
      const { componentId, cssFromDOM } = extracted[i]
      const cssRules = splitByRules(cssFromDOM)
      tag.insertRules(componentId, cssRules)
    }

    /* remove old HTMLStyleElements, since they have been rehydrated */
    for (let i = 0; i < els.length; i += 1) {
      const el = els[i]
      if (el.parentNode) {
        el.parentNode.removeChild(el)
      }
    }
  })

  if (immediateRehydration) rehydrate()

  return {
    ...tag,
    /* add rehydration hook to insertion methods */
    insertMarker: id => {
      rehydrate()
      return tag.insertMarker(id)
    },
    insertRules: (id, cssRules, name) => {
      rehydrate()
      return tag.insertRules(id, cssRules, name)
    },
  }
}
