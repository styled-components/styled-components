// @flow
import React from 'react'
import { shallow } from 'enzyme'
import expect from 'expect'

import { resetStyled, expectCSSMatches } from './utils'
import styleSheet from '../models/StyleSheet'

let styled

describe('warn too many classes', () => {
  const nativeWarn = console.warn
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  afterEach(() => {
    console.warn = nativeWarn
  })

  it('should warn once', () => {
    let warnCalled = 0
    console.warn = () => warnCalled++
    const Comp = styled.div`
      width: ${props => props.size};
    `
    for (let i = 0; i < 300; i++) {
      shallow(<Comp size={i}/>)
    }
    expect(warnCalled).toEqual(1)
  })

  it('should warn if number of classes is 200', () => {
    let warnCalled = 0

    console.warn = () => warnCalled++
    const Comp = styled.div`
      width: ${props => props.size};
    `
    for (let i = 0; i < 200; i++) {
      shallow(<Comp size={i}/>)
    }
    expect(warnCalled).toEqual(1)
  })

  it('should not warn if number of classes is below 200', () => {
    let warnCalled = 0

    console.warn = () => warnCalled++
    const Comp = styled.div`
      width: ${props => props.size};
    `
    for (let i = 0; i < 199; i++) {
      shallow(<Comp size={i}/>)
    }

    expect(warnCalled).toEqual(0)
  })
})
