// @flow
import React from 'react'
import { shallow } from 'enzyme'
import expect from 'expect'

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
    expect(shallow(<Comp/>).html()).toEqual('<div class="sc-a b"></div>')
    expectCSSMatches('.sc-a {} .b { color: black; }')
  })

  it('should execute interpolations and pass through whitelisted props', () => {
    const Comp = styled.div`
      color: ${props => props.hidden ? 'transparent' : 'black'};
    `
    expect(shallow(<Comp hidden/>).html()).toEqual('<div hidden="" class="sc-a b"></div>')
    expectCSSMatches('.sc-a {} .b { color: transparent; }')
  })

  it('should use interpolations and not pass through non-whitelisted props', () => {
    const Comp = styled.div`
      color: ${props => props.blue ? 'blue' : 'black'};
    `
    expect(shallow(<Comp blue/>).html()).toEqual('<div class="sc-a b"></div>')
    expectCSSMatches('.sc-a {} .b { color: blue; }')
  })

  describe('innerProps', () => {
    it('should default to passing through valid HTML attributes for divs', () => {
      const Comp = styled.div``
      expect(shallow(<Comp title="hihi"/>).html())
        .toEqual('<div title="hihi" class="sc-a b"></div>')
    })

    it('should default to passing through nothing for strings', () => {
      const Comp = styled('div')``
      expect(shallow(<Comp title="hihi"/>).html()).toEqual('<div class="sc-a b"></div>')
    })

    it('should allow things to be whitelisted', () => {
      const Comp = styled('div').innerProps({
        title: true
      })``
      expect(shallow(<Comp/>).html()).toEqual('<div class="sc-a b"></div>')
      expect(shallow(<Comp title="foo"/>).html()).toEqual('<div title="foo" class="sc-a b"></div>')
    })

    it('s whitelist should be case-insensitive', () => {
      const Comp = styled('div').innerProps({
        contenteditable: true
      })``
      expect(shallow(<Comp/>).html()).toEqual('<div class="sc-a b"></div>')
      expect(shallow(<Comp contentEditable/>).html()).toEqual('<div contenteditable="true" class="sc-a b"></div>')
    })

    it('should pass through boolean props', () => {
      const Comp = styled('div').innerProps({
        hidden: true
      })``
      expect(shallow(<Comp hidden/>).html()).toEqual('<div hidden="" class="sc-a b"></div>')
    })

    it('should pass through complex props even if its a bad idea', () => {
      /* This example uses 'title' because React's whitelist will prevent
       * "dimensions" being rendered. It does generate a warning but I couldn't
       * figure out how to test that. */
      const Comp = styled('div').innerProps({title: true}).attrs({
        style: props => ({ width: `${props.title.width}px`, height: `${props.title.height}px` })
      })``
      Comp.propTypes = {
        title: React.PropTypes.shape({
          width: React.PropTypes.number,
          height: React.PropTypes.number
        })
      }
      expect(shallow(<Comp title={{width: 10, height: 10}}/>).html())
        .toEqual('<div style="width:10px;height:10px;" title="[object Object]" class="sc-a b"></div>')
    })

    it('should allow a shorthand for both innerProps and attrs', () => {
      const Comp = styled('div').innerProps({
        'href target': true
      }).attrs({
        'title style': {width: '100px'},
      })``
      expect(shallow(<Comp href="#" target="_blank"/>).html())
        .toEqual('<div title="[object Object]" style="width:100px;" href="#" target="_blank" class="sc-a b"></div>')
    })
  })
})
