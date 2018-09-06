import React from 'react'
import styled, { css } from 'styled-components'
import renderer from 'react-test-renderer'

jest.mock('styled-components', () =>
  require('../no-tags/dist/styled-components-no-tags.cjs')
)

const partial = css`
  background: blue;
`

const Button = styled('button')`
  ${partial};
  color: red;
`

test('it works', () => {
  renderer.create(<Button />).toJSON()
})
