import expect from 'expect'
import styled from '../../index'
import domElements from '../domElements'

describe('styled', () => {
  it('should have all valid HTML5 elements defined as properties', () => {
    for (const domElement of domElements) {
      expect(styled[domElement]).toExist()
    }
  })
})
