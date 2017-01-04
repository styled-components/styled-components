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
        console.warn(`Over ${LIMIT} classes were generated for component ${displayName}. ` +
           'Consider using style property for frequently changed styles.\n' +
           'Example: const MyStyledComponent = styled(props => <div className={props.className} style={{color: props.color}}>{props.children}</div>)`width: 100px; height: 100px;`' +
           (latestRule ? `\nLatest generated class: ${latestRule.cssText}` : ''))
        warningSeen = true
        generatedClasses = {}
      }
    }
  }
}
