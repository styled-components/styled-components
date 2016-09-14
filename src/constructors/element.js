import { createElement } from 'react'

import Root from '../models/Root'

const element = (tagName, ...rules) => {
  const styleRoot = new Root(...rules)
  console.log(styleRoot)

  /* Return a stateless functional component that simply renders
  * a HTML element with our styles applied. */
  const component = (props) => {
    /* Need to be able to regenerate styles if things change, but for now everything's static */
    return createElement(tagName, Object.assign({}, props, {
      className: [props.className, styleRoot.injectStyles(props)].join(' '),
    }))
  }
  component.displayName = `Styled(${tagName.displayName || tagName})`
  return component
}

export default element
