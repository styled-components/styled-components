/* Trying to avoid the unknown-prop errors on styled components
 by filtering by React's attribute whitelist.
 */

import HTMLDOMPropertyConfig from 'react/lib/HTMLDOMPropertyConfig'
import SVGDOMPropertyConfig from 'react/lib/SVGDOMPropertyConfig'

/* Logic copied from ReactDOMUnknownPropertyHook */
const reactProps = {
  children: true,
  dangerouslySetInnerHTML: true,
  key: true,
  ref: true,
  autoFocus: true,
  defaultValue: true,
  valueLink: true,
  defaultChecked: true,
  checkedLink: true,
  innerHTML: true,
  suppressContentEditableWarning: true,
  onFocusIn: true,
  onFocusOut: true,
}

const hasOwnProperty = {}.hasOwnProperty
export default name => (
  hasOwnProperty.call(HTMLDOMPropertyConfig.Properties, name) ||
  hasOwnProperty.call(SVGDOMPropertyConfig.Properties, name) ||
  HTMLDOMPropertyConfig.isCustomAttribute(name.toLowerCase()) ||
  hasOwnProperty.call(reactProps, name)
)
