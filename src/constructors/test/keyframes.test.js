// @flow
import React from 'react'
import TestRenderer from 'react-test-renderer'

import keyframes from '../keyframes'
import Keyframes from '../../models/Keyframes'
import { expectCSSMatches, resetStyled } from '../../test/utils'

/**
 * Setup
 */
describe('keyframes', () => {
  beforeEach(() => {
    resetStyled()
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
    expect(
      keyframes`
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `.getName()
    ).toMatchInlineSnapshot('"bcCCNc"')
  })

  it('should insert the correct styles', () => {
    const styled = resetStyled()

    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `

    const animation = keyframes`${rules}`
    const name = animation.getName()

    expectCSSMatches('')

    const Comp = styled.div`
      animation: ${animation} 2s linear infinite;
    `
    TestRenderer.create(<Comp />)

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
    const styled = resetStyled()

    const rules = `
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    `

    const animation = keyframes`${rules}`
    const name = animation.getName()

    expectCSSMatches('')

    const Comp = styled.div`
      animation: ${props => props.animation} 2s linear infinite;
    `
    TestRenderer.create(<Comp animation={animation} />)

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
