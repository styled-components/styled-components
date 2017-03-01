// @flow
import styled from '../../index'
import domElements from '../../utils/domElements'

describe('styled', () => {
  it('should have all valid HTML5 elements defined as properties', () => {
    domElements.forEach(domElement => {
      expect(styled[domElement]).toBeTruthy()
    })
  })
})
