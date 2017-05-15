// @flow
import expect from 'expect'

import mediaQuery from '../mediaQuery'
import css from '../css'
import styleSheet from '../../models/StyleSheet'
import flatten from '../../utils/flatten'
import { expectCSSMatches, resetStyled } from '../../test/utils'

const addStylesheetRule = (rule) => {
  styleSheet.insert(flatten(rule).join(''))
}

describe('mediaQuery', () => {
  beforeEach(() => {
    resetStyled()
  })

  it('should return a function', () => {
    expect(mediaQuery`test`).toBeA('function')
  })

  describe('returned function', () => {
    it('should return an array of strings', () => {
      const testQuery = mediaQuery`testQuery`
      const strings = ['string1', 'string2', 'string3']
      const interpolations = ['interpolation1', 'interpolation2']
      expect(testQuery(strings, ...interpolations)).toBeAn('array')
    })

    it('should handle a tagged template literal', () => {
      const testQuery = mediaQuery`(min-width: ${768/16}em)`
      const exampleFunction = () => true;
      expect(testQuery`string1${'interpolation1'}string2${exampleFunction}string3`).toEqual([
        '@media ',
        '(min-width: ',
        '48',
        'em)',
        '{',
        'string1',
        'interpolation1',
        'string2',
        exampleFunction,
        'string3',
        '}',
      ])
    })
  })

  it('should create a media query', () => {
    const tablet = mediaQuery`(min-width: ${768/16}em)`
    const rule = css`
      .ex {
        color: black;
      }
      ${tablet`
        /* tablet rules */
        .ex {
          color: red;
        }
      `}
    `

    addStylesheetRule(rule)
    expectCSSMatches(`
      .ex { color: black; }
      @media (min-width: 48em){
        /* tablet rules */
        .ex { color: red; }
      }
    `, { styleSheet })
  })
})
