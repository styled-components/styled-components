// @flow
import { Component, createElement } from 'react'
import { polyfill } from 'react-lifecycles-compat'
import PropTypes from 'prop-types'

import type { Theme } from './ThemeProvider'

import isTag from '../utils/isTag'
import isStyledComponent from '../utils/isStyledComponent'
import getComponentName from '../utils/getComponentName'
import determineTheme from '../utils/determineTheme'
import type { RuleSet, Target } from '../types'

import { CHANNEL, CHANNEL_NEXT, CONTEXT_CHANNEL_SHAPE } from './ThemeProvider'

export default (constructWithOptions: Function, InlineStyle: Function) => {
  class BaseStyledNativeComponent extends Component {
    static target: Target
    static styledComponentId: string
    static attrs: Object
    static inlineStyle: Object

    static getDerivedStateFromProps(
      nextProps: { theme?: Theme, [key: string]: any },
      prevState
    ) {
      const theme = determineTheme(
        nextProps,
        prevState.theme,
        prevState.defaultProps
      )
      const generatedStyles = prevState.generateStyleObject(theme, nextProps)

      return { theme, generatedStyles }
    }

    root: ?Object

    attrs = {}
    state = {
      theme: this.getInitialTheme(),
      defaultProps: this.constructor.defaultProps,
      generateStyleObject: this.generateStyleObject.bind(this),
      generatedStyles: undefined,
    }

    unsubscribeId: number = -1

    unsubscribeFromContext() {
      if (this.unsubscribeId !== -1) {
        this.context[CHANNEL_NEXT].unsubscribe(this.unsubscribeId)
      }
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

    generateStyleObject(theme: any, props: any) {
      const { inlineStyle } = this.constructor
      const executionContext = this.buildExecutionContext(theme, props)

      return inlineStyle.generateStyleObject(executionContext)
    }

    getInitialTheme() {
      // If there is a theme in the context, read it
      const styledContext = this.context[CHANNEL_NEXT]
      if (styledContext !== undefined) {
        return styledContext.getTheme()
      } else {
        // eslint-disable-next-line react/prop-types
        return this.props.theme || {}
      }
    }

    componentDidMount() {
      // If there is a theme in the context, subscribe to the event emitter. This
      // is necessary due to pure components blocking context updates, this circumvents
      // that by updating when an event is emitted
      const styledContext = this.context[CHANNEL_NEXT]
      if (styledContext !== undefined) {
        const { subscribe } = styledContext
        this.unsubscribeId = subscribe(nextTheme => {
          // This will be called once immediately
          const theme = determineTheme(
            this.props,
            nextTheme,
            this.constructor.defaultProps
          )

          // Don't perform any actions if the actual resolved theme didn't change
          if (theme === this.state.theme) {
            return
          }

          const generatedStyles = this.generateStyleObject(theme, this.props)

          this.setState({ theme, generatedStyles })
        })
      }
    }

    componentWillUnmount() {
      this.unsubscribeFromContext()
    }

    setNativeProps(nativeProps: Object) {
      if (this.root !== undefined) {
        // $FlowFixMe
        this.root.setNativeProps(nativeProps)
      } else if (process.env.NODE_ENV !== 'production') {
        const { displayName } = this.constructor

        // eslint-disable-next-line no-console
        console.warn(
          'setNativeProps was called on a Styled Component wrapping a stateless functional component. ' +
            'In this case no ref will be stored, and instead an innerRef prop will be passed on.\n' +
            `Check whether the stateless functional component is passing on innerRef as a ref in ${displayName}.`
        )
      }
    }

    onRef = (node: any) => {
      // eslint-disable-next-line react/prop-types
      const { innerRef } = this.props
      this.root = node

      if (typeof innerRef === 'function') {
        innerRef(node)
      } else if (
        typeof innerRef === 'object' &&
        innerRef &&
        innerRef.hasOwnProperty('current')
      ) {
        innerRef.current = node
      }
    }

    render() {
      // eslint-disable-next-line react/prop-types
      const { children, style } = this.props
      const { generatedStyles } = this.state
      const { target } = this.constructor

      const propsForElement = {
        ...this.attrs,
        ...this.props,
        style: [generatedStyles, style],
      }

      if (
        !isStyledComponent(target) &&
        // NOTE: We can't pass a ref to a stateless functional component
        (typeof target !== 'function' ||
          (target.prototype && 'isReactComponent' in target.prototype))
      ) {
        propsForElement.ref = this.onRef
        delete propsForElement.innerRef
      } else {
        propsForElement.innerRef = this.onRef
      }

      return createElement(target, propsForElement, children)
    }
  }

  polyfill(BaseStyledNativeComponent)

  const createStyledNativeComponent = (
    target: Target,
    options: Object,
    rules: RuleSet
  ) => {
    const {
      displayName = isTag(target)
        ? `styled.${target}`
        : `Styled(${getComponentName(target)})`,
      ParentComponent = BaseStyledNativeComponent,
      rules: extendingRules,
      attrs,
    } = options

    const inlineStyle = new InlineStyle(
      extendingRules === undefined ? rules : extendingRules.concat(rules)
    )

    class StyledNativeComponent extends ParentComponent {
      static displayName = displayName
      static target = target
      static attrs = attrs
      static inlineStyle = inlineStyle

      static contextTypes = {
        [CHANNEL]: PropTypes.func,
        [CHANNEL_NEXT]: CONTEXT_CHANNEL_SHAPE,
      }

      // NOTE: This is so that isStyledComponent passes for the innerRef unwrapping
      static styledComponentId = 'StyledNativeComponent'

      static withComponent(tag) {
        const { displayName: _, componentId: __, ...optionsToCopy } = options
        const newOptions = {
          ...optionsToCopy,
          ParentComponent: StyledNativeComponent,
        }
        return createStyledNativeComponent(tag, newOptions, rules)
      }

      static get extend() {
        const {
          displayName: _,
          componentId: __,
          rules: rulesFromOptions,
          ...optionsToCopy
        } = options

        const newRules =
          rulesFromOptions === undefined
            ? rules
            : rulesFromOptions.concat(rules)

        const newOptions = {
          ...optionsToCopy,
          rules: newRules,
          ParentComponent: StyledNativeComponent,
        }

        return constructWithOptions(
          createStyledNativeComponent,
          target,
          newOptions
        )
      }
    }

    return StyledNativeComponent
  }

  return createStyledNativeComponent
}
