// @flow
import React from 'react'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('extending', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should let you use another component in a css rule', () => {
    const Inner = styled.div`
      color: blue;
      font-weight: light;
    `
    const Outer = styled.div`
      padding: 1rem;
      > ${Inner} {
        font-weight: bold;
      }
    `
    shallow(<Inner/>)
    shallow(<Outer/>)
    expectCSSMatches(`
      .sc-a {}
      .c { color: blue; font-weight: light; }
      .sc-b {}
      .d { padding: 1rem; }
      .d > .sc-a { font-weight: bold; }
    `)
  })
})
