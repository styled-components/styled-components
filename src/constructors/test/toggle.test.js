import expect from 'expect'
import toggle from '../toggle'
import concat from '../concat'
import rule from '../rule'

describe('toggle', () => {
  const defaultRule = rule('default', 'rule')
  const optionA = rule('option', 'a')
  const optionB = rule('option', 'b')

  it('should handle an empty case', () => {
    const namespace = toggle('namespace', {})
    expect(namespace()).toEqual(concat())
    expect(namespace('')).toEqual(concat())
    expect(namespace(' ')).toEqual(concat())
  })

  it('should always inject default even if no input passed', () => {
    const namespace = toggle('namespace', {
      default: defaultRule
    })
    expect(namespace()).toEqual(concat(defaultRule))
    expect(namespace('')).toEqual(concat(defaultRule))
    expect(namespace(' ')).toEqual(concat(defaultRule))
  })

  it('should handle any combination of inputs', () => {
    const namespace = toggle('namespace', {
      default: defaultRule,
      a: optionA,
      b: optionB
    })
    expect(namespace()).toEqual(concat(defaultRule))
    expect(namespace('a')).toEqual(concat(defaultRule, optionA))
    expect(namespace('a b')).toEqual(concat(defaultRule, optionA, optionB))
    expect(namespace('b a')).toEqual(concat(defaultRule, optionB, optionA))
    expect(namespace('b')).toEqual(concat(defaultRule, optionB))
  })

  it('should be ok without a default', () => {
    const namespace = toggle('namespace', {
      a: optionA,
      b: optionB
    })
    expect(namespace()).toEqual(concat())
    expect(namespace('a')).toEqual(concat(optionA))
    expect(namespace('a b')).toEqual(concat(optionA, optionB))
    expect(namespace('b a')).toEqual(concat(optionB, optionA))
    expect(namespace('b')).toEqual(concat(optionB))
  })

  it('should throw if passed something not present', () => {
    const namespace = toggle('namespace', {
      a: optionA
    })
    expect(() => namespace('b')).toThrow("namespace: Unknown value 'b'. Valid values are:\na")
  })

  it('should not mention the default as a valid', () => {
    const namespace = toggle('namespace', {
      default: defaultRule,
      a: optionA
    })
    expect(() => namespace('b')).toThrow("namespace: Unknown value 'b'. Valid values are:\na")
  })
})
