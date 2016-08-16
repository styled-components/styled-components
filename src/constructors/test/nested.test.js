import expect from 'expect'
import nested from '../nested'
import NestedSelector from '../../models/NestedSelector'
import RuleSet from '../../models/RuleSet'
import ValidRuleSetChild from '../../models/ValidRuleSetChild'

describe('nested', () => {
	it('should return a NestedSelector', () => {
		const result = nested()
		expect(result).toBeA(NestedSelector)
	})

	it('should add the selector', () => {
		const selector = '> *'
		const result = nested(selector)
		expect(result.selector).toEqual(selector)
	})

	it('should have a RuleSet', () => {
		const rule = new ValidRuleSetChild()
		const result = nested(undefined, rule)
		expect(result.ruleSet).toBeA(RuleSet)
	})

	it('should add a rule to the RuleSet', () => {
		const rule = new ValidRuleSetChild()
		const result = nested(undefined, rule)
		expect(result.ruleSet.rules).toEqual([rule])
	})

	it('should add multiple rules to the RuleSet', () => {
		const rule1 = new ValidRuleSetChild()
		const rule2 = new ValidRuleSetChild()
		const result = nested(undefined, rule1, rule2)
		expect(result.ruleSet.rules).toEqual([rule1, rule2])
	})
})