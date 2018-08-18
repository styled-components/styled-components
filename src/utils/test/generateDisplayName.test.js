import React from 'react'
import generateDisplayName from '../generateDisplayName'

it('handles a string type', () => {
  expect(generateDisplayName('div')).toBe('styled.div')
})

it('handles a React class type', () => {
  class Foo extends React.Component {}

  expect(generateDisplayName(Foo)).toBe('Styled(Foo)')
})

it('handles a React class type with displayName', () => {
  class Foo extends React.Component {
    static displayName = 'Bar'
  }

  expect(generateDisplayName(Foo)).toBe('Styled(Bar)')
})
