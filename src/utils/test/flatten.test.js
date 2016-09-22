import expect from 'expect'
import flatten from '../flatten'

describe('flatten', () => {
  it('merges strings', () => {
    expect(flatten(['foo', 'bar', 'baz'])).toEqual(['foobarbaz'])
  })
  it('drops nulls', () => {
    expect(flatten(['foo', false, 'bar', undefined, 'baz', null])).toEqual(['foobarbaz'])
  })
  it('hypenates objects', () => {
    const obj = {
      fontSize: '14px',
      WebkitFilter: 'blur(2px)'
    }
    const css = 'font-size: 14px; -webkit-filter: blur(2px);'
    expect(flatten([obj])).toEqual([css])
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual([`some:thing;${css}something: else;`])
  })
  it('flattens subarrays', () => {
    expect(flatten([1, 2, [3, 4, 5], "come:on;", "lets:ride;"])).toEqual(['12', '345come:on;lets:ride;'])
  })
})
