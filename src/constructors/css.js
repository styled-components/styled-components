import camelize from 'fbjs/lib/camelizeStyleName'
import isPlainObject from 'lodash/isPlainObject'
import stringHash from 'string-hash'

import rule from './rule'
import MediaQuery from '../models/MediaQuery'
import Keyframes from '../models/Keyframes'
import RuleSet from '../models/RuleSet'
import NestedSelector from '../models/NestedSelector'
import ValidRuleSetChild from '../models/ValidRuleSetChild'

const declaration = /^\s*([\w-]+):\s*([^;]*);\s*$/
const startNesting = /^\s*([\w\.#:&>~+][^{]+?)\s*\{\s*$/
const startMedia = /^\s*@media\s+([^{]+?)\s*\{\s*$/
const startKeyframes = /^\s*@keyframes\s+([^{]+?)\s*\{\s*$/
const stopNestingOrMedia = /^\s*}\s*$/

let keyframeIndex = 0
export const generateName = (originalName, overridenIndex) => {
  let index = overridenIndex
  if (!overridenIndex) {
    keyframeIndex += 1
    index = keyframeIndex
  }
  return `_${originalName}_${stringHash(originalName).toString(36).substr(0, 5)}_${index}`
}

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
    /* CSS-in-JS */
    } else if (isPlainObject(interp)) {
      Object.keys(interp).forEach((prop) => {
        linesAndInterpolations.push(`${prop}: ${interp[prop]};`)
      })
    } else {
      /* Simple (value) interpolation. Concatenate and move on. */
      const lastStr = linesAndInterpolations.pop()
      linesAndInterpolations.push(...(lastStr + interp + (strings[i + 1] || '')).split('\n'))
    }
  })
  return linesAndInterpolations
}

export default (strings, ...interpolations) => {
  /* A data structure we can use to traverse the CSS */
  let currentLevel = {
    parent: null,
    ruleSet: new RuleSet(),
  }
  const linesAndInterpolations = interleave(strings, interpolations)

  const processLine = (line) => {
    const [_, subSelector] = startNesting.exec(line) || []
    const [__, property, value] = declaration.exec(line) || []
    const [___, mediaQuery] = startMedia.exec(line) || []
    const [____, keyframes] = startKeyframes.exec(line) || []
    const popNestingOrMedia = stopNestingOrMedia.exec(line)

    /* ARE WE STARTING A NESTING? */
    if (subSelector) {
      const subRules = new RuleSet()
      const nesting = new NestedSelector(subSelector, subRules)
      currentLevel.ruleSet.add(nesting)
      currentLevel = {
        parent: currentLevel,
        ruleSet: subRules,
      }

    /* ARE WE STARTING A MEDIA QUERY? */
    } else if (mediaQuery) {
      const subRules = new RuleSet()
      const media = new MediaQuery(mediaQuery, subRules)
      currentLevel.ruleSet.add(media)
      currentLevel = {
        parent: currentLevel,
        ruleSet: subRules,
      }

    /* ARE WE STARTING KEYFRAMES? */
    } else if (keyframes) {
      const subRules = new RuleSet()
      currentLevel.ruleSet.add(new Keyframes(generateName(keyframes), subRules))
      currentLevel = {
        parent: currentLevel,
        ruleSet: subRules,
      }

      /* ARE WE A NORMAL RULE? */
    } else if (property && value) {
      let ruleValue = value
      if (property === 'animation-name') {
        ruleValue = generateName(value, keyframeIndex)
      }
      const newRule = rule(camelize(property), ruleValue)
      currentLevel.ruleSet.add(newRule)
    } else if (popNestingOrMedia) {
      if (!currentLevel.parent) {
        console.error(linesAndInterpolations)
        console.error(currentLevel)
        throw new Error('CSS Syntax Error — Trying to un-nest one too many times')
      }
      currentLevel = currentLevel.parent
    }
  }

  const processLineOrInterp = (lineOrInterp) => {
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
