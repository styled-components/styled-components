import RuleSet from "../models/RuleSet"

/* Deliberately making the RuleSet constructor awkward to encourage
*  people to use this helper instead, so I can change out the implementation
*  later if necessary.
*  */
export default (...rules) => {
  const ruleSet = new RuleSet()
  ruleSet.add(...rules)
  return ruleSet
}
