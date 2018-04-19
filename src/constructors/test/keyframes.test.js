// @flow
import React from 'react';
import _keyframes from '../keyframes'
import stringifyRules from '../../utils/stringifyRules'
import css from '../css'
import { expectCSSMatches, resetStyled } from '../../test/utils'
import { shallow } from 'enzyme/build/index'

/**
 * Setup
 */
let index = 0
const keyframes = _keyframes(() => `keyframe_${index++}`, stringifyRules, css)

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
    `.toString()).toEqual('keyframe_0')
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
      @-webkit-keyframes ${name} {
        0% {
          opacity:0;
        }
        100% {
          opacity:1;
        }
      }

      @keyframes ${name} {
        0% {
          opacity:0;
        }
        100% {
          opacity:1;
        }
      }
    `)
  })

  it('should execute interpolations and inject props', () => {
    const styled = resetStyled();

    const rules = `
      from {
        transform: rotate(0deg);
      }
    
      to {
        transform: rotate(360deg);
      }
    `

    const rotate360 = keyframes`${rules}`

    const Comp = styled.div`animation: ${rotate360} 2s linear infinite;`
    shallow(<Comp />)
    // expectCSSMatches('.sc-a {} .b { color:red; }')
  })
})
