import isObject from "lodash/isObject";
import camelize from 'fbjs/lib/camelizeStyleName'

import RuleSet from "../models/RuleSet"
import Rule from "../models/Rule"

export default (object) => {
	const ruleSet = new RuleSet()
	if (!isObject(object)) return ruleSet;
	Object.keys(object).forEach((prop) => {
		ruleSet.add(new Rule(camelize(prop), object[prop]))
	})
	return ruleSet
}
