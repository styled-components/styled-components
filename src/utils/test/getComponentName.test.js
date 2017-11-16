// @flow
import getComponentName from '../getComponentName'

describe('getComponentName', () => {
  it('defaults to reusing the component displayName', () => {
    expect(getComponentName({ displayName: 'Foo' })).toEqual('Foo')
  })

  it('falls back to the class name', () => {
    expect(getComponentName({ name: 'Bar' })).toEqual('Bar')
  })

  it('ultimately falls back to "Component"', () => {
    expect(getComponentName({})).toEqual('Component')
  })
})
