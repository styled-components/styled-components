// @flow
import { Component, createElement, PropTypes } from 'react'
import { Properties as ValidAttrs } from 'react/lib/HTMLDOMPropertyConfig'

import type RuleSet from '../utils/flatten'
import ComponentStyle from '../models/ComponentStyle'

export default (tagName: string | typeof Component, rules: RuleSet) => {
  const isTag = typeof tagName === 'string'
  const componentStyle = new ComponentStyle(rules)
  const displayName = isTag ? `styled.${tagName}` : `Styled(${tagName.displayName})`

  class StyledComponent extends Component {
    /* eslint-disable react/prop-types */
    render() {
      const { className, children } = this.props
      const { theme } = this.context
      // const contextForStyles
      const propsForElement = {}
      Object.keys(this.props).filter(propName => (
        /* Don't pass through non HTML tags through to HTML elements */
        !isTag || ValidAttrs[propName] !== undefined
      )).forEach(propName => {
        propsForElement[propName] = this.props.propName
      })
      propsForElement.className = [className, componentStyle.injectStyles([this.props])].filter(x => x).join(' ')

      return createElement(tagName, propsForElement, children)
    }
  }

  StyledComponent.displayName = displayName
  StyledComponent.contextTypes = {
    theme: PropTypes.object,
  }
  return StyledComponent
}
