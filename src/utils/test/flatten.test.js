import expect from 'expect'
import flatten from '../flatten'

describe('flatten', () => {
  it('doesnt merge strings', () => {
    expect(flatten(['foo', 'bar', 'baz'])).toEqual(['foo', 'bar', 'baz'])
  })
  it('drops nulls', () => {
    expect(flatten(['foo', false, 'bar', undefined, 'baz', null])).toEqual(['foo', 'bar', 'baz'])
  })
  it('toStrings everything', () => {
    expect(flatten([1, true])).toEqual(['1','true'])
  })
  it('hypenates objects', () => {
    const obj = {
      fontSize: '14px',
      WebkitFilter: 'blur(2px)'
    }
    const css = 'font-size: 14px; -webkit-filter: blur(2px);'
    expect(flatten([obj])).toEqual([css])
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual(['some:thing;', css, 'something: else;'])
  })
  it('flattens subarrays', () => {
    expect(flatten([1, 2, [3, 4, 5], "come:on;", "lets:ride;"])).toEqual(['1', '2', '3','4','5','come:on;','lets:ride;'])
  })
  it('defers functions', () => {
    const func = () => 'bar'
    expect(flatten(['foo', func, 'baz'])).toEqual(['foo', func, 'baz'])
  })
})
