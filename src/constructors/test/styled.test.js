// @flow
import React from 'react';
import expect from 'expect'
import styled from '../../index'
import domElements from '../../utils/domElements'

describe('styled', () => {
  it('should have all valid HTML5 elements defined as properties', () => {
    domElements.forEach(domElement => {
      expect(styled[domElement]).toExist()
    })
  })

  it('should throw an invariant the correct name for html tags when invalid arguments are passed', () => {
    expect(() => {
      // $FlowInvalidInputTest
      styled.div(`
        html {
          color: blue;
        }
      `)
    }).toThrow(/styled\.div/)
  })

  it('should throw an invariant the correct name for components when invalid arguments are passed', () => {
    const component = () => <div />

    expect(() => {
      // $FlowInvalidInputTest
      styled(component)(`
        html {
          color: blue;
        }
      `)
    }).toThrow(/Component/)
  })
})
