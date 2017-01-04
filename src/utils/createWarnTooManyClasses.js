// @flow

import styleSheet from '../models/StyleSheet'

const LIMIT = 200

export default () => {
  let generatedClasses = {}
  let warningSeen = false

  return (className: string, displayName: string) => {
    if (!warningSeen) {
      generatedClasses[className] = true
      if (Object.keys(generatedClasses).length >= LIMIT) {
        const latestRule = styleSheet.rules().find(s => s.selectorText && s.selectorText.indexOf(`.${className}`) !== -1)
        // Unable to find latestRule in test environment.
        /* eslint-disable no-console, prefer-template */
        console.warn(`Over ${LIMIT} classes was generated for component ${displayName}. ` +
           'Consider using React\'s style property for styling based on frequently changed. ' +
           (latestRule ? `Last generated style: ${latestRule.cssText}` : ''))
        warningSeen = true
        generatedClasses = {}
      }
    }
  }
}
