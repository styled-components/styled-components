// @flow
import { Component, createElement, PropTypes } from 'react'
import { Subscriber } from 'react-broadcast'

import ComponentStyle from '../models/ComponentStyle'
import validAttr from '../utils/validAttr'

import type { RuleSet, Target } from '../types'

/* eslint-disable react/prefer-stateless-function */
class AbstractStyledComponent extends Component {
  static isPrototypeOf: Function
}

const createStyledComponent = (target: Target, rules: RuleSet) => {
  /* Handle styled(OtherStyledComponent) differently */
  const isStyledComponent = AbstractStyledComponent.isPrototypeOf(target)
  if (isStyledComponent) return createStyledComponent(target.target, target.rules.concat(rules))

  const isTag = typeof target === 'string'
  const componentStyle = new ComponentStyle(rules)

  class StyledComponent extends AbstractStyledComponent {
    static rules: RuleSet
    static target: Target

    /* eslint-disable react/prop-types */
    render() {
      const { className, children } = this.props

      return createElement(Subscriber, { channel: 'styled-components' },
        (theme) => {
          const generatedClassName = componentStyle.generateAndInjectStyles(theme)
          const propsForElement = {}
          /* Don't pass through non HTML tags through to HTML elements */
          Object.keys(this.props)
            .filter(propName => !isTag || validAttr(propName))
            .forEach(propName => {
              propsForElement[propName] = this.props[propName]
            })
          propsForElement.className = [className, generatedClassName].filter(x => x).join(' ')
          return createElement(target, propsForElement, children)
        }
      )
    }
  }

  /* Used for inheritance */
  StyledComponent.rules = rules
  StyledComponent.target = target

  StyledComponent.displayName = isTag ? `styled.${target}` : `Styled(${target.displayName})`
  StyledComponent.contextTypes = {
    theme: PropTypes.object,
  }
  return StyledComponent
}

export default createStyledComponent
