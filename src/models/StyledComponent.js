// @flow

import { createElement } from 'react'
import PropTypes from 'prop-types'

import type { Theme } from './ThemeProvider'
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses'

import validAttr from '../utils/validAttr'
import isTag from '../utils/isTag'
import isStyledComponent from '../utils/isStyledComponent'
import getComponentName from '../utils/getComponentName'
import type { RuleSet, Target } from '../types'

import AbstractStyledComponent from './AbstractStyledComponent'
import { CHANNEL } from './ThemeProvider'
import StyleSheet, { CONTEXT_KEY } from './StyleSheet'

const escapeRegex = /[[\].#*$><+~=|^:(),"'`]/g
const multiDashRegex = /--+/g

export default (ComponentStyle: Function, constructWithOptions: Function) => {
  /* We depend on components having unique IDs */
  const identifiers = {}
  const generateId = (_displayName: string, parentComponentId: string) => {
    const displayName = typeof _displayName !== 'string' ?
      'sc' : _displayName
        .replace(escapeRegex, '-') // Replace all possible CSS selectors
        .replace(multiDashRegex, '-') // Replace multiple -- with single -

    const nr = (identifiers[displayName] || 0) + 1
    identifiers[displayName] = nr

    const hash = ComponentStyle.generateName(displayName + nr)
    const componentId = `${displayName}-${hash}`
    return parentComponentId !== undefined
      ? `${parentComponentId}-${componentId}`
      : componentId
  }

  class BaseStyledComponent extends AbstractStyledComponent {
    static target: Target
    static styledComponentId: string
    static attrs: Object
    static componentStyle: Object
    static warnTooManyClasses: Function

    attrs = {}
    state = {
      theme: null,
      generatedClassName: '',
    }

    buildExecutionContext(theme: any, props: any) {
      const { attrs } = this.constructor
      const context = { ...props, theme }
      if (attrs === undefined) {
        return context
      }

      this.attrs = Object.keys(attrs).reduce((acc, key) => {
        const attr = attrs[key]
        // eslint-disable-next-line no-param-reassign
        acc[key] = typeof attr === 'function' ? attr(context) : attr
        return acc
      }, {})

      return { ...context, ...this.attrs }
    }

    generateAndInjectStyles(theme: any, props: any) {
      const { componentStyle, warnTooManyClasses } = this.constructor
      const executionContext = this.buildExecutionContext(theme, props)
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
      const { innerRef } = this.props
      const { generatedClassName } = this.state
      const { styledComponentId, target } = this.constructor

      const isTargetTag = isTag(target)

      const className = [
        this.props.className,
        styledComponentId,
        this.attrs.className,
        generatedClassName,
      ].filter(Boolean).join(' ')

      const baseProps = {
        ...this.attrs,
        className,
      }

      if (isStyledComponent(target)) {
        baseProps.innerRef = innerRef
      } else {
        baseProps.ref = innerRef
      }

      const propsForElement = Object
        .keys(this.props)
        .reduce((acc, propName) => {
          // Don't pass through non HTML tags through to HTML elements
          // always omit innerRef
          if (
            propName !== 'innerRef' &&
            propName !== 'className' &&
            (!isTargetTag || validAttr(propName))
          ) {
            // eslint-disable-next-line no-param-reassign
            acc[propName] = this.props[propName]
          }

          return acc
        }, baseProps)

      return createElement(target, propsForElement)
    }
  }

  const createStyledComponent = (
    target: Target,
    options: Object,
    rules: RuleSet,
  ) => {
    const {
      displayName = isTag(target) ? `styled.${target}` : `Styled(${getComponentName(target)})`,
      componentId = generateId(options.displayName, options.parentComponentId),
      ParentComponent = BaseStyledComponent,
      rules: extendingRules,
      attrs,
    } = options

    const styledComponentId = (options.displayName && options.componentId) ?
      `${options.displayName}-${options.componentId}` : componentId

    let warnTooManyClasses
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      warnTooManyClasses = createWarnTooManyClasses(displayName)
    }

    const componentStyle = new ComponentStyle(
      extendingRules === undefined ? rules : extendingRules.concat(rules),
      styledComponentId,
    )

    class StyledComponent extends ParentComponent {
      static contextTypes = {
        [CHANNEL]: PropTypes.func,
        [CONTEXT_KEY]: PropTypes.instanceOf(StyleSheet),
      }

      static displayName = displayName
      static styledComponentId = styledComponentId
      static attrs = attrs
      static componentStyle = componentStyle
      static warnTooManyClasses = warnTooManyClasses
      static target = target

      static withComponent(tag) {
        const { componentId: previousComponentId, ...optionsToCopy } = options

        const newComponentId =
          previousComponentId &&
          `${previousComponentId}-${isTag(tag) ? tag : getComponentName(tag)}`

        const newOptions = {
          ...optionsToCopy,
          componentId: newComponentId,
          ParentComponent: StyledComponent,
        }

        return createStyledComponent(tag, newOptions, rules)
      }

      static get extend() {
        const {
          rules: rulesFromOptions,
          componentId: parentComponentId,
          ...optionsToCopy
        } = options

        const newRules =
          rulesFromOptions === undefined
            ? rules
            : rulesFromOptions.concat(rules)

        const newOptions = {
          ...optionsToCopy,
          rules: newRules,
          parentComponentId,
          ParentComponent: StyledComponent,
        }

        return constructWithOptions(createStyledComponent, target, newOptions)
      }
    }

    return StyledComponent
  }

  return createStyledComponent
}
