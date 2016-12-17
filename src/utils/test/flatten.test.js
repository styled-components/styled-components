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
    // $FlowIssue
    expect(flatten([obj])).toEqual([css])
    // $FlowIssue
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual(['some:thing;', css, 'something: else;'])
  })
  it('adds px to numbers in objects', () => {
    const obj = {
      fontSize: 14,
      height: 100,
    }
    const css = 'font-size: 14px; height: 100px;'
    // $FlowIssue
    expect(flatten([obj])).toEqual([css])
    // $FlowIssue
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual(['some:thing;', css, 'something: else;'])
  })
  it('handles numbers in objects that shouldn\'t get px appended', () => {
    const obj = {
      'animation-delay': 10,
      'animation-duration': 10,
      'perspective-origin-x': 10,
      'perspective-origin-y': 10,
      'transform-origin': 10,
      'transform-origin-x': 10,
      'transform-origin-y': 10,
      'transform-origin-z': 10,
      'transition-delay': 10,
      'transition-duration': 10,
    }
    const css = 'animation-delay: 10ms; animation-duration: 10ms; perspective-origin-x: 10%; perspective-origin-y: 10%; transform-origin: 10%; transform-origin-x: 10%; transform-origin-y: 10%; transform-origin-z: 10%; transition-delay: 10ms; transition-duration: 10ms;'
    // $FlowIssue
    expect(flatten([obj])).toEqual([css])
    // $FlowIssue
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual(['some:thing;', css, 'something: else;'])
  })
  it('handles numbers in objects that should\'t get anything appended', () => {
    const obj = {
      'animation-iteration-count': 10,
      'border-image-outset': 10,
      'border-image-slice': 10,
      'border-image-width': 10,
      'box-flex': 10,
      'box-flex-group': 10,
      'box-ordinal-group': 10,
      'column-count': 10,
      flex: 10,
      'flex-grow': 10,
      'flex-positive': 10,
      'flex-shrink': 10,
      'flex-negative': 10,
      'flex-order': 10,
      'grid-row': 10,
      'grid-column': 10,
      'font-weight': 10,
      'line-clamp': 10,
      'line-height': 10,
      opacity: 10,
      order: 10,
      orphans: 10,
      'tab-size': 10,
      widows: 10,
      'z-index': 10,
      zoom: 10,
      'fill-opacity': 10,
      'flood-opacity': 10,
      'stop-opacity': 10,
      'stroke-dasharray': 10,
      'stroke-dashoffset': 10,
      'stroke-miterlimit': 10,
      'stroke-opacity': 10,
      'stroke-width': 10,
    }
    const css = 'animation-iteration-count: 10; border-image-outset: 10; border-image-slice: 10; border-image-width: 10; box-flex: 10; box-flex-group: 10; box-ordinal-group: 10; column-count: 10; flex: 10; flex-grow: 10; flex-positive: 10; flex-shrink: 10; flex-negative: 10; flex-order: 10; grid-row: 10; grid-column: 10; font-weight: 10; line-clamp: 10; line-height: 10; opacity: 10; order: 10; orphans: 10; tab-size: 10; widows: 10; z-index: 10; zoom: 10; fill-opacity: 10; flood-opacity: 10; stop-opacity: 10; stroke-dasharray: 10; stroke-dashoffset: 10; stroke-miterlimit: 10; stroke-opacity: 10; stroke-width: 10;'
    // $FlowIssue
    expect(flatten([obj])).toEqual([css])
    // $FlowIssue
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
    // $FlowIssue
    expect(flatten([obj])).toEqual([css])
    // $FlowIssue
    expect(flatten(['some:thing;', obj, 'something: else;'])).toEqual(['some:thing;', css, 'something: else;'])
  })
  it('toStrings class instances', () => {
    class SomeClass {
      toString() {
        return 'some: thing;'
      }
    }
    // $FlowIssue
    expect(flatten([new SomeClass()])).toEqual(['some: thing;'])
  })
  it('flattens subarrays', () => {
    // $FlowIssue
    expect(flatten([1, 2, [3, 4, 5], 'come:on;', 'lets:ride;'])).toEqual(['1', '2', '3', '4', '5', 'come:on;', 'lets:ride;'])
  })
  it('defers functions', () => {
    const func = () => 'bar'
    // $FlowIssue
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
    // $FlowIssue
    const func = () => ['static', ({ bool }) => bool ? 'bar' : 'baz']
    expect(flatten(['foo', func], { bool: true })).toEqual(['foo', 'static', 'bar'])
    expect(flatten(['foo', func], { bool: false })).toEqual(['foo', 'static', 'baz'])
  })
})
