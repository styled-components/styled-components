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
      static contextTypes = ParentComponent.contextTypes

      constructor() {
        super()
        this.state = {
          theme: null,
          generatedClassName: '',
          generatedSequence: 0,
        }
      }

      generateAndInjectStyles(theme: any, props: any) {
        const executionContext = { ...props, theme: theme || {} }
        return componentStyle.addStyle(executionContext)
      }

      applyStyles(theme: any, props: any) {
        const oldClass = this.state.generatedClassName
        const generatedSequence = this.state.generatedSequence + 1
        this.setState({ generatedSequence })
        this.generateAndInjectStyles(theme, props).then(generatedClassName => {
          componentStyle.removeStyle(oldClass)
          if (generatedSequence === this.state.generatedSequence) {
            this.setState({ theme, generatedClassName })
          } else {
            componentStyle.removeStyle(generatedClassName)
          }
        })
      }

      componentWillMount() {
        // If there is a theme in the context, subscribe to the event emitter. This
        // is necessary due to pure components blocking context updates, this circumvents
        // that by updating when an event is emitted
        if (this.context[CHANNEL]) {
          const subscribe = this.context[CHANNEL]
          this.unsubscribe = subscribe(nextTheme => {
            // This will be called once immediately

            // Props should take precedence over ThemeProvider, which should take precedence over
            // defaultProps, but React automatically puts defaultProps on props.
            const { defaultProps } = this.constructor
            const isDefaultTheme = defaultProps && this.props.theme === defaultProps.theme
            const theme = this.props.theme && !isDefaultTheme ? this.props.theme : nextTheme
            this.applyStyles(theme, this.props)
          })
        } else {
          const theme = this.props.theme
          this.applyStyles(theme, this.props)
        }
      }

      componentWillReceiveProps(nextProps: { theme?: Theme, [key: string]: any }) {
        // Props should take precedence over ThemeProvider, which should take precedence over
        // defaultProps, but React automatically puts defaultProps on props.
        const { defaultProps } = this.constructor
        const isDefaultTheme = defaultProps && nextProps.theme === defaultProps.theme
        const theme = nextProps.theme && !isDefaultTheme ? nextProps.theme : this.state.theme
        this.applyStyles(theme, nextProps)
      }

      componentWillUnmount() {
        if (this.unsubscribe) {
          this.unsubscribe()
        }
        // remove current class end prevent new one to be added
        this.setState({ generatedSequence: this.state.generatedSequence + 1 })
        componentStyle.removeStyle(this.state.generatedClassName)
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
        propsForElement.className = [className, generatedClassName || ComponentStyle.invisible]
          .filter(x => x).join(' ')
        if (innerRef) {
          propsForElement.ref = innerRef
          if (isTag(target)) delete propsForElement.innerRef
        }

        return createElement(target, propsForElement, children)
      }
    }

    StyledComponent.target = target
    StyledComponent.rules = rules

    StyledComponent.displayName = isTag(target) ? `styled.${target}` : `Styled(${(target.displayName || target.name || 'Component')})`

    return StyledComponent
  }

  return createStyledComponent
}
