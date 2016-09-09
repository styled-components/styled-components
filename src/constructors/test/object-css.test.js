import expect from 'expect'
import objectCSS from '../object-css'
import Rule from '../../models/Rule'
import RuleSet from '../../models/RuleSet'

describe('objectCSS', () => {
	it('should be ok with nonce inputs', () => {
		expect(objectCSS({}).rules).toEqual([])
		expect(objectCSS(undefined).rules).toEqual([])
		expect(objectCSS(null).rules).toEqual([])
	})

	it('should handle a simple rule', () => {
		const ruleSet = new RuleSet()
		const rule = new Rule('backgroundColor', 'blue')
		ruleSet.add(rule)
		expect(objectCSS({
			backgroundColor: 'blue'
		})).toEqual(ruleSet);
	})

	it('should handle dashed rules', () => {
		const ruleSet = new RuleSet()
		const rule = new Rule('backgroundColor', 'blue')
		ruleSet.add(rule)
		expect(objectCSS({
			'background-color': 'blue'
		})).toEqual(ruleSet);
	})

	it('should handle multiple rules', () => {
		const ruleSet = new RuleSet()
		const rule1 = new Rule('backgroundColor', 'blue')
		const rule2 = new Rule('border', 'none')
		ruleSet.add(rule1, rule2)
		expect(objectCSS({
			backgroundColor: 'blue',
			border: 'none',
		})).toEqual(ruleSet);
	})

	it('should not pass through duplicates', () => {
		const ruleSet = new RuleSet()
		const rule1 = new Rule('backgroundColor', 'red')
		const rule2 = new Rule('border', 'none')
		ruleSet.add(rule1, rule2)
		expect(objectCSS({
			backgroundColor: 'blue',
			border: 'none',
			backgroundColor: 'red',
		})).toEqual(ruleSet);
	})
})
