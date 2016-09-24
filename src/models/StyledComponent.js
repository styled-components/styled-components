// @flow
import {Component, createElement} from 'react'
import ComponentStyle from '../models/ComponentStyle'
import HTMLDOMPropertyConfig from 'react/lib/HTMLDOMPropertyConfig'
const PassthroughAttributes = Object.keys(HTMLDOMPropertyConfig.Properties)

import type RuleSet from '../utils/flatten'

export default (tagName: string | typeof Component, rules: RuleSet) => {
  const componentStyle = new ComponentStyle(rules)
  const displayName = `styled.${tagName.displayName || tagName}`

  class StyledComponent extends Component {
    render() {
      const { className } = this.props
      // const contextForStyles
      // const elementClassName = componentStyle.injectStyles([...contextForStyles])
      // const propsForElement =

      return createElement(tagName, Object.assign({}, this.props, {
        className: className ? [className] : [].concat(componentStyle.injectStyles([this.props])).join(' '),
      }))
    }
  }

  StyledComponent.displayName = displayName
  return StyledComponent
}
