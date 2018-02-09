// @flow
/* eslint-disable flowtype/object-type-delimiter */
/* eslint-disable react/prop-types */

import React from 'react'
import { IS_BROWSER, DISABLE_SPEEDY, SC_ATTR } from '../constants'
import { type ExtractedComp } from '../utils/extractCompsFromCSS'
import { splitByRules } from '../utils/stringifyRules'
import getNonce from '../utils/nonce'

export interface Tag<T> {
  // $FlowFixMe: Doesn't seem to accept any combination w/ HTMLStyleElement for some reason
  styleTag: HTMLStyleElement | null;
  names: string[];
  getIds(): string[];
  insertMarker(id: string): T;
  insertRules(id: string, cssRules: string[]): void;
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

/* takes a css factory function and outputs an html styled tag factory */
const wrapAsHtmlTag = (css: () => string, names: string[]) => (
  additionalAttrs: ?string
): string => {
  const nonce = getNonce()
  const attrs = [
    nonce && `nonce="${nonce}"`,
    `${SC_ATTR}="${names.join(' ')}"`,
    additionalAttrs,
  ]

  const htmlAttr = attrs.filter(Boolean).join(' ')
  return `<style type="text/css" ${htmlAttr}>${css()}</style>`
}

/* takes a css factory function and outputs an element factory */
const wrapAsElement = (css: () => string, names: string[]) => () => {
  const props = {
    type: 'text/css',
    [SC_ATTR]: names.join(' '),
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

/* TODO: Turn into fully functional composition (tag.names) */
export const makeRehydrationTag = (
  tag: Tag<any>,
  els: HTMLStyleElement[],
  extracted: ExtractedComp[],
  names: string[],
  immediateRehydration: boolean
): Tag<any> => {
  let isReady = false

  /* rehydration function that adds all rules to the new tag */
  const rehydrate = () => {
    /* only rehydrate once */
    if (isReady) {
      return
    } else {
      isReady = true
    }

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
  }

  /* add rehydrated names to the new tag */
  for (let i = 0; i < names.length; i += 1) {
    tag.names.push(names[i])
  }

  if (immediateRehydration) {
    rehydrate()
  }

  return {
    ...tag,
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
