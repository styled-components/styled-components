import React from 'react'
import expect from 'expect'
import { shallow, render } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'
import ThemeProvider from '../models/ThemeProvider'

let styled

describe('e2e', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  /**
   * Tests
   */
  describe('prefixes', () => {
    it('should add them in the right order', () => {
      const Comp = styled.div`
        transition: opacity 0.3s;
      `
      shallow(<Comp />)
      expectCSSMatches('.a { -ms-transition: opacity 0.3s; -moz-transition: opacity 0.3s; -webkit-transition: opacity 0.3s; transition: opacity 0.3s; }')
    })
  })

  describe('props', () => {
    it('should execute interpolations and fall back', () => {
      const Comp = styled.div`
        color: ${props => props.fg || 'black'};
      `
      shallow(<Comp />)
      expectCSSMatches('.a { color: black; }')
    })
    it('should execute interpolations and inject props', () => {
      const Comp = styled.div`
        color: ${props => props.fg || 'black'};
      `
      shallow(<Comp fg="red"/>)
      expectCSSMatches('.a { color: red; }')
    })
  })

  describe('theming', () => {
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
})
