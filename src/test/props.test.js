// @flow
import React from 'react'
import { mount, shallow } from 'enzyme'
import jsdom from 'mocha-jsdom'
import expect from 'expect'
import styleSheet from '../models/StyleSheet'
import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('props', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should execute interpolations and fall back', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `
    shallow(<Comp />)
    expectCSSMatches('.a { color: black; }')
  })
  it('should execute interpolations and inject props', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `
    shallow(<Comp fg="red"/>)
    expectCSSMatches('.a { color: red; }')
  })
  describe('sibling props', () => {
    jsdom()
    let Comp
    beforeEach(() => {
      styled = resetStyled()
      Comp = styled.div`
      color: ${props => props.red ? 'red' : 'white'}
      & + & {
        color: 'black'
      }
      `
    })
    it('Should give the same class to the prop children and the propless one', ()=> {
      const wrapper = mount(<div><Comp /><Comp red /></div>)
      const comps = wrapper.find(Comp)
      const proplessClass = comps.at(0).find('div').first().prop('className')
      const withPropClass = comps.at(1).find('div').first().prop('className').split(' ')
      expect(withPropClass.indexOf(proplessClass) !== -1).toEqual(true)
    })
    it('Should attach the sibling rule to the common root class', () => {
      const wrapper = mount(<div><Comp /><Comp red /></div>)
      expectCSSMatches(' .a { color: white; } .a + .a { color: black; } .b { color: red}')
    })
  })
})
