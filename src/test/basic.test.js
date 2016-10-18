import React from 'react'
import expect from 'expect'
import { shallow, render } from 'enzyme'

import { StyleSheet } from '../vendor/glamor/sheet'
import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('basic', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should not throw an error when called', () => {
    styled.div``
  })

  it('should inject a stylesheet when a component is created', () => {
    const Comp = styled.div``
    shallow(<Comp />)
    expect(StyleSheet.instance.injected).toBe(true)
  })

  it('should not generate any styles by default', () => {
    styled.div``
    expectCSSMatches('')
  })

  it('should generate an empty tag once rendered', () => {
    const Comp = styled.div``
    shallow(<Comp />)
    expectCSSMatches('.a {  }')
  })

  /* TODO: we should probably pretty-format the output so this test might have to change */
  it('should pass through all whitespace', () => {
    const Comp = styled.div`   \n   `
    shallow(<Comp />)
    expectCSSMatches('.a {    \n    }', { skipWhitespace: false })
  })

  it('should inject only once for a styled component, no matter how often it\'s mounted', () => {
    const Comp = styled.div``
    shallow(<Comp />)
    shallow(<Comp />)
    expectCSSMatches('.a {  }')
  })
})
