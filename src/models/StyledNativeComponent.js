// @flow
import { Component, createElement, PropTypes } from 'react'

import InlineStyle from './InlineStyle'
import type { RuleSet, Target } from '../types'

/* eslint-disable react/prefer-stateless-function */
class AbstractStyledNativeComponent extends Component {
}

const createStyledNativeComponent = (target: Target, rules: RuleSet, options) => {
  /* Handle styled(OtherStyledNativeComponent) differently */
  const isStyledNativeComponent = {}.isPrototypeOf.call(AbstractStyledNativeComponent, target)
  if (isStyledNativeComponent) {
    return createStyledNativeComponent(target.target, target.rules.concat(rules), options)
  }

  const inlineStyle = new InlineStyle(rules)

  class StyledNativeComponent extends AbstractStyledNativeComponent {
    theme: Object
    generatedStyles: Object
    static rules: RuleSet
    static target: Target

    getChildContext() {
      return { theme: this.theme }
    }

    componentWillMount() {
      this.componentWillReceiveProps(this.props, this.context)
    }

    componentWillReceiveProps(newProps: Object, newContext: ?any) {
      // Always pass down a theme, even if it's empty
      this.theme = (newContext && newContext.theme) || {}
      // Local copy for this instance with an update() method
      const theme = Object.assign({}, this.theme, {
        update(values) {
          this.theme = Object.assign({}, this.theme, values)
        },
      })

      /* Generate and inject the styles and potentially update theme */
      const executionContext = Object.assign({}, newProps, { theme })
      this.generatedStyles = inlineStyle.generateStyleObject(executionContext)
    }

    /* eslint-disable react/prop-types */
    render() {
      const { style, children } = this.props

      const propsForElement = Object.assign({}, this.props)
      propsForElement.style = Object.assign({}, style, this.generatedStyles)

      return createElement(target, propsForElement, children)
    }
  }

  /* Used for inheritance */
  StyledNativeComponent.rules = rules
  StyledNativeComponent.target = target

  StyledNativeComponent.displayName = target.displayName ? `Styled(${target.displayName})` : `styled.${target}`
  StyledNativeComponent.childContextTypes = {
    theme: PropTypes.object,
  }
  StyledNativeComponent.contextTypes = {
    theme: PropTypes.object,
  }
  return StyledNativeComponent
}

export default createStyledNativeComponent
