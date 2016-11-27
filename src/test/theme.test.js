// @flow
import expect from 'expect';
import jsdom from 'mocha-jsdom';
import React from 'react'
import { mount, render } from 'enzyme'

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
    const wrapper = render(
      <ThemeProvider theme={theme}>
        <Comp />
      </ThemeProvider>
    )
    expectCSSMatches(`.a { color: ${theme.color}; }`)
    expect(wrapper.find('div.a').length).toBe(1)
  })

  it('should inject props.theme into a styled component multiple levels deep', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
    `
    const theme = { color: 'black' }
    const wrapper = render(
      <ThemeProvider theme={theme}>
        <div>
          <div>
            <Comp />
          </div>
        </div>
      </ThemeProvider>
    )
    expectCSSMatches(`.a { color: ${theme.color}; }`)
    expect(wrapper.find('div.a').length).toBe(1)
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
    const wrapper = render(
      <div>
        <Comp1 />
      </div>
    )
    expectCSSMatches(`.a { color: purple; }`)
    expect(wrapper.find('div.a').length).toBe(1)
  })

  it('should properly set the theme with an empty object when no teme is provided and no defaults are set', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `
    const wrapper = render(
      <div>
        <Comp1 />
      </div>
    )
    expectCSSMatches(`.a { color: ; }`)
    expect(wrapper.find('div.a').length).toBe(1)
  })

  it('should only inject props.theme into styled components within its child component tree', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `
    const Comp2 = styled.div`
      background: ${props => props.theme.color};
    `

    const theme = { color: 'black' }
    const wrapper = render(
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
    expect(wrapper.find('div.a').length).toBe(1)
    expect(wrapper.find('div.b').length).toBe(1)
  })

  it('should inject props.theme into all styled components within the child component tree', () => {
    const Comp1 = styled.div`
      color: ${props => props.theme.color};
    `
    const Comp2 = styled.div`
      background: ${props => props.theme.color};
    `
    const theme = { color: 'black' }
    const wrapper = render(
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
    expect(wrapper.find('div.a').length).toBe(1)
    expect(wrapper.find('div.b').length).toBe(1)
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
      return render(
        <ThemeProvider theme={theme}>
          <Comp />
        </ThemeProvider>
      )
    }
    let wrapper = renderComp()
    const initialCSS = expectCSSMatches(`.a { color: ${theme.color}; }`)
    expect(wrapper.find('div.a').length).toBe(1)
    // Change the theme
    theme = newTheme
    wrapper = renderComp()
    expectCSSMatches(`${initialCSS}.b { color: ${newTheme.color}; }`)
    expect(wrapper.find('div.b').length).toBe(1)
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
    expect(wrapper.find('div').prop('className')).toBe('a')

    wrapper.update();
    expectCSSMatches(`.a { color: purple; }`)
    expect(wrapper.find('div').prop('className')).toBe('a')
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
    expect(wrapper.find('div').prop('className')).toBe('a')

    wrapper.setProps({ theme: { color: 'pink' } })
    expectCSSMatches(`.a { color: purple; }.b { color: pink; }`)
    expect(wrapper.find('div').prop('className')).toBe('b')
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
    expect(wrapper.find('div').prop('className')).toBe('a')

    wrapper.setProps({ theme: { color: 'pink' } })
    expectedStyles = `${expectedStyles}.b { color: pink; z-index: 0px; }`
    expectCSSMatches(expectedStyles)
    expect(wrapper.find('div').prop('className')).toBe('b')

    wrapper.setProps({ zIndex: 1 });
    expectCSSMatches(`${expectedStyles}.c { color: pink; z-index: 1px; }`)
    expect(wrapper.find('div').prop('className')).toBe('c')
  });

  it('should change theme according to changes in ThemeProvider', () => {
    const Comp = styled.div`
      color: ${props => props.theme.color};
      z-index: ${props => props.position.zIndex}px;
    `
    const originalTheme = { color: 'black' }
    const newTheme = { color: 'blue' }
    const position = { zIndex: 1 };

    const wrapper = mount(
      <ThemeProvider theme={originalTheme}>
        <Comp position={position} />
      </ThemeProvider>
    )

    expectCSSMatches(`.a { color: ${originalTheme.color}; z-index: 1px; }`)
    expect(wrapper.find('div').prop('className')).toBe('a')

    wrapper.setProps({ theme: newTheme })
    expectCSSMatches(`.a { color: ${originalTheme.color}; z-index: 1px; }.b { color: ${newTheme.color}; z-index: 1px; }`)
    expect(wrapper.find('div').prop('className')).toBe('b')

    position.zIndex = 2
    wrapper.update()
    expectCSSMatches(`.a { color: ${originalTheme.color}; z-index: 1px; }.b { color: ${newTheme.color}; z-index: 1px; }.c { color: ${newTheme.color}; z-index: 2px; }`)
    expect(wrapper.find('div').prop('className')).toBe('c')
  });
})
