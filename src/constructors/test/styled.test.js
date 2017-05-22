// @flow
import styled from '../../index'
import domElements from '../../utils/domElements'

describe('styled', () => {
  it('should have all valid HTML5 elements defined as properties', () => {
    Object.keys(domElements).forEach(tagName => {
      expect(styled[tagName]).toBeTruthy()
    })
  })
})
