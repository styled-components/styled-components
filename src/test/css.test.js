// @flow
import React from 'react'
import { shallow } from 'enzyme'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('css features', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should add vendor prefixes in the right order', () => {
    const Comp = styled.div`
      transition: opacity 0.3s;
    `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { -webkit-transition: opacity 0.3s; transition: opacity 0.3s; }')
  })

  it('should add vendor prefixes for display', () => {
    const Comp = styled.div`
      display: flex;
      flex-direction: column;
      align-items: center;
    `
    shallow(<Comp />)
    expectCSSMatches(`
      .sc-a {}
      .b {
        display: -webkit-box; display: -webkit-flex; display: -ms-flexbox; display: flex; -webkit-flex-direction: column; -ms-flex-direction: column; flex-direction: column; -webkit-align-items: center; -webkit-box-align: center; -ms-flex-align: center; align-items: center;
      }
    `)
  })

  it('should pass through custom properties', () => {
    const Comp = styled.div`
      --custom-prop: some-val;
    `
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b { --custom-prop: some-val; }')
  })
})
