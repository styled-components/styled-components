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

  describe('displayName', () => {
    it('should be auto-generated if none passed', () => {
      const Comp = styled.div``
      expect(Comp.displayName).toBe('styled.div')
    })

    it('should be attached if supplied', () => {
      const Comp = styled.div.withConfig({ displayName: 'Comp' })``
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
      const Comp = styled.div.withConfig({ displayName: 'Comp' })``
      const Comp2 = styled.div.withConfig({ displayName: 'Comp2' })``
      expect(Comp.styledComponentId).toBe('Comp-a')
      expect(shallow(<Comp />).prop('className')).toInclude('Comp-a')
      expect(Comp2.styledComponentId).toBe('Comp2-b')
      expect(shallow(<Comp2 />).prop('className')).toInclude('Comp2-b')
    })

    it('should be attached if passed in', () => {
      const Comp = styled.div.withConfig({ displayName: 'Comp', componentId: 'LOLOMG' })``
      const Comp2 = styled.div.withConfig({ displayName: 'Comp2', componentId: 'OMGLOL' })``
      expect(Comp.styledComponentId).toBe('LOLOMG')
      expect(shallow(<Comp />).prop('className')).toInclude('LOLOMG')
      expect(Comp2.styledComponentId).toBe('OMGLOL')
      expect(shallow(<Comp2 />).prop('className')).toInclude('OMGLOL')
    })
  })

  describe('chaining', () => {
    it('should only take the last value', () => {
      const Comp = styled.div
        .withConfig({ displayName: 'dn-2', componentId: 'id-3' })
        .withConfig({ displayName: 'dn-5', componentId: 'id-4' })
        ``
      expect(shallow(<Comp />).prop('className')).toBe('id-4 a')
    })
  })
})
