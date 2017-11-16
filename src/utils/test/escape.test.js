// @flow
import escape from '../escape'

describe('escape', () => {
  it('replaces characters that could be part of CSS selectors', () => {
    expect(escape('foo(bar):#*$><+~=|^baz')).toEqual('foo-bar-baz')
  })

  it('replaces double hyphens with a single hyphen', () => {
    expect(escape('foo--bar')).toEqual('foo-bar')
  })

  it('removes extraneous hyphens at the ends of the string', () => {
    expect(escape('-foo--bar-')).toEqual('foo-bar')
  })
})
