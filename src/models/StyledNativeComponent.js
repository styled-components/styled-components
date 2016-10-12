// @flow
import { Component, createElement, PropTypes } from 'react'

import InlineStyle from './InlineStyle'
import type { RuleSet, Target } from '../types'
import { CHANNEL } from './ThemeProvider'

/* eslint-disable react/prefer-stateless-function */
class AbstractStyledNativeComponent extends Component {
  static isPrototypeOf: Function
  state: any
}

const createStyledNativeComponent = (target: Target, rules: RuleSet) => {
  /* Handle styled(OtherStyledNativeComponent) differently */
  const isStyledNativeComponent = AbstractStyledNativeComponent.isPrototypeOf(target)
  if (isStyledNativeComponent) {
    return createStyledNativeComponent(target.target, target.rules.concat(rules))
  }

  const inlineStyle = new InlineStyle(rules)

  class StyledNativeComponent extends AbstractStyledNativeComponent {
    static rules: RuleSet
    static target: Target
    unsubscribe: Function
    state: {
      theme: any
    }

    constructor() {
      super()
      this.state = {
        theme: null,
      }
    }

    componentWillMount() {
      // If there is a theme in the context, subscribe to the event emitter. This is necessary
      // due to pure components blocking context updates, this circumvents that by updating when an
      // event is emitted
      if (this.context.broadcasts) {
        const subscribe = this.context.broadcasts[CHANNEL]
        this.unsubscribe = subscribe(theme => {
          // This will be called once immediately
          this.setState({ theme })
        })
      }
    }

    componentWillUnmount() {
      if (this.unsubscribe) {
        this.unsubscribe()
      }
    }

    /* eslint-disable react/prop-types */
    render() {
      const { style, children } = this.props
      const theme = this.state.theme || {}

      const generatedStyles = inlineStyle.generateStyleObject({ theme })
      const propsForElement = Object.assign({}, this.props)
      propsForElement.style = [generatedStyles, style]

      return createElement(target, propsForElement, children)
    }
  }

  /* Used for inheritance */
  StyledNativeComponent.rules = rules
  StyledNativeComponent.target = target

  StyledNativeComponent.displayName = target.displayName ? `Styled(${target.displayName})` : `styled.${target}`
  StyledNativeComponent.contextTypes = {
    broadcasts: PropTypes.object,
  }
  return StyledNativeComponent
}

export default createStyledNativeComponent
