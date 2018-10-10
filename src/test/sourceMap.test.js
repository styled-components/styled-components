// @flow
import React from 'react'
import { resetStyled } from './utils'
import { shallow } from 'enzyme'
import { join } from 'path'

let styled

describe('sourceMap', () => {
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should inject sourceMap', () => {
    const fakeSourceMap = '/* fake source map */'
    const Named1 = styled.div.withConfig({
      sourceMap: fakeSourceMap,
    })``
    shallow(<Named1 />)
    const allStyles = Array.from(document.querySelectorAll('style'))
      .map(tag => tag.innerHTML)
      .join('\n')
    expect(allStyles.includes(fakeSourceMap))
  })
})
