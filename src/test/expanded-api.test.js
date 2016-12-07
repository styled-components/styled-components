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
      expect(rendered.prop('className')).toBe('sc-a foo b')
    })

    it('should attach multiple classes', () => {
      const Comp = styled.div.classes('foo bar baz')``
      const rendered = shallow(<Comp />)
      expectCSSMatches('.sc-a {} .b { }')
      expect(rendered.prop('className')).toBe('sc-a foo bar baz b')
    })
  })

  describe('displayName', () => {
    it('should be auto-generated if none passed', () => {
      const Comp = styled.div``
      expect(Comp.displayName).toBe('styled.div')
    })

    it('should be attached if supplied', () => {
      const Comp = styled.div.displayName('Comp')``
      expect(Comp.displayName).toBe('Comp')
    })
  })

  describe('componentId', () => {
    it('should be generated as "sc" + hash', () => {
      const Comp = styled.div``
      const Comp2 = styled.div``
      expect(Comp.styledComponentId).toBe('sc-a')
      expect(shallow(<Comp />).prop('className')).toInclude('sc-a')
      expect(Comp2.styledComponentId).toBe('sc-b')
      expect(shallow(<Comp2 />).prop('className')).toInclude('sc-b')
    })

    it('should be generated from displayName + hash', () => {
      const Comp = styled.div.displayName('Comp')``
      const Comp2 = styled.div.displayName('Comp2')``
      expect(Comp.styledComponentId).toBe('Comp-a')
      expect(shallow(<Comp />).prop('className')).toInclude('Comp-a')
      expect(Comp2.styledComponentId).toBe('Comp2-b')
      expect(shallow(<Comp2 />).prop('className')).toInclude('Comp2-b')
    })

    it('should be attached if passed in', () => {
      const Comp = styled.div.displayName('Comp').componentId('LOLOMG')``
      const Comp2 = styled.div.displayName('Comp2').componentId('OMGLOL')``
      expect(Comp.styledComponentId).toBe('LOLOMG')
      expect(shallow(<Comp />).prop('className')).toInclude('LOLOMG')
      expect(Comp2.styledComponentId).toBe('OMGLOL')
      expect(shallow(<Comp2 />).prop('className')).toInclude('OMGLOL')
    })
  })

  describe('css', () => {
    it('should allow a css alias at the end of a chain', () => {
      const Comp = styled.div.css``
      shallow(<Comp />)
      const Comp2 = styled.div.classes('foo').css``
      shallow(<Comp2 />)
      const Comp3 = styled.div.classes('foo').displayName('bar').css``
      shallow(<Comp3 />)
      const Comp4 = styled.div.classes('foo').displayName('bar').componentId('baz').css``
      shallow(<Comp4 />)
    })
  })

  describe('chaining', () => {
    it('should only take the last value', () => {
      const Comp = styled.div
        .classes('cls-1')
        .displayName('dn-2')
        .componentId('id-3')
        .componentId('id-4')
        .displayName('dn-5')
        .classes('cls-6')
        .css``
      expect(shallow(<Comp />).prop('className')).toBe('id-4 cls-6 a')
    })
  })
})
