import expect from 'expect'
import toggle from '../toggle'

describe('toggle', () => {
  it('should handle an empty case', () => {
    const namespace = toggle('namespace', {})
    expect(namespace()).toEqual([])
    expect(namespace('')).toEqual([])
    expect(namespace(' ')).toEqual([])
  })

  it('should always inject default even if no input passed', () => {
    const namespace = toggle('namespace', {
      default: 'default: rule',
    })
    expect(namespace()).toEqual(['default: rule;'])
    expect(namespace('')).toEqual(['default: rule;'])
    expect(namespace(' ')).toEqual(['default: rule;'])
  })

  it('should handle any combination of inputs', () => {
    const namespace = toggle('namespace', {
      default: 'default: rule',
      a: 'option: a',
      b: 'option: b',
    })
    expect(namespace()).toEqual(['default: rule;'])
    expect(namespace('a')).toEqual(['default: rule;', 'option: a;'])
    expect(namespace('a b')).toEqual(['default: rule;', 'option: a;', 'option: b;'])
    expect(namespace('b a')).toEqual(['default: rule;', 'option: b;', 'option: a;'])
    expect(namespace('b')).toEqual(['default: rule;', 'option: b;'])
  })

  it('should be ok without a default', () => {
    const namespace = toggle('namespace', {
      a: 'option: a',
      b: 'option: b',
    })
    expect(namespace()).toEqual([])
    expect(namespace('a')).toEqual(['option: a;'])
    expect(namespace('a b')).toEqual(['option: a;', 'option: b;'])
    expect(namespace('b a')).toEqual(['option: b;', 'option: a;'])
    expect(namespace('b')).toEqual(['option: b;'])
  })

  it('should throw if passed something not present', () => {
    const namespace = toggle('namespace', {
      a: 'option: a',
    })
    expect(() => namespace('b')).toThrow("namespace: Unknown value 'b'. Valid values are:\na")
  })

  it('should not mention the default as a valid', () => {
    const namespace = toggle('namespace', {
      default: 'default: rule',
      a: 'option: a',
    })
    expect(() => namespace('b')).toThrow("namespace: Unknown value 'b'. Valid values are:\na")
  })
})
