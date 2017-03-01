// @flow
import React, { Component } from 'react'
import { shallow, mount } from 'enzyme'

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

  it('should generate only component class even if rendered if no styles are passed', () => {
    const Comp = styled.div``
    shallow(<Comp />)
    expectCSSMatches('.sc-a {}')
  })

  it('should inject styles', () => {
    const Comp = styled.div`
      color: blue;
    `
    shallow(<Comp />)
    expectCSSMatches('.sc-a { } .b { color: blue; }')
  })

  it('should inject only once for a styled component, no matter how often it\'s mounted', () => {
    const Comp = styled.div`
      color: blue;
    `
    shallow(<Comp />)
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { color: blue; }')
  })

  describe('jsdom tests', () => {
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
      expect(wrapper.node.testRef).toBeTruthy()
    })

    it('should not pass innerRef to the component', () => {
      // $FlowFixMe
      expect(wrapper.node.ref).toBeFalsy()
    })
  })
})
