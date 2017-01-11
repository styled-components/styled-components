// @flow
import React, { Component } from 'react'
import expect from 'expect'
import { shallow, mount } from 'enzyme'
import jsdom from 'mocha-jsdom'

import styleSheet from '../models/StyleSheet'
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
    expect(styleSheet.injected).toBe(true)
  })

  it('should generate only component class by default', () => {
    styled.div``
    expectCSSMatches('.sc-a {}')
  })

  it('should add an empty class once rendered', () => {
    const Comp = styled.div``
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b {  }')
  })

  /* TODO: we should probably pretty-format the output so this test might have to change */
  it('should pass through all whitespace', () => {
    const Comp = styled.div`   \n   `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {}\n.b {    \n    }', { ignoreWhitespace: false })
  })

  it('should inject only once for a styled component, no matter how often it\'s mounted', () => {
    const Comp = styled.div``
    shallow(<Comp />)
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b {  }')
  })

  describe('jsdom tests', () => {
    jsdom()

    let Comp
    let WrapperComp
    let wrapper

    beforeEach(() => {
      Comp = styled.div``
      WrapperComp = class extends Component {
        testRef: any;
        render() {
          return <Comp innerRef={(comp) => { this.testRef = comp }} />
        }
      }

      wrapper = mount(<WrapperComp />)
    })

    it('should pass ref to the component', () => {
      // $FlowFixMe
      expect(wrapper.node.testRef).toExist()
    })

    it('should not pass innerRef to the component', () => {
      // $FlowFixMe
      expect(wrapper.node.ref).toNotExist()
    })
  })
})
