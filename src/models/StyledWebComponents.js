// @flow

import type { RuleSet, Target } from '../types'

export default (ComponentStyle: any) => {
  const createStyledComponent = (target: Target, rules: RuleSet) => {
    /* Handle styled(OtherStyledComponent) differently */
    const isTag = typeof target === 'string'
    let element
    const componentStyle = new ComponentStyle(rules)
    const generatedClassName = componentStyle.generateAndInjectStyles({})
    if (isTag) {
      element = document.createElement(target)
      element.className = generatedClassName
    } else if (typeof target === 'object') {
      element = document.createElement(target.tagName)
      element.className = `${target.tagName} ${generatedClassName}`
    }
    return element
  }

  return createStyledComponent
}
