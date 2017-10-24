// @flow
import React from 'react'
import { shallow } from 'enzyme'

import * as nonce from '../utils/nonce';
import { resetStyled, expectCSSMatches } from './utils'
import _injectGlobal from '../constructors/injectGlobal'
import stringifyRules from '../utils/stringifyRules'
import css from '../constructors/css'
const injectGlobal = _injectGlobal(stringifyRules, css)

jest.mock('../utils/nonce')

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
    expectCSSMatches('.sc-a {} .b { color:blue; }')
  })

  it('should append multiple styles', () => {
    const rule1 = 'color: blue;'
    const rule2 = 'background: red;'
    const Comp = styled.div`
        ${rule1}
        ${rule2}
      `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { color:blue; background:red; }')
  })

  it('should handle inline style objects', () => {
    const rule1 = {
      backgroundColor: 'blue',
    }
    const Comp = styled.div`
        ${rule1}
      `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { background-color:blue; }')
  })

  it('should handle inline style objects with media queries', () => {
    const rule1 = {
      backgroundColor: 'blue',
      '@media screen and (min-width: 250px)': {
        backgroundColor: 'red',
      },
    }
    const Comp = styled.div`
        ${rule1}
      `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { background-color:blue; } @media screen and (min-width:250px) { .b { background-color:red; } }')
  })

  it('should handle inline style objects with pseudo selectors', () => {
    const rule1 = {
      backgroundColor: 'blue',
      '&:hover': {
        textDecoration: 'underline',
      },
    }
    const Comp = styled.div`
      ${rule1}
    `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { background-color:blue; } .b:hover { text-decoration:underline; }')
  })

  it('should handle inline style objects with pseudo selectors', () => {
    const rule1 = {
      backgroundColor: 'blue',
      '&:hover': {
        textDecoration: 'underline',
      },
    }
    const Comp = styled.div`
      ${rule1}
    `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { background-color:blue; } .b:hover { text-decoration:underline; }')
  })

  it('should handle inline style objects with nesting', () => {
    const rule1 = {
      backgroundColor: 'blue',
      '> h1': {
        color: 'white',
      },
    }
    const Comp = styled.div`
      ${rule1}
    `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { background-color:blue; } .b > h1 { color:white; }')
  })

  it('should handle inline style objects with contextual selectors', () => {
    const rule1 = {
      backgroundColor: 'blue',
      'html.something &': {
        color: 'white',
      },
    }
    const Comp = styled.div`
      ${rule1}
    `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { background-color:blue; } html.something .b { color:white; }')
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

    expectCSSMatches('.sc-a {} .c { background:blue; } .sc-b {} .d { background:red; }')
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
        .sc-a {}
        .d { content:"first rule"; }
        .sc-b {}
        .c { content:"second rule"; }
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
        .sc-a {}
        .b {
          color:blue;
        }
      `)
  })

  it('should add a webpack nonce to the style tags if one is available in the global scope', () => {
    jest.spyOn(nonce, 'default').mockImplementation(() => 'foo')

    const rule = 'color: blue;'
    const Comp = styled.div`
        ${rule}
      `
    shallow(<Comp />)
    expectCSSMatches(`
        .sc-a {}
        .b {
          color:blue;
        }
      `)

    Array.from(document.querySelectorAll('style')).forEach(el => expect(el.getAttribute('nonce')).toBe('foo'))
  })

  it('should add a webpack nonce to the global style tags if one is available in the global scope', () => {
    // eslint-disable-next-line no-underscore-dangle
    window.__webpack_nonce__ = 'foo'

    injectGlobal`
        html {
          background: red;
        }
      `
    const rule = 'color: blue;'
    const Comp = styled.div`
        ${rule}
      `
    shallow(<Comp />)
    expectCSSMatches(`
        html {
          background:red;
        }
        .sc-a {}
        .b {
          color:blue;
        }
      `)

    Array.from(document.querySelectorAll('style')).forEach(el => expect(el.getAttribute('nonce')).toBe('foo'))
  })
})
