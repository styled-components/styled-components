// @flow

import { createElement } from 'react'

import type { Theme } from './ThemeProvider'
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses'

import isTag from '../utils/isTag'
import isStyledComponent from '../utils/isStyledComponent'
import type { RuleSet, Target, PropsTransformer } from '../types'

import AbstractStyledComponent from './AbstractStyledComponent'
import { CHANNEL } from './ThemeProvider'
import StyleSheet, { CONTEXT_KEY } from './StyleSheet'

const escapeRegex = /[[\].#*$><+~=|^:(),"'`]/g
const multiDashRegex = /--+/g

export default (ComponentStyle: Function, constructWithOptions: Function) => {
  /* We depend on components having unique IDs */
  const identifiers = {}
  const generateId = (_displayName: string) => {
    const displayName = typeof _displayName !== 'string' ?
      'sc' : _displayName
        .replace(escapeRegex, '-') // Replace all possible CSS selectors
        .replace(multiDashRegex, '-') // Replace multiple -- with single -

    const nr = (identifiers[displayName] || 0) + 1
    identifiers[displayName] = nr

    const hash = ComponentStyle.generateName(displayName + nr)
    return `${displayName}-${hash}`
  }

  class BaseStyledComponent extends AbstractStyledComponent {
    static target: Target
    static styledComponentId: string
    static withProps: PropsTransformer
    static componentStyle: Object
    static warnTooManyClasses: Function

    state = {
      theme: null,
      generatedClassName: '',
    }

    generateAndInjectStyles(theme: any, props: any) {
      const { componentStyle, warnTooManyClasses } = this.constructor
      const executionContext = { ...props, theme }
      const styleSheet = this.context[CONTEXT_KEY] || StyleSheet.instance
      const className = componentStyle.generateAndInjectStyles(executionContext, styleSheet)

      if (warnTooManyClasses !== undefined) warnTooManyClasses(className)

      return className
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
          const generatedClassName = this.generateAndInjectStyles(theme, this.props)
          this.setState({ theme, generatedClassName })
        })
      } else {
        const theme = this.props.theme || {}
        const generatedClassName = this.generateAndInjectStyles(
          theme,
          this.props,
        )
        this.setState({ theme, generatedClassName })
      }
    }

    componentWillReceiveProps(nextProps: { theme?: Theme, [key: string]: any }) {
      this.setState((oldState) => {
        // Props should take precedence over ThemeProvider, which should take precedence over
        // defaultProps, but React automatically puts defaultProps on props.
        const { defaultProps } = this.constructor
        const isDefaultTheme = defaultProps && nextProps.theme === defaultProps.theme
        const theme = nextProps.theme && !isDefaultTheme ? nextProps.theme : oldState.theme
        const generatedClassName = this.generateAndInjectStyles(theme, nextProps)

        return { theme, generatedClassName }
      })
    }

    componentWillUnmount() {
      if (this.unsubscribe) {
        this.unsubscribe()
      }
    }

    render() {
      const { children, className, innerRef } = this.props
      const { generatedClassName } = this.state
      const { styledComponentId, target, withProps } = this.constructor

      const extraProps = withProps(this.props)
      const propsForElement = { ...this.props, ...extraProps }

      propsForElement.className = [
        className,
        styledComponentId,
        (className !== extraProps.className) && extraProps.className,
        generatedClassName,
      ].filter(Boolean).join(' ')

      if (!isStyledComponent(target)) {
        propsForElement.ref = innerRef
        delete propsForElement.innerRef
      }

      return createElement(target, propsForElement, children)
    }
  }

  const createStyledComponent = (
    target: Target,
    options: Object,
    rules: RuleSet,
  ) => {
    const {
      displayName = isTag(target) ? `styled.${target}` : `Styled(${target.displayName})`,
      componentId = generateId(options.displayName),
      ParentComponent = BaseStyledComponent,
      rules: extendingRules,
      withProps = () => ({}),
    } = options

    let warnTooManyClasses
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      warnTooManyClasses = createWarnTooManyClasses(displayName)
    }

    const componentStyle = new ComponentStyle(
      extendingRules === undefined ? rules : extendingRules.concat(rules),
      componentId,
    )

    class StyledComponent extends ParentComponent {
      static displayName = displayName
      static styledComponentId = componentId
      static withProps = withProps
      static componentStyle = componentStyle
      static warnTooManyClasses = warnTooManyClasses
      static target = target

      static extendWith(tag) {
        const { displayName: _, componentId: __, ...optionsToCopy } = options
        const newOptions = { ...optionsToCopy, rules, ParentComponent: StyledComponent }
        return constructWithOptions(createStyledComponent, tag, newOptions)
      }

      static get extend() {
        return StyledComponent.extendWith(target)
      }
    }

    return StyledComponent
  }

  return createStyledComponent
}
