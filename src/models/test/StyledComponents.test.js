// @flow
/* eslint-disable react/no-multi-comp */
import { Component } from 'react'
import { resetStyled } from '../../test/utils'

let styled

describe('StyledComponents', () => {
  beforeEach(() => {
    styled = resetStyled(true)
  })

  it('should have isReactComponent on its prototype', () => {
    const Title = styled.h1`color: palevioletred;`
    expect(Object.getPrototypeOf(Title).isReactComponent).toEqual(Component.prototype.isReactComponent)
  })
});
