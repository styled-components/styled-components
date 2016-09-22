import expect from 'expect'
import toggle from '../toggle'

describe('toggle', () => {
  const defaultRule = `default: rule`
  const optionA = `option: a`
  const optionB = `option: b`

  it('should handle an empty case', () => {
    const namespace = toggle('namespace', {})
    expect(namespace()).toEqual([])
    expect(namespace('')).toEqual([])
    expect(namespace(' ')).toEqual([])
  })

  it('should always inject default even if no input passed', () => {
    const namespace = toggle('namespace', {
      default: defaultRule,
    })
    expect(namespace()).toEqual([defaultRule])
    expect(namespace('')).toEqual([defaultRule])
    expect(namespace(' ')).toEqual([defaultRule])
  })

  it('should handle any combination of inputs', () => {
    const namespace = toggle('namespace', {
      default: defaultRule,
      a: optionA,
      b: optionB,
    })
    expect(namespace()).toEqual([defaultRule])
    expect(namespace('a')).toEqual([defaultRule, optionA])
    expect(namespace('a b')).toEqual([defaultRule, optionA, optionB])
    expect(namespace('b a')).toEqual([defaultRule, optionB, optionA])
    expect(namespace('b')).toEqual([defaultRule, optionB])
  })

  it('should be ok without a default', () => {
    const namespace = toggle('namespace', {
      a: optionA,
      b: optionB,
    })
    expect(namespace()).toEqual([])
    expect(namespace('a')).toEqual([optionA])
    expect(namespace('a b')).toEqual([optionA, optionB])
    expect(namespace('b a')).toEqual([optionB, optionA])
    expect(namespace('b')).toEqual([optionB])
  })

  it('should throw if passed something not present', () => {
    const namespace = toggle('namespace', {
      a: optionA,
    })
    expect(() => namespace('b')).toThrow("namespace: Unknown value 'b'. Valid values are:\na")
  })

  it('should not mention the default as a valid', () => {
    const namespace = toggle('namespace', {
      default: defaultRule,
      a: optionA,
    })
    expect(() => namespace('b')).toThrow("namespace: Unknown value 'b'. Valid values are:\na")
  })
})
