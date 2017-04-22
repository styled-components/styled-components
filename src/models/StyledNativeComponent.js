// @flow
import { createElement } from 'react'

import type { Theme } from './ThemeProvider'

import isTag from '../utils/isTag'
import type { RuleSet, Target } from '../types'

import { CHANNEL } from './ThemeProvider'
import InlineStyle from './InlineStyle'
import AbstractStyledComponent from './AbstractStyledComponent'
import constructWithOptions from '../constructors/constructWithOptions'

const createStyledNativeComponent = (target: Target,
                                     options: Object,
                                     rules: RuleSet) => {
  const {
    displayName = isTag(target) ? `styled.${target}` : `Styled(${target.displayName})`,
    attrs = {},
    rules: extendingRules = [],
    ParentComponent = AbstractStyledComponent,
  } = options
  const inlineStyle = new InlineStyle([...extendingRules, ...rules])

  class StyledNativeComponent extends ParentComponent {
    static extend: Function
    static extendWith: Function
    attrs = {}

    state = {
      theme: {},
      generatedStyles: undefined,
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
          const generatedStyles = this.generateAndInjectStyles(theme, this.props)
          this.setState({ generatedStyles, theme })
        })
      } else {
        const theme = this.props.theme || {}
        const generatedStyles = this.generateAndInjectStyles(
          theme,
          this.props,
        )
        this.setState({ generatedStyles, theme })
      }
    }

    componentWillReceiveProps(nextProps: { theme?: Theme, [key: string]: any }) {
      this.setState((oldState) => {
        // Props should take precedence over ThemeProvider, which should take precedence over
        // defaultProps, but React automatically puts defaultProps on props.
        const { defaultProps } = this.constructor
        const isDefaultTheme = defaultProps && nextProps.theme === defaultProps.theme
        const theme = nextProps.theme && !isDefaultTheme ? nextProps.theme : oldState.theme
        const generatedStyles = this.generateAndInjectStyles(theme, nextProps)

        return { theme, generatedStyles }
      })
    }

    componentWillUnmount() {
      if (this.unsubscribe) {
        this.unsubscribe()
      }
    }

    buildExecutionContext(theme: any, props: any) {
      const context = { ...props, theme }
      this.attrs = Object.keys(attrs).reduce((accum, key) => (
        { ...accum, [key]: typeof attrs[key] === 'function' ? attrs[key](context) : attrs[key] }
      ), {})
      return { ...context, ...this.attrs }
    }

    generateAndInjectStyles(theme: any, props: any) {
      const executionContext = this.buildExecutionContext(theme, props)
      return inlineStyle.generateStyleObject(executionContext)
    }

    /* eslint-disable react/prop-types */
    render() {
      const { style, children, innerRef } = this.props
      const { generatedStyles } = this.state

      const propsForElement = { ...this.attrs, ...this.props }
      propsForElement.style = [generatedStyles, style]
      if (innerRef) {
        propsForElement.ref = innerRef
        delete propsForElement.innerRef
      }

      return createElement(target, propsForElement, children)
    }

    static get extend() {
      return StyledNativeComponent.extendWith(target)
    }
  }

  StyledNativeComponent.displayName = displayName
  StyledNativeComponent.extendWith = tag => {
    const { displayName: _, ...optionsToCopy } = options
    return constructWithOptions(createStyledNativeComponent, tag,
      { ...optionsToCopy, rules, ParentComponent: StyledNativeComponent })
  }

  return StyledNativeComponent
}

export default createStyledNativeComponent
