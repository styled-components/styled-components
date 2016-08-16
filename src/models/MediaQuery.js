import ValidRuleSetChild from "./ValidRuleSetChild";

export default class MediaQuery extends ValidRuleSetChild {
  constructor(query, ruleSet) {
    super()
    this.query = query
    this.ruleSet = ruleSet
  }

  /* Wrap the media query in brackets if needed. */
  fullQuery() {
    return '@media ' + (/^\(.*\)$/.exec(this.query) ? this.query : `(${this.query})`)
  }

  /* No nesting! */
  flatten() {
    const { rules, fragments } = this.ruleSet.flatten()
    if (fragments.length > 0) console.error("Fragments aren't supported in Media Queries yet")
    return rules
  }
}
