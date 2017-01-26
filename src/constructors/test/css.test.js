// @flow
import expect from 'expect'
import css from '../css'

describe('css', () => {
  it('properly handles nested functions', () => {
    const func = (...args) => css`${css(...args)}`;
    const cssResult = `${func`There should not be commas around me`}`;
    const expected = `There should not be commas around me`
    expect(cssResult).toEqual(expected)
  })
  it('properly handles nested functions other styles', () => {
    const func = (...args) => css`display: flex; ${css(...args)}`;
    const cssResult = `${func`There should not be commas around me`}`;
    const expected = `display: flex; There should not be commas around me`
    expect(cssResult).toEqual(expected)
  })
})
