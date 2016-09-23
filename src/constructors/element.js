// @flow
import { createElement } from 'react'
import ComponentStyle from '../models/ComponentStyle'

import type RuleSet from '../utils/flatten'

/* todo: replace any with React.Component */
const element = (tagName: string | any, rules: RuleSet): createElement => {
  const styleRoot = new ComponentStyle(rules)
  /* Return a stateless functional component that simply renders
   * a HTML element with our styles applied. */
  const component = (props) => (
    createElement(tagName, Object.assign({}, props, {
      className: props.className ? [props.className] : [].concat(styleRoot.injectStyles([props])).join(' '),
    }))
  )
  component.displayName = `Styled(${tagName.displayName || tagName})`
  return component
}

export default element
