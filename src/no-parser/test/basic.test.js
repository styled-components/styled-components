// @flow
import React from 'react'
import { shallow } from 'enzyme'

import { resetNoParserStyled, expectCSSMatches } from '../../test/utils'

let styled

describe('basic', () => {
  beforeEach(() => {
    styled = resetNoParserStyled()
  })

  it('should correctly assemble preprocessed CSS', () => {
    const Comp = styled.div([[ '{ color: red; }' ]])
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b{ color: red; }')
  })

  it('should correctly execute passed functions and assemble preprocessed CSS', () => {
    const Comp = styled.div([[ '{ color: ', () => 'red', '; }' ]])
    shallow(<Comp />)
    expectCSSMatches('.sc-a {} .b{ color: red; }')
  })
})
