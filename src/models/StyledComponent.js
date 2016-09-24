// @flow
import { Component, createElement, PropTypes } from 'react'
import { Properties as ValidAttrs } from 'react/lib/HTMLDOMPropertyConfig'

import type RuleSet from '../utils/flatten'
import ComponentStyle from '../models/ComponentStyle'

export default (tagName: any, rules: RuleSet) => {
  const isTag = typeof tagName === 'string'
  const componentStyle = new ComponentStyle(rules)

  class StyledComponent extends Component {
    theme: Object
    generatedClassName: string

    getChildContext() {
      return { theme: this.theme }
    }
    componentWillMount() {
      this.componentWillReceiveProps(this.props, this.context)
    }
    componentWillReceiveProps(newProps: Object, newContext: ?any) {
      this.theme = Object.assign({}, (newContext || {}).theme)
      this.generatedClassName = componentStyle.injectStyles([newProps, this.theme])
    }
    /* eslint-disable react/prop-types */
    render() {
      const { className, children } = this.props

      // const contextForStyles
      const propsForElement = {}
      Object.keys(this.props).filter(propName => (
        /* Don't pass through non HTML tags through to HTML elements */
        !isTag || ValidAttrs[propName] !== undefined
      )).forEach(propName => {
        propsForElement[propName] = this.props[propName]
      })
      propsForElement.className = [className, this.generatedClassName].filter(x => x).join(' ')

      return createElement(tagName, propsForElement, children)
    }
  }

  StyledComponent.displayName = isTag ? `styled.${tagName}` : `Styled(${tagName.displayName})`
  StyledComponent.childContextTypes = {
    theme: PropTypes.object,
  }
  StyledComponent.contextTypes = {
    theme: PropTypes.object,
  }
  return StyledComponent
}
