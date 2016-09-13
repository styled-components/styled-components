import { createElement } from 'react'

import Root from '../models/Root'

const element = (tagName, ...rules) => {
  const styleRoot = new Root(...rules)
  /* Don't generate the styles now, only on render */
  let className

  /* Return a stateless functional component that simply renders
  * a HTML element with our styles applied. */
  return (props) => {
    /* Need to be able to regenerate styles if things change, but for now everything's static */
    if (!className) className = styleRoot.injectStyles()
    return createElement(tagName, Object.assign({}, props, {
      className: [props.className, className].join(' '),
    }))
  }
}

export default element
