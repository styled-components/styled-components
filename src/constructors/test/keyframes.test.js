// @flow
import React from 'react'
import { render } from 'enzyme'

import _keyframes from '../keyframes'
import stringifyRules from '../../utils/stringifyRules'
import css from '../css'
import { expectCSSMatches, resetStyled } from '../../test/utils'
import Keyframes from '../../models/Keyframes'

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

  it('should return Keyframes instance', () => {
    expect(keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `).toBeInstanceOf(Keyframes)
  })

  it('should return its name via .getName()', () => {
    expect(keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `.getName()).toEqual('keyframe_0')
  })

  it('should return its name', () => {
    expect(keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `.getName()).toEqual('keyframe_0')
  })

  it('should insert the correct styles', () => {
    const styled = resetStyled();

    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `

    const animation = keyframes`${rules}`;
    const name = animation.getName();

    expectCSSMatches('')

    const Comp = styled.div`animation: ${animation} 2s linear infinite;`
    render(<Comp />)

    expectCSSMatches(`
      .sc-a {}
      .b {
        -webkit-animation: ${name} 2s linear infinite;
        animation: ${name} 2s linear infinite;
      }
    
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

  it('should insert the correct styles when keyframes in props', () => {
    const styled = resetStyled();

    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `

    const animation = keyframes`${rules}`;
    const name = animation.getName();

    expectCSSMatches('')

    const Comp = styled.div`animation: ${props => props.animation} 2s linear infinite;`
    render(<Comp animation={animation} />)

    expectCSSMatches(`
      .sc-a {}
      .b {
        -webkit-animation: ${name} 2s linear infinite;
        animation: ${name} 2s linear infinite;
      }
    
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
})
