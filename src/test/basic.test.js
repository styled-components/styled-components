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

    it('should pass the ref to the component', () => {
      const Comp = styled.div``

      class Wrapper extends Component {
        testRef: any;
        innerRef = (comp) => { this.testRef = comp }

        render() {
          return <Comp innerRef={this.innerRef} />
        }
      }

      const wrapper = mount(<Wrapper />)
      const component = wrapper.find(Comp).first()

      // $FlowFixMe
      expect(wrapper.node.testRef).toBe(component.getDOMNode())
      expect(component.find('div').prop('innerRef')).toNotExist()
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
        .toBe('test sc-a b')
    })

    it('should pass the innerRef to the wrapped styled component', () => {
      const InnerComponent = styled.div``
      const OuterComponent = styled(InnerComponent)``

      class Wrapper extends Component {
        testRef: any;
        innerRef = (comp) => { this.testRef = comp }

        render() {
          return <OuterComponent innerRef={this.innerRef} />
        }
      }

      const wrapper = mount(<Wrapper />)
      const innerComponent = wrapper.find(InnerComponent).first()
      const outerComponent = wrapper.find(OuterComponent).first()

      // $FlowFixMe
      expect(wrapper.node.testRef).toBe(innerComponent.getDOMNode())

      // $FlowFixMe
      expect(innerComponent.prop('innerRef')).toBe(wrapper.node.innerRef)
    })

    it('should respect the order of StyledComponent creation for CSS ordering', () => {
      const FirstComponent = styled.div`color: red;`
      const SecondComponent = styled.div`color: blue;`

      // NOTE: We're mounting second before first and check if we're breaking their order
      shallow(<SecondComponent />)
      shallow(<FirstComponent />)

      expectCSSMatches('.sc-a {} .d { color: red; } .sc-b {} .c { color: blue; }')
    })
  })
})
