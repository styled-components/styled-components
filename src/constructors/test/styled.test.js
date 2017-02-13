// @flow
import expect from 'expect'
import styled from '../../index'
import domElements from '../../utils/domElements'

describe('styled', () => {
  it('should have all valid HTML5 elements defined as properties', () => {
    Object.keys(domElements).forEach(domElement => {
      expect(styled[domElement]).toExist()
    })
  })
})
