import expect from 'expect'
import media from '../media'
import MediaQuery from '../../models/MediaQuery'
import RuleSet from '../../models/RuleSet'
import ValidRuleSetChild from '../../models/ValidRuleSetChild'

describe('media', () => {
	it('should return a media query', () => {
		const result = media()
		expect(result).toBeA(MediaQuery)
	})

	it('should add the query', () => {
		const query = 'max-width: 200px'
		const result = media(query)
		expect(result.query).toEqual(query)
	})

	it('should have a RuleSet', () => {
		const rule = new ValidRuleSetChild()
		const result = media(undefined, rule)
		expect(result.ruleSet).toBeA(RuleSet)
	})

	it('should add a rule to the RuleSet', () => {
		const rule = new ValidRuleSetChild()
		const result = media(undefined, rule)
		expect(result.ruleSet.rules).toEqual([rule])
	})

	it('should add multiple rules to the RuleSet', () => {
		const rule1 = new ValidRuleSetChild()
		const rule2 = new ValidRuleSetChild()
		const result = media(undefined, rule1, rule2)
		expect(result.ruleSet.rules).toEqual([rule1, rule2])
	})
})