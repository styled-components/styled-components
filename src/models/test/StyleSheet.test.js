import styleSheet from '../AsyncStyleSheet'
import { resetStyled } from '../../test/utils'
import expect from 'expect'

describe('stylesheet', () => {
  beforeEach(() => {
    resetStyled()
  })

  describe('inject', () => {
    it('should not be injected by default', () => {
      expect(styleSheet.injected).toBe(false)
    })
  })

  describe('flush', () => {
    beforeEach(() => {
      styleSheet.clear()
    })
    it('should specify that the sheets are no longer injected', () => {
      expect(styleSheet.injected).toBe(false)
    })
  })

  describe('insert without the global option', () => {
    beforeEach(() => {
      styleSheet.addStyle('test','.hash1234 { color: blue }')
    })
    it('should inject into the component sheet', () => {
      expect(styleSheet.rules()).toEqual([
        { cssText: '.hash1234 { color: blue }' },
      ])
    })
  })
})
