// @flow
import flatten from '../flatten'

describe('preparsed flatten without executionContext', () => {
  it('doesnt merge strings', () => {
    expect(flatten([['foo', 'bar', 'baz']])).toEqual([['foo', 'bar', 'baz']])
  })

  it('drops nulls', () => {
    // $FlowInvalidInputTest
    expect(flatten([['foo', false, 'bar', undefined, 'baz', null]])).toEqual([['foo', 'bar', 'baz']])
  })

  it('doesnt drop any numbers', () => {
    expect(flatten([['foo', 0, 'bar', NaN, 'baz', -1]])).toEqual([['foo', '0', 'bar', 'NaN', 'baz', '-1']])
  })

  it('toStrings everything', () => {
    // $FlowInvalidInputTest
    expect(flatten([[1, true]])).toEqual([['1', 'true']])
  })

  it('hypenates objects', () => {
    const obj = {
      fontSize: '14px',
      WebkitFilter: 'blur(2px)',
    }
    const css = 'font-size: 14px; -webkit-filter: blur(2px);'
    // $FlowFixMe
    expect(flatten([[obj]])).toEqual([[css]])
    // $FlowFixMe
    expect(flatten([['some:thing;', obj, 'something: else;']])).toEqual([['some:thing;', css, 'something: else;']])
  })

  it('flattens nested rulesets', () => {
    expect(
      flatten([[
        'a', [[ 'c' ]], 'b'
      ]])
    ).toEqual([['a', 'b'], ['c']])
  })

  it('flattens double nested rulesets', () => {
    expect(
      flatten([[
        'a', [[ 'c', [['d']] ]], 'b'
      ]])
    ).toEqual([['a', 'b'], ['c'], ['d']])
  })

  it('flattens subarrays', () => {
    expect(flatten([[1, 2, [3, 4, 5], 'come:on;', 'lets:ride;']]))
      .toEqual([['1', '2', '3', '4', '5', 'come:on;', 'lets:ride;']])
  })

  it('defers functions', () => {
    const func = () => 'bar'

    expect(flatten([['foo', func, 'baz']])).toEqual([['foo', func, 'baz']])
  })
})

describe('preparsed flatten with executionContext', () => {
  it('merges strings', () => {
    expect(flatten([['foo', 'bar', 'baz']], {})).toEqual(['foobarbaz'])
  })

  it('drops nulls', () => {
    // $FlowInvalidInputTest
    expect(flatten([['foo', false, 'bar', undefined, 'baz', null]], {})).toEqual(['foobarbaz'])
  })

  it('doesnt drop any numbers', () => {
    expect(flatten([['foo', 0, 'bar', NaN, 'baz', -1]], {})).toEqual(['foo0barNaNbaz-1'])
  })

  it('toStrings everything', () => {
    // $FlowInvalidInputTest
    expect(flatten([[1, true]], {})).toEqual(['1true'])
  })

  it('hypenates objects', () => {
    const obj = {
      fontSize: '14px',
      WebkitFilter: 'blur(2px)',
    }
    const css = 'font-size: 14px; -webkit-filter: blur(2px);'
    // $FlowFixMe
    expect(flatten([[obj]], {})).toEqual([css])
    // $FlowFixMe
    expect(flatten([['some:thing;', obj, 'something: else;']], {}))
      .toEqual(['some:thing;' + css + 'something: else;'])
  })

  it('flattens nested rulesets', () => {
    expect(
      flatten([[
        'a', [[ 'c' ]], 'b'
      ]], {})
    ).toEqual(['ab', 'c'])
  })

  it('flattens double nested rulesets', () => {
    expect(
      flatten([[
        'a', [[ 'c', 'd', [['e', 'f'], ['g', 'h']] ]], 'b'
      ]], {})
    ).toEqual(['ab', 'cd', 'ef', 'gh'])
  })

  it('flattens subarrays', () => {
    expect(flatten([[1, 2, [3, 4, 5], 'come:on;', 'lets:ride;']], {}))
      .toEqual(['12345come:on;lets:ride;'])
  })

  it('executes functions', () => {
    const func = () => 'bar'
    expect(flatten([['foo', func, 'baz']], {})).toEqual(['foobarbaz'])
  })

  it('resolves rulesets after executing functions', () => {
    const func = () => [['add me to the end']]
    expect(flatten([['foo', func, 'baz']], {})).toEqual(['foobaz', 'add me to the end'])
  })

  it('resolves double nested rulesets after executing functions', () => {
    const func = () => [['a', [['b']]]]
    expect(flatten([['foo', func, 'baz']], {})).toEqual(['foobaz', 'a', 'b'])
  })
})
