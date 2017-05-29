import {
  assembleAndInterleavePlaceholders,
  cssWithPlaceholdersToArr
} from '../../src/css/preprocessUtils'

describe('css preprocessing', () => {
  describe('assembleAndInterleavePlaceholders', () => {
    it('puts in semicolons after mixins', () => {
      const input = ['A', ' {', '\nC:D}']
      const expected = 'A__PLACEHOLDER_0__ {__PLACEHOLDER_1__;\nC:D}'
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
