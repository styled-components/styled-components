// @flow
import { Component } from 'react'

const cachedResults = new Map()

export default function isDerivedReactComponent(fn: any) {
  if (cachedResults.has(fn)) return cachedResults.get(fn)

  let target = fn

  while (target) {
    target = Object.getPrototypeOf(target)

    if (target && target === Component) {
      cachedResults.set(fn, true)
      return true
    }
  }

  cachedResults.set(fn, false)
  return false
}
