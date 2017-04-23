// @flow
import React from 'react'

import _keyframes from '../../constructors/keyframes'
import stringifyRules from '../stringifyRules'
import css from '../css'

import { resetNoParserStyled, expectCSSMatches } from '../../test/utils'

let index = 0
const keyframes = _keyframes(() => `keyframe_${index++}`, stringifyRules, css)

describe('keyframes', () => {
  beforeEach(() => {
    resetNoParserStyled()
  })

  it('should correctly assemble preprocessed CSS', () => {
    const name = keyframes([
      // $FlowFixMe
      ['@-webkit-keyframes '],
      // $FlowFixMe
      [' {from {background-position: 0vw 0px;}to {background-position: 100vw 0px;}} @keyframes '],
      // $FlowFixMe
      [' {from {background-position: 0vw 0px;}to {background-position: 100vw 0px;}}']
    ])

    expectCSSMatches(`@-webkit-keyframes ${name} {from {background-position: 0vw 0px;}to {background-position: 100vw 0px;}} @keyframes ${name} {from {background-position: 0vw 0px;}to {background-position: 100vw 0px;}}`)
  })
})
