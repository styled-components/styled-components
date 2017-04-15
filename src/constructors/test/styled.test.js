// @flow
import React from 'react';
import expect from 'expect'
import sinon from 'sinon';
import styled from '../../index'
import domElements from '../../utils/domElements'

describe('styled', () => {
  it('should have all valid HTML5 elements defined as properties', () => {
    domElements.forEach(domElement => {
      expect(styled[domElement]).toExist()
    })
  })

  it('should console.error the correct name for html tags when invalid arguments are passed', () => {
    const consoleSpy = sinon.spy(console, 'error')

    styled.div(`
      html {
        color: blue;
      }
    `)

    consoleSpy.restore()
    expect(consoleSpy.callCount).toEqual(1)
    expect(consoleSpy.getCall(0).args[0]).toInclude('styled.div')
  })

  it('should console.error the correct name for components when invalid arguments are passed', () => {
    const consoleSpy = sinon.spy(console, 'error')

    const component = () => <div />

    styled(component)(`
      html {
        color: blue;
      }
    `)

    consoleSpy.restore()
    expect(consoleSpy.callCount).toEqual(1)
    expect(consoleSpy.getCall(0).args[0]).toInclude('styled(Component)')
  })
})
