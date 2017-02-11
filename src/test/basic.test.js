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
    expectCSSMatches('.a {    \n    }', { ignoreWhitespace: false })
  })

  it('should inject only once for a styled component, no matter how often it\'s mounted', () => {
    const Comp = styled.div``
    shallow(<Comp />)
    shallow(<Comp />)
    expectCSSMatches('.a {  }')
  })

  it('Should have the correct styled(component) displayName', () => {
    const CompWithoutName = () => () => <div />

    const StyledTag = styled.div``
    expect(StyledTag.displayName).toBe('styled.div')


    const CompWithName = () => <div />
    CompWithName.displayName = null
    const StyledCompWithName = styled(CompWithName)``
    expect(StyledCompWithName.displayName).toBe('Styled(CompWithName)')


    const CompWithDisplayName = CompWithoutName()
    CompWithDisplayName.displayName = 'displayName'
    const StyledCompWithDisplayName = styled(CompWithDisplayName)``
    expect(StyledCompWithDisplayName.displayName).toBe('Styled(displayName)')


    const CompWithBoth = () => <div />
    CompWithBoth.displayName = 'displayName'
    const StyledCompWithBoth = styled(CompWithBoth)``
    expect(StyledCompWithBoth.displayName).toBe('Styled(displayName)')


    const CompWithNothing = CompWithoutName()
    CompWithNothing.displayName = null
    const StyledCompWithNothing = styled(CompWithNothing)``
    expect(StyledCompWithNothing.displayName).toBe('Styled(Component)')
  })

  describe('innerRef', () => {
    jsdom()

    it('should handle styled-components correctly', () => {
      const Comp = styled.div`
        ${props => expect(props.innerRef).toExist()}
      `
      const WrapperComp = class extends Component {
        testRef: any;
        render() {
          return <Comp innerRef={(comp) => { this.testRef = comp }} />
        }
      }
      const wrapper = mount(<WrapperComp />)

      // $FlowFixMe
      expect(wrapper.node.testRef).toExist()
      // $FlowFixMe
      expect(wrapper.node.ref).toNotExist()
    })

    it('should handle inherited components correctly', () => {
      const StyledComp = styled.div``
      class WrappedStyledComp extends React.Component {
        render() {
          return (
            <StyledComp {...this.props} />
          )
        }
      }
      const ChildComp = styled(WrappedStyledComp)``
      const WrapperComp = class extends Component {
        testRef: any;
        render() {
          return <ChildComp innerRef={(comp) => { this.testRef = comp }} />
        }
      }
      const wrapper = mount(<WrapperComp />)

      // $FlowFixMe
      expect(wrapper.node.testRef).toExist()
      // $FlowFixMe
      expect(wrapper.node.ref).toNotExist()
    })
  })
})
