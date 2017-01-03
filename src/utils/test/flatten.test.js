// @flow
import expect from 'expect'
import flatten from '../flatten'

describe('flatten', () => {
  it('doesnt merge strings', () => {
    expect(flatten(['foo', 'bar', 'baz'])).toEqual(['foo', 'bar', 'baz'])
  })
  it('drops nulls', () => {
    // $FlowInvalidInputTest
    expect(flatten(['foo', false, 'bar', undefined, 'baz', null])).toEqual(['foo', 'bar', 'baz'])
  })
  it('doesnt drop any numbers', () => {
    expect(flatten(['foo', 0, 'bar', NaN, 'baz', -1])).toEqual(['foo', '0', 'bar', 'NaN', 'baz', '-1'])
  })
  it('toStrings everything', () => {
    // $FlowInvalidInputTest
    expect(flatten([1, true])).toEqual(['1', 'true'])
  })
  it('hypenates objects', () => {
    const obj = {
      fontSize: '14px',
      WebkitFilter: 'blur(2px)',
    }
    const css = 'font-size: 14px; -webkit-filter: blur(2px);'
    // $FlowFixMe
    expect(flatten([obj])).toEqual([css])
    // $FlowFixMe
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual(['some:thing;', css, 'something: else;'])
  })
  it('handles nested objects', () => {
    const obj = {
      fontSize: '14px',
      '@media screen and (min-width: 250px)': {
        fontSize: '16px',
      },
      '&:hover': {
        fontWeight: 'bold',
      },
    }
    const css = 'font-size: 14px; @media screen and (min-width: 250px) {\n  font-size: 16px;\n} &:hover {\n  font-weight: bold;\n}'
    // $FlowFixMe
    expect(flatten([obj])).toEqual([css])
    // $FlowFixMe
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual(['some:thing;', css, 'something: else;'])
  })
  it('toStrings class instances', () => {
    class SomeClass {
      toString() {
        return 'some: thing;'
      }
    }
    // $FlowFixMe
    expect(flatten([new SomeClass()])).toEqual(['some: thing;'])
  })
  it('flattens subarrays', () => {
    // $FlowFixMe
    expect(flatten([1, 2, [3, 4, 5], 'come:on;', 'lets:ride;'])).toEqual(['1', '2', '3', '4', '5', 'come:on;', 'lets:ride;'])
  })
  it('defers functions', () => {
    const func = () => 'bar'
    // $FlowFixMe
    const funcWFunc = () => ['static', subfunc => subfunc ? 'bar' : 'baz']
    expect(flatten(['foo', func, 'baz'])).toEqual(['foo', func, 'baz'])
    expect(flatten(['foo', funcWFunc, 'baz'])).toEqual(['foo', funcWFunc, 'baz'])
  })
  it('executes functions', () => {
    const func = () => 'bar'
    expect(flatten(['foo', func, 'baz'], { bool: true })).toEqual(['foo', 'bar', 'baz'])
  })
  it('passes values to function', () => {
    const func = ({ bool }) => bool ? 'bar' : 'baz'
    expect(flatten(['foo', func], { bool: true })).toEqual(['foo', 'bar'])
    expect(flatten(['foo', func], { bool: false })).toEqual(['foo', 'baz'])
  })
  it('recursively calls functions', () => {
    // $FlowFixMe
    const func = () => ['static', ({ bool }) => bool ? 'bar' : 'baz']
    expect(flatten(['foo', func], { bool: true })).toEqual(['foo', 'static', 'bar'])
    expect(flatten(['foo', func], { bool: false })).toEqual(['foo', 'static', 'baz'])
  })
})
