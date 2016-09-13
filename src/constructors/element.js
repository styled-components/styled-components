import { createElement } from 'react'

import Root from '../models/Root'

const element = (tagName, ...rules) => {
  const styleRoot = new Root(...rules)
  /* In development directly return the ReactElement for easier debugging */
  if (process.env.NODE_ENV !== 'production') {
    const className = styleRoot.injectStyles()
    return createElement(tagName, {
      className,
    })
  }

  /* In prod return a stateless functional component that generates the styles on render for SSR. */
  let className
  return (props) => {
    /* Need to be able to regenerate styles if things change, but for now everything's static */
    if (!className) className = styleRoot.injectStyles()
    return createElement(tagName, Object.assign({}, props, {
      className: [props.className, className].join(' '),
    }))
  }
}

export default element
