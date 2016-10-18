import React from 'react'
import expect from 'expect'
import { shallow, render } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'
import ThemeProvider from '../models/ThemeProvider'
import { StyleSheet } from '../vendor/glamor/sheet'

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
  describe('basic', () => {
    it('should not throw an error when called', () => {
      styled.div``
    })

    it('should inject a stylesheet when a component is created', () => {
      const Comp = styled.div``
      shallow(<Comp />)
      expect(StyleSheet.instance.injected).toBe(true)
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
      expectCSSMatches('.a {    \n    }', { skipWhitespace: false })
    })

    it('should inject only once for a styled component, no matter how often it\'s mounted', () => {
      const Comp = styled.div``
      shallow(<Comp />)
      shallow(<Comp />)
      expectCSSMatches('.a {  }')
    })
  })

  describe('with styles', () => {
    it('should append a style', () => {
      const rule = 'color: blue;'
      const Comp = styled.div`
        ${rule}
      `
      shallow(<Comp />)
      expectCSSMatches('.a { color: blue; }')
    })

    it('should append multiple styles', () => {
      const rule1 = 'color: blue;'
      const rule2 = 'background: red;'
      const Comp = styled.div`
        ${rule1}
        ${rule2}
      `
      shallow(<Comp />)
      expectCSSMatches('.a { color: blue; background: red; }')
    })

    it('should handle inline style objects', () => {
      const rule1 = {
        backgroundColor: 'blue',
      }
      const Comp = styled.div`
        ${rule1}
      `
      shallow(<Comp />)
      expectCSSMatches('.a { background-color: blue; }')
    })

    it('should inject styles of multiple components', () => {
      const firstRule = 'background: blue;'
      const secondRule = 'background: red;'
      const FirstComp = styled.div`
        ${firstRule}
      `
      const SecondComp = styled.div`
        ${secondRule}
      `

      shallow(<FirstComp />)
      shallow(<SecondComp />)

      expectCSSMatches('.a { background: blue; } .b { background: red; }')
    })

    it('should inject styles of multiple components based on creation, not rendering order', () => {
      const firstRule = 'content: "first rule";'
      const secondRule = 'content: "second rule";'
      const FirstComp = styled.div`
        ${firstRule}
      `
      const SecondComp = styled.div`
        ${secondRule}
      `

      // Switch rendering order, shouldn't change injection order
      shallow(<SecondComp />)
      shallow(<FirstComp />)

      // Classes _do_ get generated in the order of rendering but that's ok
      expectCSSMatches(`
        .b { content: "first rule"; }
        .a { content: "second rule"; }
      `)
    })

    it('should strip a JS-style (invalid) comment in the styles', () => {
      const comment = '// This is an invalid comment'
      const rule = 'color: blue;'
      const Comp = styled.div`
        ${comment}
        ${rule}
      `
      shallow(<Comp />)
      expectCSSMatches(`
        .a {
          color: blue;
        }
      `)
    })
  })

  describe('extending', () => {
    it('should generate a single class with no styles', () => {
      const Parent = styled.div``
      const Child = styled(Parent)``

      shallow(<Parent />)
      shallow(<Child />)

      expectCSSMatches('.a { }')
    })

    it('should generate a single class if only parent has styles', () => {
      const Parent = styled.div`color: blue;`
      const Child = styled(Parent)``

      shallow(<Parent />)
      shallow(<Child />)

      expectCSSMatches('.a { color: blue; }')
    })

    it('should generate a single class if only child has styles', () => {
      const Parent = styled.div`color: blue;`
      const Child = styled(Parent)``

      shallow(<Parent />)
      shallow(<Child />)

      expectCSSMatches('.a { color: blue; }')
    })

    it('should generate a class for the child with the rules of the parent', () => {
      const Parent = styled.div`color: blue;`
      const Child = styled(Parent)`color: red;`

      shallow(<Child />)

      expectCSSMatches('.a { color: blue;color: red; }')
    })

    it('should generate different classes for both parent and child', () => {
      const Parent = styled.div`color: blue;`
      const Child = styled(Parent)`color: red;`

      shallow(<Parent />)
      shallow(<Child />)

      expectCSSMatches('.a { color: blue; } .b { color: blue;color: red; }')
    })

    it('should copy nested rules to the child', () => {
      const Parent = styled.div`
        color: blue;
        > h1 { font-size: 4rem; }
      `
      const Child = styled(Parent)`color: red;`

      shallow(<Parent />)
      shallow(<Child />)

      expectCSSMatches(`
        .a { color: blue; }
        .a > h1 { font-size: 4rem; }
        .b { color: blue; color: red; }
        .b > h1 { font-size: 4rem; }
      `)
    })

    it('should keep default props from parent', () => {
      const Parent = styled.div`
        color: ${(props) => props.color};
      `
      Parent.defaultProps = {
        color: 'red'
      }

      const Child = styled(Parent)`background-color: green;`

      shallow(<Parent />)
      shallow(<Child />)

      expectCSSMatches(`
        .a { color: red; }
        .b { color: red; background-color: green; }
      `)
    })

    it('should keep prop types from parent', () => {
      const Parent = styled.div`
        color: ${(props) => props.color};
      `
      Parent.propTypes = {
        color: React.PropTypes.string
      }

      const Child = styled(Parent)`background-color: green;`

      expect(Child.propTypes).toEqual(Parent.propTypes)
    })

    it('should keep custom static member from parent', () => {
      const Parent = styled.div`color: red;`

      Parent.fetchData = () => 1

      const Child = styled(Parent)`color: green;`

      expect(Child.fetchData).toExist()
      expect(Child.fetchData()).toEqual(1)
    })

    it('should keep static member in triple inheritance', () => {
      const GrandParent = styled.div`color: red;`
      GrandParent.fetchData = () => 1

      const Parent = styled(GrandParent)`color: red;`
      const Child = styled(Parent)`color:red;`

      expect(Child.fetchData).toExist()
      expect(Child.fetchData()).toEqual(1)
    })
  })

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
