// @flow

import { createElement } from 'react'

import type { Theme } from './ThemeProvider'

import validAttr from '../utils/validAttr'
import isTag from '../utils/isTag'
import type { RuleSet, Target } from '../types'

import AbstractStyledComponent from './AbstractStyledComponent'
import { CHANNEL } from './ThemeProvider'

export default (ComponentStyle: Function) => {
  // eslint-disable-next-line no-undef
  const createStyledComponent = (target: Target, rules: RuleSet, parent?: ReactClass<*>) => {
    /* Handle styled(OtherStyledComponent) differently */
    const isStyledComponent = AbstractStyledComponent.isPrototypeOf(target)
    if (!isTag(target) && isStyledComponent) {
      return createStyledComponent(target.target, target.rules.concat(rules), target)
    }

    const componentStyle = new ComponentStyle(rules)
    const ParentComponent = parent || AbstractStyledComponent

    class StyledComponent extends ParentComponent {
      static rules: RuleSet
      static target: Target

      constructor() {
        super()
        this.state = {
          theme: null,
          generatedClassName: '',
        }
      }

      generateAndInjectStyles(theme: any, props: any) {
        const executionContext = { ...props, theme }
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
          const theme = this.props.theme || {}
          const generatedClassName = this.generateAndInjectStyles(
            theme,
            this.props
          )
          this.setState({ theme, generatedClassName })
        }
      }

      componentWillReceiveProps(nextProps: { theme?: Theme, [key: string]: any }) {
        const theme = nextProps.theme || this.state.theme

        const generatedClassName = this.generateAndInjectStyles(theme, nextProps)
        this.setState({ theme, generatedClassName })
      }

      componentWillUnmount() {
        if (this.unsubscribe) {
          this.unsubscribe()
        }
      }

      render() {
        const { className, children, innerRef } = this.props
        const { generatedClassName } = this.state

        const propsForElement = {}
        /* Don't pass through non HTML tags through to HTML elements */
        Object.keys(this.props)
          .filter(propName => !isTag(target) || validAttr(propName))
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

    StyledComponent.target = target
    StyledComponent.rules = rules

    StyledComponent.displayName = isTag(target) ? `styled.${target}` : `Styled(${target.displayName})`

    return StyledComponent
  }

  return createStyledComponent
}
