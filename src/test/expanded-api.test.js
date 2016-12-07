// @flow
import React, { Component } from 'react'
import expect from 'expect'
import { shallow, mount } from 'enzyme'

import styleSheet from '../models/StyleSheet'
import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('expanded api', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  describe('classnames', () => {
    it('should attach a single class', () => {
      const Comp = styled.div.classes('foo')``
      const rendered = shallow(<Comp />)
      expectCSSMatches('.sc-a {} .b { }')
      expect(rendered.html()).toBe('<div class="sc-a foo b"></div>')
    })

    it('should attach multiple classes', () => {
      const Comp = styled.div.classes('foo bar baz')``
      const rendered = shallow(<Comp />)
      expectCSSMatches('.sc-a {} .b { }')
      expect(rendered.html()).toBe('<div class="sc-a foo bar baz b"></div>')
    })
  })
})
