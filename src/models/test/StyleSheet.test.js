import styleSheet from '../StyleSheet'
import { resetStyled } from '../../test/utils'
import expect from 'expect'

describe('stylesheet', () => {
  beforeEach(() => {
    resetStyled()
  })

  describe('inject', () => {
    beforeEach(() => {
      styleSheet.inject()
    })
    it('should inject the global sheet', () => {
      expect(styleSheet.globalStyleSheet.injected).toBe(true)
    })
    it('should inject the component sheet', () => {
      expect(styleSheet.componentStyleSheet.injected).toBe(true)
    })
    it('should specify that the sheets have been injected', () => {
      expect(styleSheet.injected).toBe(true)
    })
  })

  describe('flush', () => {
    beforeEach(() => {
      styleSheet.flush()
    })
    it('should flush the global sheet', () => {
      expect(styleSheet.globalStyleSheet.injected).toBe(false)
    })
    it('should flush the component sheet', () => {
      expect(styleSheet.componentStyleSheet.injected).toBe(false)
    })
    it('should specify that the sheets are no longer injected', () => {
      expect(styleSheet.injected).toBe(false)
    })
  })

  it('should return both rules for both sheets', () => {
    styleSheet.insert('a { color: green }', { global: true })
    styleSheet.insert('.hash1234 { color: blue }')

    expect(styleSheet.rules()).toEqual([
      { cssText: 'a { color: green }' },
      { cssText: '.hash1234 { color: blue }' }
    ])
  })

  describe('insert with the global option', () => {
    beforeEach(() => {
      styleSheet.insert('a { color: green }', { global: true })
    })
    it('should insert into the global sheet', () => {
      expect(styleSheet.globalStyleSheet.rules()).toEqual([
        { cssText: 'a { color: green }' },
      ])
    })
    it('should not inject into the component sheet', () => {
      expect(styleSheet.componentStyleSheet.rules()).toEqual([])
    })
  })

  describe('insert without the global option', () => {
    beforeEach(() => {
      styleSheet.insert('.hash1234 { color: blue }')
    })
    it('should inject into the component sheet', () => {
      expect(styleSheet.componentStyleSheet.rules()).toEqual([
        { cssText: '.hash1234 { color: blue }' },
      ])
    })
    it('should not inject into the global sheet', () => {
      expect(styleSheet.globalStyleSheet.rules()).toEqual([])
    })
  })
})
