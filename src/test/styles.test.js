// @flow
import React from 'react'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('with styles', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

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
