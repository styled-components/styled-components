// @flow
import expect from 'expect'
import jsdom from 'mocha-jsdom'
import React from 'react'
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
    expectCSSMatches(`.a { color: ${theme.color}; }`)
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
    expectCSSMatches(`.a { color: ${theme.color}; }`)
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
    expectCSSMatches(`.a { color: purple; }`)
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
    expectCSSMatches(`.a { color: green; }`)
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
    expectCSSMatches(`.a { color: purple; }`)
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
          <Comp theme={{ color: 'red' }}/>
        </ThemeProvider>
      </div>
    )
    expectCSSMatches(`.a { color: red; }`)
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
    expectCSSMatches(`.a { color: ; }`)
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
    expectCSSMatches(`.a { color: ${theme.color}; } .b { background: ; }`)
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
    expectCSSMatches(`.a { color: ${theme.color}; } .b { background: ${theme.color}; }`)
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
    const initialCSS = expectCSSMatches(`.a { color: ${theme.color}; }`)
    // Change the theme
    theme = newTheme
    renderComp()
    expectCSSMatches(`${initialCSS}.b { color: ${newTheme.color}; }`)
  })
})

describe('theming (jsdom)', () => {
  jsdom()

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
    expectCSSMatches(`.a { color: purple; }`)

    wrapper.update();
    expectCSSMatches(`.a { color: purple; }`)
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
    expectCSSMatches(`.a { color: purple; }`)

    wrapper.setProps({ theme: { color: 'pink' } })
    expectCSSMatches(`.a { color: purple; }.b { color: pink; }`)
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
    let expectedStyles = `.a { color: purple; z-index: 0px; }`
    expectCSSMatches(expectedStyles)

    wrapper.setProps({ theme: { color: 'pink' } })
    expectedStyles = `${expectedStyles}.b { color: pink; z-index: 0px; }`
    expectCSSMatches(expectedStyles)

    wrapper.setProps({ zIndex: 1 });
    expectCSSMatches(`${expectedStyles}.c { color: pink; z-index: 1px; }`)
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


    expectCSSMatches(`.a { color: ${originalTheme.color}; }`)
    expect(wrapper.find('div').prop('className')).toBe('a')

    // Change theme
    wrapper.setProps({ theme: newTheme })

    expectCSSMatches(`.a { color: ${originalTheme.color}; }.b { color: ${newTheme.color}; }`)
    expect(wrapper.find('div').prop('className')).toBe('b')
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
})
