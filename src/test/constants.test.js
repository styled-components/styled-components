import React from 'react'
import { shallow } from 'enzyme'

import { expectCSSMatches } from './utils'
import { SC_ATTR as DEFAULT_SC_ATTR } from '../constants'

function renderAndExpect(expectedAttr) {
  const SC_ATTR = require('../constants').SC_ATTR
  const styled = require('./utils').resetStyled()

  const Comp = styled.div`
    color: blue;
  `

  shallow(<Comp />)

  expectCSSMatches('.sc-a { } .b { color:blue; }')

  expect(SC_ATTR).toEqual(expectedAttr)
  expect(document.head.querySelectorAll(`style[${SC_ATTR}]`)).toHaveLength(1)
}

describe('constants', () => {
  it('should work with default SC_ATTR', () => {
    renderAndExpect(DEFAULT_SC_ATTR)
  })

  it('should work with custom SC_ATTR', () => {
    const CUSTOM_SC_ATTR = 'data-custom-styled-components'
    process.env.SC_ATTR = CUSTOM_SC_ATTR
    jest.resetModules()

    renderAndExpect(CUSTOM_SC_ATTR)

    delete process.env.SC_ATTR
  })

  afterEach(() => {
    jest.resetModules()
  })
})
