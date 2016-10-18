import React from 'react'
import { render } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'
import ThemeProvider from '../models/ThemeProvider'

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

  it('should translate the theme naming convention', () => {
    const Comp = styled.div`
      color: ${props => props.theme.fgColor};
    `
    Comp.themeAdapter = theme => ({
      fgColor: theme.color
    })
    const theme = { color: 'black' }
    const renderComp = () => {
      render(
        <ThemeProvider theme={theme}>
          <Comp />
        </ThemeProvider>
      )
    }
    renderComp()
    expectCSSMatches(`.a { color: black; }`)
  })

  it('should override the themeAdapter using a prop of the same name', () => {
    const Comp = styled.div`
      background: ${props => props.theme.bgColor};
    `
    const theme = { color: 'red' }
    Comp.themeAdapter = theme => ({
      fgColor: theme.color
    })
    const renderComp = () => {
      render(
        <ThemeProvider theme={theme}>
          <Comp themeAdapter={theme => ({
            bgColor: theme.color
          })}/>
        </ThemeProvider>
      )
    }
    renderComp()
    expectCSSMatches(`.a { background: red; }`)
  })

  it('should let the theme be passed on and manipulated', () => {
    const Fg = styled.div`
      color: ${props => props.theme.fgColor};
      background: none;
      content: '${props => props.label}';
    `
    const Bg = styled.div`
      color: transparent;
      background: ${props => props.theme.bgColor};
      content: '${props => props.label}';
    `
    const theme = { color: 'red', alt: 'blue' }
    const invert = theme => ({ color: theme.alt, alt: theme.color })
    Fg.themeAdapter = Bg.themeAdapter = theme => ({
      fgColor: theme.color,
      bgColor: theme.alt
    })
    const renderComp = () => {
      render(
        <ThemeProvider theme={theme}>
          <Bg label="outer bg">
            <Fg label="outer fg">
              <ThemeProvider theme={invert}>
                <Bg label="inner bg">
                  <Fg label="inner fg">
                  </Fg>
                </Bg>
              </ThemeProvider>
            </Fg>
          </Bg>
        </ThemeProvider>
      )
    }
    renderComp()
    expectCSSMatches(`
      .b {
        color: red;
        background: none;
        content: 'outer fg';
      }
      .d {
        color: blue;
        background: none;
        content: 'inner fg';
      }
      .a {
        color: transparent;
        background: blue;
        content: 'outer bg';
      }
      .c {
        color: transparent;
        background: red;
        content: 'inner bg';
      }
    `)
  })
})
