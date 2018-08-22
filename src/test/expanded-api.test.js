// @flow
import React from 'react'
import TestRenderer from 'react-test-renderer'

import { resetStyled } from './utils'

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
      expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot()
      expect(Comp2.styledComponentId).toBe('sc-b')
      expect(TestRenderer.create(<Comp2 />)).toMatchSnapshot()
    })

    it('should be generated from displayName + hash', () => {
      const Comp = styled.div.withConfig({ displayName: 'Comp' })``
      const Comp2 = styled.div.withConfig({ displayName: 'Comp2' })``
      expect(Comp.styledComponentId).toBe('Comp-a')
      expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot()
      expect(Comp2.styledComponentId).toBe('Comp2-b')
      expect(TestRenderer.create(<Comp2 />)).toMatchSnapshot()
    })

    it('should be attached if passed in', () => {
      const Comp = styled.div.withConfig({ componentId: 'LOLOMG' })``
      const Comp2 = styled.div.withConfig({ componentId: 'OMGLOL' })``
      expect(Comp.styledComponentId).toBe('LOLOMG')
      expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot()
      expect(Comp2.styledComponentId).toBe('OMGLOL')
      expect(TestRenderer.create(<Comp2 />)).toMatchSnapshot()
    })

    it('should be combined with displayName if both passed in', () => {
      const Comp = styled.div.withConfig({
        displayName: 'Comp',
        componentId: 'LOLOMG',
      })``
      const Comp2 = styled.div.withConfig({
        displayName: 'Comp2',
        componentId: 'OMGLOL',
      })``
      expect(Comp.styledComponentId).toBe('Comp-LOLOMG')
      expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot()
      expect(Comp2.styledComponentId).toBe('Comp2-OMGLOL')
      expect(TestRenderer.create(<Comp2 />)).toMatchSnapshot()
    })

    it('should work with `.withComponent`', () => {
      const Dummy = props => <div {...props} />
      const Comp = styled.div.withConfig({
        displayName: 'Comp',
        componentId: 'OMGLOL',
      })``.withComponent('h1')
      const Comp2 = styled.div.withConfig({
        displayName: 'Comp2',
        componentId: 'OMFG',
      })``.withComponent(Dummy)
      expect(Comp.styledComponentId).toBe('Comp-OMGLOL-h1')
      expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot()
      expect(Comp2.styledComponentId).toBe('Comp2-OMFG-Dummy')
      expect(TestRenderer.create(<Comp2 />)).toMatchSnapshot()
    })
  })

  describe('chaining', () => {
    it('should merge the options strings', () => {
      const Comp = styled.div
        .withConfig({ componentId: 'id-1' })
        .withConfig({ displayName: 'dn-2' })``
      expect(Comp.displayName).toBe('dn-2')
      expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot()
    })

    it('should keep the last value passed in when merging', () => {
      const Comp = styled.div
        .withConfig({ displayName: 'dn-2', componentId: 'id-3' })
        .withConfig({ displayName: 'dn-5', componentId: 'id-4' })``
      expect(Comp.displayName).toBe('dn-5')
      expect(TestRenderer.create(<Comp />).toJSON()).toMatchSnapshot()
    })
  })
})
