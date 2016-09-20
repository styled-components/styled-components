// @flow
import Rule from './Rule'
import MediaQuery from './MediaQuery'
import NestedSelector from './NestedSelector'
import ValidRuleSetChild from './ValidRuleSetChild'

export type FragmentType = {
  selector: string,
  rules: Array<ValidRuleSetChild>,
  fragments: Array<FragmentType>
}

type RuleType = {
  [property: string]: {
    property: string,
    value: string
  }
}

export type FlatRuleSetType = {
  selector?: string,
  rules: RuleType,
  fragments: Array<FragmentType>,
}

/*
* A RuleSet stores the leaf nodes that apply to some level
* of a styling tree, as well as any other children (fragments).
* Use concat() to create one easily.
* */
export default class RuleSet extends ValidRuleSetChild {
  rules: Array<typeof ValidRuleSetChild>;
  add: Function;
  flatten: Function;

  constructor() {
    super()
    this.rules = []
  }

  add(...other: Array<typeof RuleSet|typeof ValidRuleSetChild>) {
    other.forEach((r) => {
      if (!r) return
      if (r instanceof RuleSet) this.rules.push(...r.rules)
      else if (r instanceof ValidRuleSetChild) this.rules.push(r)
      else {
        console.error(r)
        throw new Error("Can't add this ^ to a RuleSet.")
      }
    })
  }

  flatten(): FlatRuleSetType {
    const rules = {}
    const fragments = []
    this.rules.forEach((r) => {
      if (r instanceof Rule) {
        rules[r.property] = r.value
      } else if (r instanceof MediaQuery) {
        rules[r.fullQuery()] = r.flatten()
      } else if (r instanceof NestedSelector) {
        fragments.push(r.flatten())
      }
    })

    return { rules, fragments }
  }
}
