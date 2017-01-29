import {
  assembleAndInterleavePlaceholders,
  cssWithPlaceholdersToArr
} from '../../src/css/preprocess'

describe('css preprocessing', () => {
  describe('assembleAndInterleavePlaceholders', () => {
    it('joins the strings with placeholders', () => {
      const input = ['A', 'B', 'C']
      const expected = 'A__PLACEHOLDER_0__;B__PLACEHOLDER_1__;C'
      const actual = assembleAndInterleavePlaceholders(input)

      expect(actual).toBe(expected)
    })

    it('leaves out the semicolon after placeholders for curly braces in the CSS partial', () => {
      const input = ['A', ' {', 'C}']
      const expected = 'A__PLACEHOLDER_0__ {__PLACEHOLDER_1__;C}'
      const actual = assembleAndInterleavePlaceholders(input)

      expect(actual).toBe(expected)
    })
  })

  describe('cssWithPlaceholdersToArr', () => {
    it('splits by placeholders and interleaves with interpolation nodes', () => {
      const mockNodes = [{}, {}]
      const css = 'A__PLACEHOLDER_0__B__PLACEHOLDER_1__C'

      const res = cssWithPlaceholdersToArr(css, mockNodes)

      expect(res).toEqual([ 'A', {}, 'B', {}, 'C' ])
      expect(res[1]).toBe(mockNodes[0])
      expect(res[3]).toBe(mockNodes[1])
    })

    it('keeps the extra semicolons intact', () => {
      const mockNodes = [{}]
      const css = 'A__PLACEHOLDER_0__;;B'
      const res = cssWithPlaceholdersToArr(css, mockNodes)

      expect(res).toEqual([ 'A', {}, ';;B' ])
    })
  })
})
