// @flow

import {
  addNameForId,
  resetIdNames,
  hasNameForId,
  stringifyNames,
  cloneNames,
} from '../styleNames'

describe('styleNames', () => {
  describe('addNameForId', () => {
    it('adds an id and a name to a given dictionary', () => {
      const names = Object.create(null)
      // $FlowFixMe
      names.test = Object.create(null)
      addNameForId(names, 'test', 'testName')
      addNameForId(names, 'test2', 'testName')

      expect(names).toEqual({
        test: { testName: true },
        test2: { testName: true },
      })
    })
  })

  describe('resetIdNames', () => {
    it('removes all names for an ID', () => {
      const names = { test: { test: true }}
      resetIdNames(names, 'test')
      resetIdNames(names, 'test2')
      expect(names).toEqual({ test: {}, test2: {} })
    })
  })

  describe('hasNameForId', () => {
    it('checks the existance of a name for an id', () => {
      const names = { test1: { a: true }, test2: {} }
      const _hasNameForId = hasNameForId(names)
      expect(_hasNameForId('test1', 'a')).toBeTruthy()
      expect(_hasNameForId('test2', 'a')).toBeFalsy()
      expect(_hasNameForId('test3', 'a')).toBeFalsy()
    })
  })

  describe('stringifyNames', () => {
    it('lists out all known names as a continuous string', () => {
      const names = { test1: { a: true }, test2: { b: true } }
      expect(stringifyNames(names)).toBe('a b')
    })
  })

  describe('cloneNames', () => {
    it('creates a deep clone of the names dictionary', () => {
      const names = { test1: { a: true }, test2: { b: true } }
      const clone = cloneNames(names)
      clone.test1 = {}
      expect(names.test1).toEqual({ a: true })
      expect(clone.test1).toEqual({})
    })
  })
})
