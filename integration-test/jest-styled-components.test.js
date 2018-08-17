// @flow
import React from 'react'
import styled from '..'
import renderer from 'react-test-renderer'
import 'jest-styled-components'

// jest.mock('styled-components', () => require('../dist/styled-components.cjs'))

const Button = styled.button`
  color: red;
`

xtest('it works', () => {
  const tree = renderer.create(<Button />).toJSON()
  expect(tree).toMatchSnapshot()
  expect(tree).toHaveStyleRule('color', 'red')
})
