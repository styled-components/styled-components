// @flow
import React from 'react'
import { shallow } from 'enzyme'

import { resetNoParserStyled, expectCSSMatches } from '../../test/utils'

let styled

describe('basic', () => {
  beforeEach(() => {
    styled = resetNoParserStyled()
  })

  it('should throw a meaningful error when called with null', () => {
    const invalidComps = [undefined, null, 123, []]
    invalidComps.forEach(comp => {
      expect(() => {
        // $FlowInvalidInputTest
        const Comp = styled(comp)
        shallow(<Comp />)
        // $FlowInvalidInputTest
      }).toThrow(`Cannot create styled-component for component: ${comp}`)
    })
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
