// @flow
import { Component, createElement, PropTypes } from 'react'

import validAttr from '../utils/validAttr'
import { CHANNEL } from './ThemeProvider'

import type { RuleSet, Target } from '../types'

/* eslint-disable react/prefer-stateless-function */
class AbstractStyledComponent extends Component {
  static isPrototypeOf: Function
  state: any
}

export default (ComponentStyle: any) => {
  const createStyledComponent = (target: Target, rules: RuleSet, parent?: Target) => {
    /* Handle styled(OtherStyledComponent) differently */
    const isStyledComponent = AbstractStyledComponent.isPrototypeOf(target)
    if (isStyledComponent) {
      return createStyledComponent(target.target, target.rules.concat(rules), target)
    }

    const isTag = typeof target === 'string'
    const componentStyle = new ComponentStyle(rules)
    const ParentComponent = parent || AbstractStyledComponent

    class StyledComponent extends ParentComponent {
      static rules: RuleSet
      static target: Target
      state: {
        theme: any,
        generatedClassName: string
      }
      unsubscribe: Function

      constructor() {
        super()
        this.state = {
          theme: {},
          generatedClassName: '',
        }
      }

      generateAndInjectStyles(theme: any, props: any) {
        const executionContext = Object.assign({}, props, { theme })
        return componentStyle.generateAndInjectStyles(executionContext)
      }

      componentWillMount() {
        // If there is a theme in the context, subscribe to the event emitter. This
        // is necessary due to pure components blocking context updates, this circumvents
        // that by updating when an event is emitted
        if (this.context[CHANNEL]) {
          const subscribe = this.context[CHANNEL]
          this.unsubscribe = subscribe(theme => {
            // This will be called once immediately
            const generatedClassName = this.generateAndInjectStyles(theme, this.props)
            this.setState({ theme, generatedClassName })
          })
        } else {
          const generatedClassName = this.generateAndInjectStyles({}, this.props)
          this.setState({ generatedClassName })
        }
      }

      componentWillUnmount() {
        if (this.unsubscribe) {
          this.unsubscribe()
        }
      }

      componentWillReceiveProps(nextProps: any) {
        const generatedClassName = this.generateAndInjectStyles(this.state.theme, nextProps)
        this.setState({ generatedClassName })
      }

      /* eslint-disable react/prop-types */
      render() {
        const { className, children, innerRef } = this.props
        const { generatedClassName } = this.state

        const propsForElement = {}
        /* Don't pass through non HTML tags through to HTML elements */
        Object.keys(this.props)
          .filter(propName => !isTag || validAttr(propName))
          .forEach(propName => {
            propsForElement[propName] = this.props[propName]
          })
        propsForElement.className = [className, generatedClassName].filter(x => x).join(' ')
        if (innerRef) {
          propsForElement.ref = innerRef
        }

        return createElement(target, propsForElement, children)
      }
    }

    /* Used for inheritance */
    StyledComponent.rules = rules
    StyledComponent.target = target

    StyledComponent.displayName = isTag ? `styled.${target}` : `Styled(${target.displayName})`
    StyledComponent.contextTypes = {
      [CHANNEL]: PropTypes.func,
    }
    return StyledComponent
  }

  return createStyledComponent
}
