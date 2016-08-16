import expect from 'expect'
import {
	unit,
	vh,
	vw,
	px,
	rem,
	em,
} from './'

describe('units', () => {
	describe('unit factory', () => {
		it('should create a function when first called', () => {
			const result = unit('vh')
			expect(result).toBeA(Function)
		})

		it('should create a function with one argument', () => {
			const result = unit('vh')
			expect(result.length).toBe(1)
		})

		it('should create a string from the two arguments to the two functions', () => {
			const unitSuffix = 'vh'
			const unitAmount = 10
			const unitFactory = unit(unitSuffix)
			const result = unitFactory(unitAmount)
			expect(result).toBe(`${unitAmount}${unitSuffix}`)
		})

		it('should create a string with the unit suffix multiple times', () => {
			const unitSuffix = 'vh'
			const unitFactory = unit(unitSuffix)
			const result1 = unitFactory(10)
			const result2 = unitFactory(20)
			expect(result1).toBeA('string')
			expect(result2).toBeA('string')
		})
	})

	describe('exported units', () => {
		it('should export vh', () => {
			const unitAmount = 10
			const result = vh(10)
			expect(result).toBe(`${unitAmount}vh`)
		})

		it('should export vw', () => {
			const unitAmount = 10
			const result = vw(10)
			expect(result).toBe(`${unitAmount}vw`)
		})

		it('should export px', () => {
			const unitAmount = 10
			const result = px(10)
			expect(result).toBe(`${unitAmount}px`)
		})

		it('should export rem', () => {
			const unitAmount = 10
			const result = rem(10)
			expect(result).toBe(`${unitAmount}rem`)
		})

		it('should export em', () => {
			const unitAmount = 10
			const result = em(10)
			expect(result).toBe(`${unitAmount}em`)
		})
	})
})
