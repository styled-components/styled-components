// @flow

import { createElement } from 'react'

import type { Theme } from './ThemeProvider'
import createWarnTooManyClasses from '../utils/createWarnTooManyClasses'

import validAttr from '../utils/validAttr'
import isTag from '../utils/isTag'
import type { RuleSet, Target } from '../types'

import AbstractStyledComponent from './AbstractStyledComponent'
import { CHANNEL } from './ThemeProvider'

export default (ComponentStyle: Function, constructWithOptions: Function) => {
  /* We depend on components having unique IDs */
  const identifiers = {}
  const generateId = (_displayName: string) => {
    const displayName = _displayName
      .replace(/[[\].#*$><+~=|^:(),"'`]/g, '-') // Replace all possible CSS selectors
      .replace(/--+/g, '-') // Replace multiple -- with single -
    const nr = (identifiers[displayName] || 0) + 1
    identifiers[displayName] = nr
    const hash = ComponentStyle.generateName(displayName + nr)
    return `${displayName}-${hash}`
  }

  const createStyledComponent = (target: Target,
                                 options: Object,
                                 rules: RuleSet) => {
    const {
      displayName = isTag(target) ? `styled.${target}` : `Styled(${target.displayName})`,
      componentId = generateId(options.displayName || 'sc'),
      attrs = {},
      rules: extendingRules = [],
      ParentComponent = AbstractStyledComponent,
    } = options
    const componentStyle = new ComponentStyle([...extendingRules, ...rules], componentId)

    let warnTooManyClasses
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      warnTooManyClasses = createWarnTooManyClasses()
    }

    class StyledComponent extends ParentComponent {
      static styledComponentId: string
      static extend: Function
      static extendWith: Function

      attrs = {}
      state = {
        theme: null,
        generatedClassName: '',
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
        return componentStyle.generateAndInjectStyles(executionContext)
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
        const { className, children, innerRef } = this.props
        const { generatedClassName } = this.state

        const propsForElement = { ...this.attrs }
        /* Don't pass through non HTML tags through to HTML elements */
        Object.keys(this.props)
          .filter(propName => !isTag(target) || validAttr(propName))
          .forEach(propName => {
            propsForElement[propName] = this.props[propName]
          })
        propsForElement.className = [className, componentId, this.attrs.className, generatedClassName].filter(x => x).join(' ')
        if (innerRef) {
          propsForElement.ref = innerRef
          delete propsForElement.innerRef
        }

        if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && generatedClassName) {
          warnTooManyClasses(generatedClassName, StyledComponent.displayName)
        }
        return createElement(target, propsForElement, children)
      }

      static get extend() {
        return StyledComponent.extendWith(target)
      }
    }

    StyledComponent.displayName = displayName
    StyledComponent.styledComponentId = componentId
    StyledComponent.extendWith = tag => {
      const { displayName: _, componentId: __, ...optionsToCopy } = options
      return constructWithOptions(createStyledComponent, tag,
        { ...optionsToCopy, rules, ParentComponent: StyledComponent })
    }

    return StyledComponent
  }

  return createStyledComponent
}
