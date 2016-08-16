import expect from 'expect'
import concat from '../concat'
import RuleSet from '../../models/RuleSet'
import ValidRuleSetChild from '../../models/ValidRuleSetChild'

describe('concat', () => {
	it('should create a RuleSet', () => {
		const result = concat()
		expect(result).toBeA(RuleSet)
	})

	it('should add a rule', () => {
		const rule = new ValidRuleSetChild()
		const result = concat(rule)
		expect(result.rules).toEqual([rule])
	})

	it('should add multiple rules', () => {
		const rule1 = new ValidRuleSetChild()
		const rule2 = new ValidRuleSetChild()
		const result = concat(rule1, rule2)
		expect(result.rules).toEqual([rule1, rule2])
	})
})