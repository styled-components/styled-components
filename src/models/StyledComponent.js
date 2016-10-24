// @flow

import { createElement } from 'react'

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
    const ParentComponent = isTag(target) ? parent : AbstractStyledComponent

    // $FlowIssue need to convince flow that ParentComponent can't be string here
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
          theme: null,
          generatedClassName: '',
        }
      }

      generateAndInjectStyles() {
        const theme = this.state.theme || {}
        const executionContext = Object.assign({}, this.props, { theme })
        const generatedClassName = componentStyle.generateAndInjectStyles(executionContext)
        this.setState({
          generatedClassName,
        })
      }

      componentWillMount() {
        this.generateAndInjectStyles()
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

      componentWillReceiveProps(nextProps: any) {
        const generatedClassName = this.generateAndInjectStyles(
          this.state.theme || this.props.theme,
          nextProps
        )
        this.setState({ generatedClassName })
      }

      componentWillUnmount() {
        if (this.unsubscribe) {
          this.unsubscribe()
        }
      }

      componentWillReceiveProps() {
        this.generateAndInjectStyles()
      }

      /* eslint-disable react/prop-types */
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
