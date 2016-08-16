import RuleSet from '../RuleSet'
import Rule from '../Rule'
import MediaQuery from '../MediaQuery'
import NestedSelector from '../NestedSelector'
import ValidRuleSetChild from '../ValidRuleSetChild'
import expect from 'expect'

describe('RuleSet', () => {
	describe('add', () => {
		it('should add a rule', () => {
			const rule = new ValidRuleSetChild()
			const ruleSet = new RuleSet()
			ruleSet.add(rule)
			expect(ruleSet.rules).toEqual([rule])
		})

		it('should add multiple rules', () => {
			const rule1 = new ValidRuleSetChild()
			const rule2 = new ValidRuleSetChild()
			const ruleSet = new RuleSet()
			ruleSet.add(rule1, rule2)
			expect(ruleSet.rules).toEqual([rule1, rule2])
		})

		it('should ignore falsy values', () => {
			const rule1 = new ValidRuleSetChild()
			const rule2 = new ValidRuleSetChild()
			const ruleSet = new RuleSet()
			ruleSet.add(rule1, undefined, false, 0, null, NaN, '', "", rule2)
			expect(ruleSet.rules).toEqual([rule1, rule2])
		})

		it('should add a ruleset', () => {
			// First ruleset
			const rule = new ValidRuleSetChild()
			const firstRuleSet = new RuleSet()
			firstRuleSet.add(rule)
			expect(firstRuleSet.rules).toEqual([rule])
			// Second ruleset
			const secondRuleSet = new RuleSet()
			secondRuleSet.add(firstRuleSet)
			expect(secondRuleSet.rules).toEqual(firstRuleSet.rules)
		})

		it('should add a ruleset to other rules', () => {
			// First ruleset
			const rule = new ValidRuleSetChild()
			const firstRuleSet = new RuleSet()
			firstRuleSet.add(rule)
			expect(firstRuleSet.rules).toEqual([rule])
			// Second ruleset
			const secondRuleSet = new RuleSet()
			secondRuleSet.add(rule);
			secondRuleSet.add(firstRuleSet)
			expect(secondRuleSet.rules).toEqual([rule].concat(firstRuleSet.rules))
		})

		it('should throw if an invalid rule is passed in', () => {
			const ruleSet = new RuleSet()
			expect(() => {
				ruleSet.add('not a valid rule')
			}).toThrow(/Can\'t add this \^ to a RuleSet./)
		})
	})

	describe('flatten', () => {
		it('should flatten two rules', () => {
			const rule1 = { prop: 'something', value: 'else' }
			const rule2 = { prop: 'completely', value: 'different' }
			const ruleSet = new RuleSet()
			ruleSet.add(
				new Rule(rule1.prop, rule1.value),
				new Rule(rule2.prop, rule2.value)
			)
			const result = ruleSet.flatten();
			expect(result.rules).toEqual({
				[rule1.prop]: rule1.value,
				[rule2.prop]: rule2.value,
			})
		})

		it('should override same properties', () => {
			const rule1 = { prop: 'something', value: 'else' }
			const rule2 = { prop: 'something', value: 'different' }
			const ruleSet = new RuleSet()
			ruleSet.add(
				new Rule(rule1.prop, rule1.value),
				new Rule(rule2.prop, rule2.value)
			)
			const result = ruleSet.flatten();
			expect(result.rules).toEqual({
				[rule2.prop]: rule2.value,
			})
		})

		it('should flatten media queries', () => {
			const rule = { prop: 'something', value: 'else' }
			const query = 'max-width: 350px';
			// Media query
			const mediaQueryRuleSet = new RuleSet()
			mediaQueryRuleSet.add(new Rule(rule.prop, rule.value))
			const mediaQuery = new MediaQuery(query, mediaQueryRuleSet);
			// Ruleset
			const ruleSet = new RuleSet()
			ruleSet.add(mediaQuery)
			const result = ruleSet.flatten()
			expect(result.rules).toEqual({
				[`@media (${query})`]: mediaQuery.flatten(),
			})
		})

		it('should flatten a nested selector', () => {
			const rule = { prop: 'something', value: 'else' }
			// Nested selector
			const nestedRuleSet = new RuleSet()
			nestedRuleSet.add(new Rule(rule.prop, rule.value))
			const nestedSelector = new NestedSelector('div > p', nestedRuleSet)
			// Ruleset
			const ruleSet = new RuleSet()
			ruleSet.add(nestedSelector)
			const result = ruleSet.flatten()
			expect(result.fragments).toEqual([
				nestedSelector.flatten()
			])
		})

		it('should flatten multiple nested selectors', () => {
			const rule = { prop: 'something', value: 'else' }
			// Nested selector
			const nestedRuleSet1 = new RuleSet()
			nestedRuleSet1.add(new Rule(rule.prop, rule.value))
			const nestedSelector1 = new NestedSelector('div > p', nestedRuleSet1)
			const nestedRuleSet2 = new RuleSet()
			nestedRuleSet2.add(new Rule(rule.prop, rule.value))
			const nestedSelector2 = new NestedSelector('div > p', nestedRuleSet2)
			// Ruleset
			const ruleSet = new RuleSet()
			ruleSet.add(nestedSelector1)
			ruleSet.add(nestedSelector2)
			const result = ruleSet.flatten()
			expect(result.fragments).toEqual([
				nestedSelector1.flatten(),
				nestedSelector2.flatten()
			])
		})
	})
})
