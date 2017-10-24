// @flow
import React from 'react'
import { shallow } from 'enzyme'

import { resetStyled } from './utils'

let styled

describe('static style caching', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should mark styles without any functions as static', () => {
    const TOP_AS_NUMBER = 10
    const FONT_SIZE_NUMBER = 14
    const COLOR_AS_STRING = 'purple'

    const Comp = styled.div`
      color: purple;
      font-size: ${ FONT_SIZE_NUMBER }px
      position: absolute;
      top: ${ TOP_AS_NUMBER }
    `

    expect(Comp.componentStyle.isStatic).toEqual(true)
  })

  it('should mark styles with a nested styled component as static', () => {
    const NestedComp = styled.div``

    const Comp = styled.div`
      ${ NestedComp } {
        color: purple;
      }
    `

    expect(Comp.componentStyle.isStatic).toEqual(true)
  })

  it('should mark styles with a dynamic style as not static', () => {
    const Comp = styled.div`
      color: ${ props => props.color }
    `

    expect(Comp.componentStyle.isStatic).toEqual(false)
  })

  it('should mark components with numeric attriutes as static', () => {
    const Comp = styled.div.attrs({
      style: {
        color: 'purple'
      },
      height: 100,
    })``

    expect(Comp.componentStyle.isStatic).toEqual(true)      
  })

  it('should mark components with dynamic attributes as not static', () => {
    const Comp = styled.div.attrs({
      style: props => ({
        height: props.height,
      })
    })``

    expect(Comp.componentStyle.isStatic).toEqual(false)      
  })
})
