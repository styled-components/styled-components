import expect from 'expect'
import pseudo from '../pseudo'
import NestedSelector from '../../models/NestedSelector.js'
import ValidRuleSetChild from '../../models/ValidRuleSetChild.js'

describe('pseudo', () => {
  it('should return a NestedSelector', () => {
    const result = pseudo('')
    expect(result).toBeA(NestedSelector)
  })

  it('should prefix an ampersand', () => {
    const result = pseudo('after')
    expect(result.selector).toEqual('&:after')
  })

  it('should handle multiple selectors', () => {
    const result = pseudo('after,before')
    expect(result.selector).toEqual('&:after,&:before')
  })

  it('should handle spaces', () => {
    const result = pseudo('after, before')
    expect(result.selector).toEqual('&:after,&:before')
  })

  it('should add a rule', () => {
    const rule = new ValidRuleSetChild()
    const result = pseudo('after,before', rule)
    expect(result.ruleSet.rules).toEqual([rule])
  })

  it('should multiple rules', () => {
    const rule1 = new ValidRuleSetChild()
    const rule2 = new ValidRuleSetChild()
    const result = pseudo('after,before', rule1, rule2)
    expect(result.ruleSet.rules).toEqual([rule1, rule2])
  })
})