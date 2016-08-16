import camelize from 'fbjs/lib/camelizeStyleName'

import rule from "./rule"
import RuleSet from "../models/RuleSet";
import NestedSelector from "../models/NestedSelector";
import ValidRuleSetChild from "../models/ValidRuleSetChild";

const declaration = /^\s*([\w-]+):\s*([^;]*);\s*$/
const startNesting = /^\s*([\w\.:&>][^{]+?)\s*\{\s*$/
const stopNesting = /^\s*}\s*$/

/* This is a bit complicated.
*  Basically, you get an array of strings and an array of interpolations.
*  You want to interleave them, so that they're processed together.
*  That's easy enough.
*  Except you also want to split the strings by line.
*  Still ok I guess.
*  Except that some of the interpolations are within a line i.e. background: ${ colors.white };
*  So short-circuit those by converting to a string and concatenating so later
*  when you split by "\n" you get valid lines of CSS.
*  I know, right?
*
*  Anyway, this needs to be replaced by a real CSS parser. TODO: that.
* */
const interleave = (strings, interpolations) => {
  const linesAndInterpolations = strings[0].split('\n')
  interpolations.forEach((interp, i) => {
    /* Complex, Rule-based interpolation (could be multi-line, or nesting etc) */
    if (interp instanceof ValidRuleSetChild) {
      linesAndInterpolations.push(interp)
      if (strings[i + 1]) linesAndInterpolations.push(...strings[i + 1].split('\n'))
    } else {
      /* Simple (value) interpolation. Concatenate and move on. */
      const lastStr = linesAndInterpolations.pop()
      linesAndInterpolations.push(...(lastStr + interp + (strings[i + 1] || '')).split('\n'))
    }
  })
  return linesAndInterpolations;
}

export default (strings, ...interpolations) => {
  /* A data structure we can use to traverse the CSS */
  let currentLevel = {
    parent: null,
    ruleSet: new RuleSet()
  }
  var linesAndInterpolations = interleave(strings, interpolations);

  const processLine = line => {
    const [_, subSelector] = startNesting.exec(line) || []
    const [__, property, value] = declaration.exec(line) || []
    const popNesting = stopNesting.exec(line)

    /* ARE WE STARTING A NESTING? */
    if (subSelector) {
      const subRules = new RuleSet()
      const nesting = new NestedSelector(subSelector, subRules)
      currentLevel.ruleSet.add(nesting)
      currentLevel = {
        parent: currentLevel,
        ruleSet: subRules
      }

      /* ARE WE A NORMAL RULE? */
    } else if (property && value) {
      const newRule = rule(camelize(property), value)
      currentLevel.ruleSet.add(newRule)
    } else if (popNesting) {
      currentLevel = currentLevel.parent
    }
  }

  const processLineOrInterp = lineOrInterp => {
    if (typeof lineOrInterp === 'string') {
      processLine(lineOrInterp)
    } else if (lineOrInterp instanceof ValidRuleSetChild) {
      currentLevel.ruleSet.add(lineOrInterp)
    } else {
      console.warn("I don't know what to do with this:", lineOrInterp)
    }
  }

  linesAndInterpolations.forEach(processLineOrInterp)
  return currentLevel.ruleSet
}
