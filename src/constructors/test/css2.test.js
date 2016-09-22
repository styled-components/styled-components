import expect from 'expect'
import css, {interleave, flatten} from '../css2'

describe('interleave', () => {
  it('blindly interleave', () => {
    expect(interleave([], [])).toEqual([undefined])
    expect(interleave(['foo'], [])).toEqual(['foo'])
    expect(interleave(['foo'], [1])).toEqual(['foo', 1, undefined])
    expect(interleave(['foo', 'bar'], [1])).toEqual(['foo', 1, 'bar'])
  })
  it('should be driven off the number of interpolations', () => {
    expect(interleave(['foo', 'bar'], [])).toEqual(['foo'])
    expect(interleave(['foo', 'bar', 'baz'], [1])).toEqual(['foo', 1, 'bar'])
    expect(interleave([], [1])).toEqual([undefined, 1, undefined])
    expect(interleave(['foo'], [1, 2, 3])).toEqual(['foo', 1, undefined, 2, undefined, 3, undefined])
  })
})

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
})
