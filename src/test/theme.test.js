// @flow
import React, { Component } from 'react'
import { mount, render } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'
import ThemeProvider from '../models/ThemeProvider'
import withTheme from '../hoc/withTheme'

let styled

describe('theming', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should inject props.theme into a styled component', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `
    const theme = { color: 'black' }
    render(
      <ThemeProvider theme={theme}>
        <Comp />
      </ThemeProvider>
    )
    expectCSSMatches(`.sc-a {} .b { color:${theme.color}; }`)
  })

  it('should inject props.theme into a styled component multiple levels deep', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `
    const theme = { color: 'black' }
    render(
      <ThemeProvider theme={theme}>
        <div>
          <div>
            <Comp />
          </div>
        </div>
      </ThemeProvider>
    )
    expectCSSMatches(`.sc-a {} .b { color:${theme.color}; }`)
  })

  it('should properly allow a component to fallback to its default props when a theme is not provided', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.test.color};
    `

    Comp1.defaultProps = {
      theme: {
        test: {
          color: "purple"
        }
      }
    }
    render(
      <div>
        <Comp1 />
      </div>
    )
    expectCSSMatches(`.sc-a {} .b { color:purple; }`)
  })

  // https://github.com/styled-components/styled-components/issues/344
  it('should use ThemeProvider theme instead of defaultProps theme', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.test.color};
    `

    Comp1.defaultProps = {
      theme: {
        test: {
          color: "purple"
        }
      }
    }
    const theme = { test: { color: 'green' } }

    render(
      <ThemeProvider theme={theme}>
        <Comp1 />
      </ThemeProvider>
    )
    expectCSSMatches(`.sc-a {} .b { color:green; }`)
  })

  it('should properly allow a component to override the theme with a prop even if it is equal to defaultProps theme', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.test.color};
    `

    Comp1.defaultProps = {
      theme: {
        test: {
          color: "purple"
        }
      }
    }
    const theme = { test: { color: 'green' } }

    render(
      <ThemeProvider theme={theme}>
        <Comp1 theme={{ test: { color: 'purple' } }} />
      </ThemeProvider>
    )
    expectCSSMatches(`.sc-a {} .b { color:purple; }`)
  })

  it('should properly allow a component to override the theme with a prop', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `

    const theme = {
      color: 'purple',
    }

    render(
      <div>
        <ThemeProvider theme={theme}>
          <Comp theme={{ color: 'red' }} />
        </ThemeProvider>
      </div>
    )
    expectCSSMatches(`.sc-a {} .b { color:red; }`)
  })

  it('should properly set the theme with an empty object when no theme is provided and no defaults are set', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `
    render(
      <div>
        <Comp1 />
      </div>
    )
    expectCSSMatches(`.sc-a {}`)
  })

  it('should only inject props.theme into styled components within its child component tree', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `
    const Comp2 = styled.div`
      background: ${props => props.theme.color};
    `

    const theme = { color: 'black' }
    render(
      <div>
        <ThemeProvider theme={theme}>
          <div>
            <Comp1 />
          </div>
        </ThemeProvider>
        <Comp2 />
      </div>
    )
    expectCSSMatches(`.sc-a {} .c { color:${theme.color}; } .sc-b {}`)
  })

  it('should inject props.theme into all styled components within the child component tree', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `
    const Comp2 = styled.div`
      background: ${props => props.theme.color};
    `
    const theme = { color: 'black' }
    render(
      <ThemeProvider theme={theme}>
        <div>
          <div>
            <Comp1 />
          </div>
          <Comp2 />
        </div>
      </ThemeProvider>
    )
    expectCSSMatches(`.sc-a {} .c { color:${theme.color}; } .sc-b {} .d { background:${theme.color}; }`)
  })

  it('should inject new CSS when the theme changes', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `
    const originalTheme = { color: 'black' }
    const newTheme = { color: 'blue' }
    let theme = originalTheme
    // Force render the component
    const renderComp = () => {
      render(
        <ThemeProvider theme={theme}>
          <Comp />
        </ThemeProvider>
      )
    }
    renderComp()
    const initialCSS = expectCSSMatches(`.sc-a {} .b { color:${theme.color}; }`)
    // Change the theme
    theme = newTheme
    renderComp()
    expectCSSMatches(`${initialCSS} .c { color:${newTheme.color}; }`)
  })
})

describe('theming', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should properly render with the same theme from default props on re-render', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `

    Comp1.defaultProps = {
      theme: {
        color: "purple"
      }
    }
    const wrapper = mount(
      <Comp1 />
    )
    expectCSSMatches(`.sc-a {} .b { color:purple; }`)

    wrapper.update();
    expectCSSMatches(`.sc-a {} .b { color:purple; }`)
  })

  it('should properly update style if theme is changed', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `

    Comp1.defaultProps = {
      theme: {
        color: "purple"
      }
    }
    const wrapper = mount(
      <Comp1 />
    )
    expectCSSMatches(`.sc-a {} .b { color:purple; }`)

    wrapper.setProps({ theme: { color: 'pink' } })
    expectCSSMatches(`.sc-a {} .b { color:purple; } .c { color:pink; }`)
  })

  it('should properly update style if props used in styles is changed', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
      z-index: ${props => props.zIndex}px;
    `

    Comp1.defaultProps = {
      theme: {
        color: "purple"
      },
      zIndex: 0
    }
    const wrapper = mount(
      <Comp1 />
    )
    let expectedStyles = `.sc-a {} .b { color:purple; z-index:0px; }`
    expectCSSMatches(expectedStyles)

    wrapper.setProps({ theme: { color: 'pink' } })
    expectedStyles = `${expectedStyles} .c { color:pink; z-index:0px; }`
    expectCSSMatches(expectedStyles)

    wrapper.setProps({ zIndex: 1 });
    expectCSSMatches(`${expectedStyles} .d { color:pink; z-index:1px; }`)
  })

  it('should change the classnames when the theme changes', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `

    const originalTheme = { color: 'black' }
    const newTheme = { color: 'blue' }

    const Theme = ({ theme }) => (
      <ThemeProvider theme={theme}>
        <Comp someProps={theme} />
      </ThemeProvider>
    )

    const wrapper = mount(
      <Theme theme={originalTheme} />
    )


    expectCSSMatches(`.sc-a {} .b { color:${originalTheme.color}; }`)
    expect(wrapper.find('div').prop('className')).toBe('sc-a b')

    // Change theme
    wrapper.setProps({ theme: newTheme })

    expectCSSMatches(`.sc-a {} .b { color:${originalTheme.color}; } .c { color:${newTheme.color}; }`)
    expect(wrapper.find('div').prop('className')).toBe('sc-a c')
  })

  it('should inject props.theme into a component that uses withTheme hoc', () => {
    const originalTheme = { color: 'black' }

    const MyDiv = ({ theme }) => <div>{theme.color}</div>
    const MyDivWithTheme = withTheme(MyDiv);

    const wrapper = mount(
      <ThemeProvider theme={originalTheme}>
        <MyDivWithTheme />
      </ThemeProvider>
    )

    expect(wrapper.find('div').text()).toBe('black')
  })

  it('should properly update theme prop on hoc component when theme is changed', () => {
    const MyDiv = ({ theme }) => <div>{theme.color}</div>
    const MyDivWithTheme = withTheme(MyDiv);

    const originalTheme = { color: 'black' }
    const newTheme = { color: 'blue' }

    const Theme = ({ theme }) => (
      <ThemeProvider theme={theme}>
        <MyDivWithTheme />
      </ThemeProvider>
    )

    const wrapper = mount(
      <Theme theme={originalTheme} />
    )

    expect(wrapper.find('div').text()).toBe('black')

    // Change theme
    wrapper.setProps({ theme: newTheme })

    expect(wrapper.find('div').text()).toBe('blue')
  })

  // https://github.com/styled-components/styled-components/issues/445
  it('should use ThemeProvider theme instead of defaultProps theme after initial render', () => {
    const Text = styled.div`
      color: ${props => props.theme.color};
    `

    Text.defaultProps = {
      theme: {
        color: 'purple',
      },
    }

    const Theme = props => (
      <ThemeProvider theme={{ color: 'green' }}>
        <Text {...props} />
      </ThemeProvider>
    )

    const wrapper = mount(
      <Theme prop="foo" />
    )

    expectCSSMatches(`.sc-a { } .b { color:green; } `)

    wrapper.setProps({ prop: 'bar' })

    expectCSSMatches(`.sc-a { } .b { color:green; } `)
  })

  // https://github.com/styled-components/styled-components/issues/596
  it('should hoist static properties when using withTheme', () => {
    class MyComponent extends Component<*, *> {
      static myStaticProperty: boolean = true
    }

    const MyComponentWithTheme = withTheme(MyComponent)

    expect(MyComponentWithTheme.myStaticProperty).toBe(true)
  })

  it('should only pass the theme prop', () => {
    class Comp extends Component<*, *> {
      render() {
        return <div />
      }
    }

    const CompWithTheme = withTheme(Comp)

    const wrapper = mount(
      <ThemeProvider theme={{}}>
        <CompWithTheme />
      </ThemeProvider>
    )

    const inner = wrapper.find(Comp).first()

    expect(Object.keys(inner.props()).length).toEqual(1)
    expect(inner.props()).toEqual({ theme: {} })
  })

  it('should accept innerRef and pass it on as ref', () => {
    class Comp extends Component<*, *> {
      render() {
        return <div />
      }
    }

    const CompWithTheme = withTheme(Comp)
    const ref = jest.fn()

    const wrapper = mount(
      <ThemeProvider theme={{}}>
        <CompWithTheme innerRef={ref} />
      </ThemeProvider>
    )

    const inner = wrapper.find(Comp).first();

    expect(ref).toHaveBeenCalledWith(inner.instance())
    expect(inner.prop('innerRef')).toBe(undefined)
  })

  it('should accept innerRef and pass it on for stateless function components', () => {
    const Comp = () => <div />
    const CompWithTheme = withTheme(Comp)
    const ref = jest.fn()

    const wrapper = mount(
      <ThemeProvider theme={{}}>
        <CompWithTheme innerRef={ref} />
      </ThemeProvider>
    )

    const inner = wrapper.find(Comp).first()

    expect(ref).toHaveBeenCalledTimes(0)
    expect(inner.prop('innerRef')).toBe(ref)
  })

  it('should accept innerRef and pass it on for styled components', () => {
    const Comp = styled.div``
    const CompWithTheme = withTheme(Comp)
    const ref = jest.fn()

    const wrapper = mount(
      <ThemeProvider theme={{}}>
        <CompWithTheme innerRef={ref} />
      </ThemeProvider>
    )

    const inner = wrapper.find(Comp).first()

    expect(ref).toHaveBeenCalledWith(inner.getDOMNode())
    expect(inner.prop('innerRef')).toBe(ref)
  })

  // https://github.com/styled-components/styled-components/issues/1130
  it('should not break without a ThemeProvier if it has a defaultTheme', () => {
    const MyDiv = ({ theme }) => <div>{theme.color}</div>
    const MyDivWithTheme = withTheme(MyDiv);
    const theme = { color: 'red' }
    const newTheme = { color: 'blue' }

    MyDivWithTheme.defaultProps = { theme }

    const wrapper = mount(<MyDivWithTheme />)

    expect(wrapper.find('div').text()).toBe('red')

    // Change theme
    wrapper.setProps({ theme: newTheme })

    expect(wrapper.find('div').text()).toBe('blue')
  })

  // https://github.com/styled-components/styled-components/issues/1776
  it('should allow module objects to be passed as themes', () => {
    const theme = {
      borderRadius: '2px',
      palette: {
        black: '#000',
        white: '#fff',
        // Flow has limited support for Symbols and computed properties;
        // see <https://github.com/facebook/flow/issues/3258>.
        // $FlowFixMe
        [Symbol.toStringTag]: 'Module'
      },
      // Flow has limited support for Symbols and computed properties;
      // see <https://github.com/facebook/flow/issues/3258>.
      // $FlowFixMe
      [Symbol.toStringTag]: 'Module'
    }

    const Comp1 = styled.div`
      background-color: ${ ({ theme }) => theme.palette.white };
      color: ${ ({ theme }) => theme.palette.black };
    `

    let wrapper
    expect(() => {
      wrapper = mount(
        <ThemeProvider theme={ theme }>
          <Comp1 />
        </ThemeProvider>
      )
    }).not.toThrow('plain object')

    expectCSSMatches(`.sc-a {} .b {background-color:${theme.palette.white};color:${theme.palette.black};}`)
  })

  it('should allow other complex objects to be passed as themes', () => {
    class Theme {
      borderRadius: string

      constructor(borderRadius) {
        this.borderRadius = borderRadius
      }
    }

    const theme = new Theme('2px')

    const Comp1 = styled.div`
      border-radius: ${ ({ theme }) => theme.borderRadius };
    `

    const wrapper = mount(
      <ThemeProvider theme={ theme }>
        <Comp1 />
      </ThemeProvider>
    )

    expectCSSMatches(`.sc-a {} .b {border-radius:${theme.borderRadius};}`)
  })

  it('should not allow the theme to be null', () => {
    expect(() => {
      mount(
        // $FlowInvalidInputTest
        <ThemeProvider theme={ null }>
          <div />
        </ThemeProvider>
      )
    }).toThrowErrorMatchingSnapshot()
  })

  it('should not allow the theme to be an array', () => {
    expect(() => {
      mount(
        // $FlowInvalidInputTest
        <ThemeProvider theme={ ['a', 'b', 'c'] }>
          <div />
        </ThemeProvider>
      )
    }).toThrowErrorMatchingSnapshot()
  })

  it('should not allow the theme to be a non-object', () => {
    expect(() => {
      mount(
        // $FlowInvalidInputTest
        <ThemeProvider theme={ 42 }>
          <div />
        </ThemeProvider>
      )
    }).toThrowErrorMatchingSnapshot()
  })
})
