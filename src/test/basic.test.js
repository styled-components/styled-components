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

    class InnerComponent extends Component {
      render() {
        return null
      }
    }

    it('should not leak the innerRef prop to the wrapped child', () => {
      const OuterComponent = styled(InnerComponent)``

      class Wrapper extends Component {
        testRef: any;

        render() {
          return <OuterComponent innerRef={(comp) => { this.testRef = comp }} />
        }
      }

      const wrapper = mount(<Wrapper />)
      const innerComponent = wrapper.find(InnerComponent).first()

      // $FlowFixMe
      expect(wrapper.node.testRef).toBe(innerComponent.node)
      expect(innerComponent.prop('innerRef')).toNotExist()
    })

    it('should pass the full className to the wrapped child', () => {
      const OuterComponent = styled(InnerComponent)``

      class Wrapper extends Component {
        render() {
          return <OuterComponent className="test"/>
        }
      }

      const wrapper = mount(<Wrapper />)
      expect(wrapper.find(InnerComponent).prop('className'))
        .toBe('test sc-c d')
    })
  })
})
