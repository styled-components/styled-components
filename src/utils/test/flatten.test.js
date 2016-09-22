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
    const funcWFunc = bool => ['static', subfunc => subfunc ? 'bar' : 'baz']
    expect(flatten(['foo', func, 'baz'])).toEqual(['foo', func, 'baz'])
    expect(flatten(['foo', funcWFunc, 'baz'])).toEqual(['foo', funcWFunc, 'baz'])
  })
  it('executes functions', () => {
    const func = () => 'bar'
    expect(flatten(['foo', func, 'baz'], [true])).toEqual(['foo', 'bar', 'baz'])
  })
  it('passes values to function', () => {
    const func = bool => bool ? 'bar' : 'baz'
    expect(flatten(['foo', func], [true])).toEqual(['foo', 'bar'])
    expect(flatten(['foo', func], [false])).toEqual(['foo', 'baz'])
  })
  it('recursively calls functions', () => {
    const func = bool => ['static', subfunc => subfunc ? 'bar' : 'baz']
    expect(flatten(['foo', func], [true])).toEqual(['foo', 'static', 'bar'])
    expect(flatten(['foo', func], [false])).toEqual(['foo', 'static', 'baz'])
  })
})
