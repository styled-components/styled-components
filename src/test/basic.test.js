// @flow
import React, { Component } from 'react'
import { shallow, mount } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('basic', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should not throw an error when called with a valid element', () => {
    expect(() => styled.div``).not.toThrowError()

    const FunctionalComponent = () => <div />;
    class ClassComponent extends React.Component{
      render() {
        return <div />
      }
    }
    const validComps = ['div', FunctionalComponent, ClassComponent];
    validComps.forEach(comp => {
      expect(() => {
        const Comp = styled(comp)
        shallow(<Comp />)
      }).not.toThrowError()
    })
  });

  it('should throw a meaningful error when called with an invalid element', () => {
    const FunctionalComponent = () => <div />;
    class ClassComponent extends React.Component{
      render() {
        return <div />
      }
    }
    const invalidComps = [undefined, null, 123, [], <div />, <FunctionalComponent />, <ClassComponent />];
    invalidComps.forEach(comp => {
      expect(() => {
        // $FlowInvalidInputTest
        const Comp = styled(comp)
        shallow(<Comp />)
        // $FlowInvalidInputTest
      }).toThrow(`Cannot create styled-component for component: ${comp}`)
    })
  })

  it('should not inject anything by default', () => {
    styled.div``
    expectCSSMatches('')
  })

  it('should inject component class when rendered even if no styles are passed', () => {
    const Comp = styled.div``
    shallow(<Comp />)
    expectCSSMatches('.sc-a {}')
  })

  it('should inject styles', () => {
    const Comp = styled.div`
      color: blue;
    `
    shallow(<Comp />)
    expectCSSMatches('.sc-a { } .b { color:blue; }')
  })

  it('should inject only once for a styled component, no matter how often it\'s mounted', () => {
    const Comp = styled.div`
      color: blue;
    `
    shallow(<Comp />)
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { color:blue; }')
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

  describe('jsdom tests', () => {
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

      expect(wrapper.instance().testRef).toBe(component.getDOMNode())
      expect(component.find('div').prop('innerRef')).toBeFalsy()
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

      expect(wrapper.instance().testRef).toBe(innerComponent.instance())
      expect(innerComponent.prop('innerRef')).toBeFalsy()
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
      const wrapperNode = wrapper.instance()

      expect(wrapperNode.testRef).toBe(innerComponent.getDOMNode())

      expect(innerComponent.prop('innerRef')).toBe(wrapperNode.innerRef)
    })

    it('should respect the order of StyledComponent creation for CSS ordering', () => {
      const FirstComponent = styled.div`color: red;`
      const SecondComponent = styled.div`color: blue;`

      // NOTE: We're mounting second before first and check if we're breaking their order
      shallow(<SecondComponent />)
      shallow(<FirstComponent />)

      expectCSSMatches('.sc-a {} .d { color:red; } .sc-b {} .c { color:blue; }')
    })

    it('handle media at-rules inside style rules', () => {
      const Comp = styled.div`
        > * {
          @media (min-width: 500px) {
            color: pink;
          }
        }
      `

      shallow(<Comp />)
      expectCSSMatches('.sc-a{ } @media (min-width:500px){ .b > *{ color:pink; } } ')
    })
  })
})
