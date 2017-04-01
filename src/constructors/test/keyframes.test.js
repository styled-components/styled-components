// @flow
import expect from 'expect'

import _keyframes from '../keyframes'
import _GlobalStyle from '../../models/GlobalStyle'
import flatten from '../../utils/flatten'
import stringifyRules from '../../utils/stringifyRules'
import css from '../css'
import { expectCSSMatches, resetStyled } from '../../test/utils'

/**
 * Setup
 */
let index = 0
const keyframes = _keyframes(() => `keyframe_${index++}`, _GlobalStyle(flatten, stringifyRules), css)

describe('keyframes', () => {
  beforeEach(() => {
    resetStyled()
    index = 0
  })

  it('should return its name', () => {
    expect(keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `).toEqual('keyframe_0')
  })

  it('should insert the correct styles', () => {
    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `

    const name = keyframes`${rules}`
    expectCSSMatches(`
      @-webkit-keyframes keyframe_0 {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }

      @keyframes keyframe_0 {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
    `)
  })
})
