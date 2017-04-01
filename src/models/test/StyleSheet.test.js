import React from 'react'
import expect from 'expect';
import { shallow } from 'enzyme'
import { resetStyled, expectCSSMatches } from '../../test/utils'
import styleSheet from '../StyleSheet';
import _GlobalStyle from '../GlobalStyle'
import _injectGlobal from '../../constructors/injectGlobal'
import css from '../../constructors/css'
import flatten from '../../utils/flatten'
import stringifyRules from '../../utils/stringifyRules'

let styled
const rule1 = 'width: 100%;'
const rule2 = 'text-decoration: none;'
const rule3 = 'color: blue;'

const injectGlobal = _injectGlobal(_GlobalStyle(flatten, stringifyRules), css)

describe('styleSheet', () => {

  beforeEach(() => {
    styled = resetStyled()
  })

  describe('reset()', () => {
    it('should flush all css', () => {
      const Comp = styled.div`
          ${rule1}
        `
      shallow(<Comp />)
      styleSheet.reset()
      expectCSSMatches('')
    })
  })

  describe('getCSS()', () => {
    const stripWhitespace = str => str.trim().replace(/\s+/g, ' ')
    const stripWhitespaceExceptNewline = str => str.trim().replace(/[\r\t\f\v ]+/g, ' ')

    function createStyledComponents() {
      const Comp = styled.div`
          ${rule1}
        `
      const Comp2 = styled.div`
          ${rule2}
        `
      shallow(<Comp />)
      shallow(<Comp2 />)
    }

    it('should list all css in all Components', () => {
      createStyledComponents();
      const css = styleSheet.getCSS();
      expect(stripWhitespace(css)).toEqual('.sc-a {}.c {width: 100%;}.sc-b {}.d {text-decoration: none;}')
    })

    it('should list all css all Components including globally injected styles', () => {
      createStyledComponents();
      injectGlobal`
        html {
          ${rule3}
        }
      `
      const css = styleSheet.getCSS();
      expect(stripWhitespace(css)).toEqual('.sc-a {}.c {width: 100%;}.sc-b {}.d {text-decoration: none;} html {color: blue;}')
    })

    it('should list all css Components with min: false', () => {
      createStyledComponents();

      const css = styleSheet.getCSS({ min: false });
      expect(stripWhitespaceExceptNewline(css)).toEqual('.sc-a {}.c {width: 100%;}\n.sc-b {}.d {text-decoration: none;}')
    })

    it('should not throw an error if no styled-components are rendered', () => {
      expect(() => styleSheet.getCSS()).toNotThrow();
    })
  })

})
